# Pathfinder AI - Project Checklist

- [ ] **Layer 0: Orientation & Mental Model**
  - [x] Define project scope and architecture
  - [ ] Create project roadmap

- [ ] **Layer 1: Core Backend System**
  - [x] **Step 1.1: Project Skeleton**
    - [x] Create [PLAN-project-setup.md](docs/PLAN-project-setup.md)
    - [x] Explain FastAPI project structure
    - [x] Create backend directory structure
    - [x] Verify: Run `uvicorn` to test entry point
  - [x] **Step 1.2: Database Design**
    - [x] Design User, LifeEvent, Task models
  - [x] **Step 1.3: CRUD APIs**
    - [x] Implement Life Event and Task endpoints
  - [x] **Step 1.4: Simple Frontend**
    - [x] Minimal HTML/JS interface

- [x] **Layer 2: Time & Reminders**
  - [x] Priority logic and due dates
  - [x] Email reminder system (APScheduler)

- [ ] **Layer 3: NLP & RAG**
  - [ ] Life-event classification (Gemini)
  - [ ] Requirement retrieval (RAG)
  - [ ] Workflow generation

- [ ] **Layer 4: Adaptive Logic**
  - [ ] Context-aware recommendations
  - [ ] Dependency logic

- [ ] **Layer 5: Visuals**
  - [ ] Progress bars and timeline view
