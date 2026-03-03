Pathfinder AI:
A user is facing a life situation but doesn't know where to start. For example, the user types, I'm finishing college and moving to a new city for my first job and uploads their offer letter. The app understands the situation and breaks it into steps like documentation, accommodation, banking, and onboarding, with suggested timelines. As tasks are completed or circumstances change, the system updates the plan and shows what needs attention next, helping the user move forward without feeling overwhelmed.

Pathfinder AI is a life-event oriented planning assistant built using a Retrieval-Augmented Generation (RAG) approach, where AI understanding is grounded in a structured knowledge base to generate explainable, user-controlled workflows for managing tasks, documents, and timelines across long-running life situations.

The system supports:

- multiple life events running in parallel
- situations that span days, months, or even years
- dynamic checklists, reminders, and notes that evolve over time

Core Design Philosophy

1. Life-Event First, Not Task First
   Engineering decision: Model the system around life events, not flat to-do lists.
   Why:
   Tasks only make sense when they are grounded in context.
   A "Prepare documents" task is meaningless unless the system understands why the documents are needed.
   Result:
   All workflows, deadlines, and reminders are scoped under a life event that can last days, months, or years.

2. Progressive Clarification over Perfect Input
   Engineering decision: Accept vague input and clarify gradually instead of forcing structured forms upfront.
   Why:
   Users often cannot articulate all details at once, especially during stressful situations.
   Requiring perfect input early leads to abandonment or incorrect assumptions.
   Example:
   User: "I'm moving soon and things feel overwhelming."
   System: "Is this move related to a job, studies, or something else?"
   Result:
   Reduced cognitive load
   Fewer incorrect assumptions
   More human-like, conversational behavior
   This behavior is enforced at the prompt and system-logic level, not left to chance.

3. AI Assists, Never Decides
   Engineering decision: AI suggestions are always editable, optional, and explicitly labeled as recommendations.
   Why:
   Fully autonomous task generation risks incorrect advice and loss of user trust.
   For life-critical situations, control must remain with the user.
   Result:
   AI proposes workflows
   User approves, modifies, or rejects each part
   No automatic irreversible actions
   Design Choice: Progressive Clarification over Perfect Input

Pathfinder AI assists users by:

- understanding the context of a life event
- identifying commonly required documents and steps
- suggesting what to do next based on time and progress
- providing gentle, time-aware guidance without removing user control

This project explores how AI-assisted systems, combined with structured rules and external information, can support planning and decision-making while keeping the user fully in charge.

Tech Stack

Backend:

- FastAPI — Lightweight Python framework for building clean, fast REST APIs with minimal boilerplate.
- Uvicorn — ASGI server used to run the FastAPI application efficiently.
- SQLite — Simple relational database used for rapid development and easy inspection during early stages.
- SQLAlchemy — ORM for modeling life events, tasks, and workflows in a structured, relational way.
- Pydantic — Ensures data validation and consistency between API requests and responses.

AI & NLP:

- Gemini API (gemini-2.0-flash) — Used for life event classification; outputs structured JSON with strict schema enforcement.
- Gemini API (gemini-embedding-001) — Generates 3072-dimensional semantic embeddings for the RAG knowledge base retrieval pipeline.
- Gemini API (gemini-2.5-flash-lite) — Powers grounded workflow generation and RAG explanations using a separate API quota.
- NumPy — Performs cosine similarity calculations over embedding vectors for in-database retrieval without an external vector store.

Retrieval-Augmented Generation (RAG):
(RAG ensures the AI gives correct documents for the right country by looking them up from trusted data. Web scraping is avoided because it is unreliable, legally risky, and difficult to maintain)

- Curated Knowledge Base (Database-backed) — 29 hand-curated requirement entries stored in SQLite, each embedded as a 3072-dim vector for semantic search.
- Embedding-based Retrieval — Query text is embedded with gemini-embedding-001; cosine similarity is computed in-process using NumPy to find the top-k most relevant knowledge chunks.
- Grounded Workflow Generation — Gemini generates task proposals using ONLY retrieved knowledge chunks; hallucination is prevented by strict system prompts.
- User-Controlled Approval — Generated workflows are proposals only. The user explicitly approves before any tasks are persisted to the database (POST /life-events/approve-workflow).

Time & Background Processing:

- Python datetime — Handles deadlines, timelines, and long-running life events.
- APScheduler — Runs scheduled background jobs such as daily reminder checks.
- SMTP (Email) — Sends gentle, time-aware reminders without push notification complexity.

Frontend:

- HTML & CSS — Simple, framework-free interface focused on clarity and long-term usability.
- JavaScript — Handles dynamic task rendering, inline editing, grouped task views, and API communication.
- Chart.js — Visualizes progress and completion status in a clear, intuitive way.

Developer Tooling:

- Git & GitHub — Version control with meaningful commit history for academic and recruiter review.
- GitLens — Improves visibility into code history and changes inside VS Code.
- CodeRabbit — AI code review integrated into GitHub, used to catch documentation mismatches and security issues.
- Thunder Client / REST Client — API testing during development.
