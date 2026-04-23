from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

from backend.database import init_db
from backend.routes import (
    life_event_routes, nlp_routes, rag_routes, task_routes,
    user_routes, workflow_routes, recommendation_routes,
    vault_routes, simulation_routes, personal_event_routes,
    auth_routes, admin_routes,
)
from backend.routes import plan_chat_routes
from backend.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB + start scheduler. Shutdown: stop scheduler cleanly."""
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Pathfinder AI - Backend", lifespan=lifespan)

# Add CORS middleware
# Note: allow_origins=["*"] is restricted when allow_credentials=True
# In production, Replace with explicit frontend URLs (e.g. ["http://localhost:5173"])
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="http://localhost:.*",  # Allow any local port for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads dir exists
UPLOAD_DIR = os.path.join("backend", "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Routers
app.include_router(user_routes.router, prefix="/api/users", tags=["Users"])
app.include_router(life_event_routes.router, prefix="/api/life-events", tags=["Life Events"])
app.include_router(task_routes.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(nlp_routes.router, prefix="/api/life-events", tags=["NLP"])
app.include_router(rag_routes.router, prefix="/api/rag", tags=["RAG"])
app.include_router(workflow_routes.router, prefix="/api/life-events", tags=["Workflow"])
app.include_router(recommendation_routes.router, prefix="/api/life-events", tags=["Recommendations"])
app.include_router(vault_routes.router, prefix="/api/vault", tags=["Vault"])
app.include_router(simulation_routes.router, prefix="/api/simulate", tags=["Simulation"])
app.include_router(personal_event_routes.router, prefix="/api/personal-events", tags=["Personal Events"])
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(plan_chat_routes.router, prefix="/api/life-events", tags=["Plan Chat"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])


@app.get("/")
def root():
    return {"message": "Welcome to the Pathfinder AI Backend"}
