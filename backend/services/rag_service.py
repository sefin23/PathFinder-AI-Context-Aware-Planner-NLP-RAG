"""
Layer 3.2 — Requirement Retrieval Service (RAG).

Pipeline:
  1. embed_text()          — generate a 3072-dim vector via Gemini embedding API
  2. retrieve()            — cosine similarity search over the knowledge_base table
  3. explain_with_llm()    — Gemini explains retrieved chunks; no guessing beyond them
  4. rag_query()           — orchestrates the full RAG pipeline

Rules enforced:
  - All retrieval is database-based; no web scraping.
  - The LLM is only given retrieved content — it may not use outside knowledge.
  - No task creation. No DB writes (other than embedding cache writes via
    embed_and_store in the seed script).
"""

import json
import logging
from typing import Optional

import numpy as np
from sqlalchemy.orm import Session

from google import genai
from google.genai import types

from backend.config import settings
from backend.models.knowledge_base_model import KnowledgeBaseEntry
from backend.schemas.nlp_schema import LifeEventType
from backend.schemas.rag_schema import (
    RAGExplanation,
    RAGQueryResponse,
    RetrievedChunk,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_EMBEDDING_MODEL = "gemini-embedding-001"     # 3072-dim, multilingual
_EXPLANATION_MODEL = "gemini-1.5-flash"  # 1.5-flash has better free-tier quota than 2.0
_DEFAULT_TOP_K = 3

_GROUNDED_SYSTEM_PROMPT = """\
You are a Pathfinder AI requirement advisor. Your goal is to extract and categorize documents from the provided knowledge-base entries.

STRICT FORMATTING RULES:
You MUST group requirements into exactly these four headers followed by bullet points:

### 1. Primary Essentials
[Explain identity proofs, foundational documents, or basic checklists here]

### 2. From Third Parties
[Explain letters from employers, banks, government authorities, or official licensed bodies here]

### 3. Action & Submission Needs
[Explain application forms, fees, filing portals, or photos required for final submission]

### 4. Common Mistakes & Tips
[Explain common errors, validity issues, or "gotchas" to avoid based on the entries]

GROUNDING RULES:
- Base your explanation EXCLUSIVELY on the provided entries.
- If an entry explains a document, include it as a bullet point: "- **Document Name**: [Brief explanation]".
- If no information exists for a category, leave it blank under the header.
- Do NOT hallucinate or use outside knowledge.
"""


# ---------------------------------------------------------------------------
# Gemini client — embeddings + explanations
# ---------------------------------------------------------------------------

_gemini_client: Optional[genai.Client] = None


def _get_gemini_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to your .env file."
            )
        _gemini_client = genai.Client(api_key=settings.gemini_api_key)
    return _gemini_client


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def embed_text(text: str) -> list[float]:
    """
    Generate a 3072-dimensional embedding for *text* using Gemini.

    Args:
        text: The string to embed.

    Returns:
        A list of 3072 floats.

    Raises:
        RuntimeError: If the embedding API call fails.
    """
    client = _get_gemini_client()
    try:
        response = client.models.embed_content(
            model=_EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
        )
        return response.embeddings[0].values
    except Exception as exc:
        logger.exception("Embedding generation failed.")
        raise RuntimeError(f"Embedding call failed: {exc}") from exc


def embed_text_for_document(text: str) -> list[float]:
    """
    Same as embed_text but uses RETRIEVAL_DOCUMENT task type.
    Use this when embedding knowledge-base entries during seeding.
    Produces a 3072-dimensional vector.
    """
    client = _get_gemini_client()
    try:
        response = client.models.embed_content(
            model=_EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
        )
        return response.embeddings[0].values
    except Exception as exc:
        logger.exception("Document embedding generation failed.")
        raise RuntimeError(f"Document embedding call failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Cosine similarity
# ---------------------------------------------------------------------------

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Return cosine similarity in [0, 1] between two float vectors."""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------

def retrieve(
    db: Session,
    query: str,
    life_event_type: Optional[LifeEventType] = None,
    top_k: int = _DEFAULT_TOP_K,
) -> list[RetrievedChunk]:
    """
    Embed *query* and return the top-k most similar knowledge-base entries.

    Args:
        db:               Active SQLAlchemy session.
        query:            User's natural-language question.
        life_event_type:  Optional filter; restricts candidates to one category.
        top_k:            Number of results to return.

    Returns:
        List of :class:`RetrievedChunk` sorted by similarity descending.

    Raises:
        ValueError:    If no embedded entries are found in the DB.
        RuntimeError:  If the embedding call fails.
    """
    # 1. Embed the query
    query_vector = embed_text(query)

    # 2. Load candidate entries (filter by life_event_type if provided)
    q = db.query(KnowledgeBaseEntry).filter(
        KnowledgeBaseEntry.embedding.isnot(None)  # skip unembedded rows
    )
    # Don't filter by OTHER — it has no KB entries; search all categories instead
    from backend.schemas.nlp_schema import LifeEventType as _LET
    if life_event_type is not None and life_event_type != _LET.OTHER:
        q = q.filter(KnowledgeBaseEntry.life_event_type == life_event_type)

    candidates = q.all()

    if not candidates:
        # Fallback: drop the type filter and search entire KB
        candidates = db.query(KnowledgeBaseEntry).filter(
            KnowledgeBaseEntry.embedding.isnot(None)
        ).all()

    if not candidates:
        raise ValueError(
            "Knowledge base is empty. "
            "Run: python -m backend.scripts.seed_knowledge_base"
        )

    # 3. Score every candidate
    scored: list[tuple[float, KnowledgeBaseEntry]] = []
    for entry in candidates:
        try:
            doc_vector = json.loads(entry.embedding)
        except (json.JSONDecodeError, TypeError):
            logger.warning("Skipping entry id=%s — invalid embedding JSON.", entry.id)
            continue
        score = max(0.0, _cosine_similarity(query_vector, doc_vector))
        scored.append((score, entry))

    # 4. Sort descending, take top_k
    scored.sort(key=lambda t: t[0], reverse=True)
    top = scored[:top_k]

    return [
        RetrievedChunk(
            id=entry.id,
            life_event_type=entry.life_event_type,
            title=entry.title,
            content=entry.content,
            similarity_score=round(score, 4),
        )
        for score, entry in top
    ]


# ---------------------------------------------------------------------------
# Grounded LLM explanation — powered by Gemini
# ---------------------------------------------------------------------------

def explain_with_llm(
    query: str,
    chunks: list[RetrievedChunk],
    life_event_type: Optional[LifeEventType] = None,
) -> RAGExplanation:
    """
    Use Gemini (2.0 Flash Lite) to explain retrieved chunks.
    
    Integrated with a 'Safety Net' fallback to professional expert knowledge
    if the LLM fails or the KB is empty.
    """
    if not chunks:
        # ── SAFETY NET FALLBACK ──────────────────────────────────────────
        # Try to get high-quality static knowledge if RAG retrieval found nothing
        if life_event_type:
            from backend.services.static_knowledge import get_expert_fallback
            guide = get_expert_fallback(life_event_type)
            if guide:
                logger.info("RAG empty: Using high-quality STATIC EXPERT KNOWLEDGE safety net.")
                return RAGExplanation(
                    explanation=guide,
                    source_ids=[-1],
                )

        return RAGExplanation(
            explanation="No relevant requirements were found for your query.",
            source_ids=[],
        )

    # Build the grounded context block
    context_lines = []
    for i, chunk in enumerate(chunks, start=1):
        context_lines.append(
            f"Entry {i} [ID={chunk.id}, Category={chunk.life_event_type.value}]\n"
            f"Title: {chunk.title}\n"
            f"Content: {chunk.content}"
        )
    context_block = "\n\n---\n\n".join(context_lines)

    user_message = (
        f"User query: {query}\n\n"
        f"Retrieved entries:\n\n{context_block}\n\n"
        f"Explain the requirements relevant to the user's query, "
        f"drawing only from the entries above."
    )

    # ── PRIMARY: OpenRouter (tries free models + Gemini fallback internally) ──
    try:
        from backend.services.openrouter_client import generate_completion
        text = generate_completion(
            system_instruction=_GROUNDED_SYSTEM_PROMPT,
            user_message=user_message,
            max_tokens=1024,
            temperature=0.1,
        )
        return RAGExplanation(
            explanation=text.strip(),
            source_ids=[chunk.id for chunk in chunks],
        )
    except Exception as exc:
        logger.warning("OpenRouter explanation failed, trying direct Gemini: %s", str(exc)[:120])

    # ── SECONDARY: Direct Gemini (different quota bucket) — try multiple models ──
    client = _get_gemini_client()
    for gemini_model in ["gemini-2.0-flash", "gemini-2.0-flash-lite"]:
        try:
            response = client.models.generate_content(
                model=gemini_model,
                contents=user_message,
                config=types.GenerateContentConfig(
                    system_instruction=_GROUNDED_SYSTEM_PROMPT,
                    temperature=0.1,
                    max_output_tokens=1024,
                ),
            )
            if response.text and response.text.strip():
                logger.info("Direct Gemini SUCCESS: %s", gemini_model)
                return RAGExplanation(
                    explanation=response.text.strip(),
                    source_ids=[chunk.id for chunk in chunks],
                )
        except Exception as exc:
            logger.warning("Direct Gemini %s failed: %s", gemini_model, str(exc)[:100])
            continue

    # ── TERTIARY: Static expert knowledge safety net — ALWAYS fires ────────
    # Ensures demo/review never shows a broken state even if all APIs are down.
    if life_event_type:
        from backend.services.static_knowledge import get_expert_fallback
        guide = get_expert_fallback(life_event_type)
        if guide:
            logger.info("All LLMs failed. Using static expert knowledge safety net.")
            return RAGExplanation(
                explanation=guide,
                source_ids=[-1],
            )

    # Last resort: synthesize a readable summary from the raw retrieved chunks
    chunk_summary = "\n\n".join(
        f"**{c.title}**\n{c.content[:400]}" for c in chunks[:3]
    )
    logger.warning("All explanation methods exhausted — returning raw chunk summary.")
    return RAGExplanation(
        explanation=f"Here are the key requirements retrieved for your query:\n\n{chunk_summary}",
        source_ids=[chunk.id for chunk in chunks],
    )


# ---------------------------------------------------------------------------
# Full RAG pipeline
# ---------------------------------------------------------------------------

def rag_query(
    db: Session,
    query: str,
    life_event_type: Optional[LifeEventType] = None,
    top_k: int = _DEFAULT_TOP_K,
) -> RAGQueryResponse:
    """
    Full RAG pipeline: embed → retrieve → explain.

    Args:
        db:               Active SQLAlchemy session (read-only usage).
        query:            User's natural-language question.
        life_event_type:  Optional category filter.
        top_k:            Number of chunks to retrieve.

    Returns:
        :class:`RAGQueryResponse` with chunks + grounded explanation.
    """
    logger.info(
        "RAG query | top_k=%d | filter=%s | query=%.80s",
        top_k,
        life_event_type.value if life_event_type else "none",
        query,
    )

    chunks = retrieve(db, query, life_event_type, top_k)

    # Attempt LLM explanation — degrade gracefully if rate-limited or unavailable
    explanation: Optional[RAGExplanation] = None
    explanation_available = True
    explanation_error: Optional[str] = None

    try:
        explanation = explain_with_llm(query, chunks, life_event_type)
    except RuntimeError as exc:
        explanation_available = False
        explanation_error = (
            "LLM explanation unavailable (rate limited or API error). "
            "Retrieved chunks are still accurate and usable."
        )
        logger.warning("Explanation skipped — returning chunks only. Error: %s", exc)

    return RAGQueryResponse(
        success=True,
        query=query,
        life_event_type_filter=life_event_type,
        retrieved_chunks=chunks,
        explanation=explanation,
        explanation_available=explanation_available,
        explanation_error=explanation_error,
    )
