<p align="center">
  <img src="docs/branding/pathfinder_logo.svg" alt="PathFinder AI Logo" width="90" />
</p>

<h1 align="center">PathFinder AI</h1>
<p align="center">A Context-Aware Life Event Planning System Using NLP and RAG</p>

---

Most life situations don't come with instructions. You type _"I'm finishing college and moving to a new city for my first job"_ — PathFinder AI reads the situation, asks a few smart questions if needed, and builds a personalised step-by-step plan covering documentation, accommodation, banking, and onboarding. Upload your offer letter and it reads the joining date, company, and location automatically — pre-filling your requirements so you never enter the same detail twice. Each task comes with the exact official link you need and a guided walkthrough that knows which documents you've already uploaded. As your situation changes, the plan adapts with it.

<br>
<h3 align="center">▶️ Click to Watch the Demo Video:</h3>
<p align="center">
  <a href="https://www.youtube.com/watch?v=B0kKT_xgbpw">
    <img src="https://img.youtube.com/vi/B0kKT_xgbpw/maxresdefault.jpg" alt="Pathfinder AI Demo Video" width="800" />
  </a>
</p>

<p align="center">
  <strong><a href="https://sefin23.github.io/PathFinder-AI-Context-Aware-Planner-NLP-RAG/ux-case-study/">✨ View the UX Case Study</a></strong>
</p>

## Key Features

- 🧠 **Context-Aware Planning** — understands vague natural language input, not rigid forms. Covers 10 life domains: Housing, Work, Education, Health, Family, Finance, Legal, Parenting, Loss, and Personal Growth.
- ❓ **Smart Clarification** — asks follow-up questions so that it makes sure the system has the required information and it does not hallucinate while giving the answer.
- ✅ **User-Controlled Approval** — AI proposes a full workflow before anything is saved. The user reviews, modifies, or rejects it. No irreversible actions without explicit approval.
- 🗺️ **Guide Me** — walks the user through any task step-by-step, automatically finding the right official links, checking their uploaded documents, pre-filling personal details, and displaying **High-Fidelity Interactive Explainers** (lightweight spring-animated cursor overlays on real screenshots to guide users through the initial form or login steps of 8 key portals like MCA, GST, and Aadhaar).
- 💬 **Ask Your Plan** — a context-aware floating chatbot that understands the user's specific tasks, uploaded documents, and local city/state rules.
- 📄 **Document Vault** — securely stores files and automatically reads information from them, pre-filling event requirements so the user never re-enters the same details twice.
- 📅 **Daily Planner** — lets users input personal schedules so the system detects clashes and reschedules tasks accordingly.
- 📊 **Analytics** — tracks task completion and progress across all active life events in one place.

## Design Philosophy

**Life-Event First, Not Task First** — tasks only make sense in context. A "Prepare documents" task is meaningless unless the system understands the underlying event. All workflows, deadlines, and reminders are scoped under a life event that can span days, months, or years.

**Zero-Context-Switching Execution** — Most planning systems fail because they only tell you _what_ to do, but not _how_. PathFinder AI brings the execution to the user. By pre-filling personal details from the Vault and embedding official links directly into the guided walkthroughs, the user never has to leave the interface to find the right form or verify their own details. It reduces "decision fatigue", "cognitive load" and "tab-hunting" that makes life transitions stressful.

**Progressive Clarification over Perfect Input** — users often cannot articulate all details at once, especially during stressful situations. The system accepts vague input and clarifies gradually instead of forcing structured forms upfront.

**AI Assists, Never Decides** — AI suggestions are always editable, optional, and labeled as recommendations. The user remains fully in control.

## 🛡️ Why RAG and not web scraping?

**Scrapers break constantly.** Government portals change their HTML structure without warning, vary across cities and states, and actively block bots. A scraper giving someone wrong instructions about a visa filing or a legal document is worse than no instructions at all. Building and maintaining scrapers for dozens of portals would be a full-time job — and still unreliable.

**Hallucination risk is higher without grounding.** Without a verified knowledge base, the model fills gaps with whatever it finds — outdated forum posts, incorrect procedures, stale links. RAG anchors every response to hand-curated, verified information.

**Legal clarity.** Scraping government infrastructure sits in a legal grey area in many jurisdictions. RAG gives us the same informational value without bot behaviour on public infrastructure.

## Documentation

- [Brand Identity & Design System](docs/branding/BRAND_GUIDE.md) — the visual language, color palette, and 3D asset library
- [Interactive Portal Explainers](docs/explainers/) — real-world screenshots of key government/corporate portals mapped with absolute cursor coordinates for live demonstrations
- [Life Events Library & Use Cases](LIFE_EVENTS_LIBRARY.md) — the 10 life event domains covered, real-world use cases, and target audience breakdown
- [Backend README](backend/README.md) — tech stack with reasoning, AI pipeline overview, and setup instructions
- [Frontend README](frontend/README.md) — frontend tech stack with reasoning and folder structure
