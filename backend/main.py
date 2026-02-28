from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.database import init_db
from backend.routes import life_event_routes, task_routes, user_routes
from backend.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB + start scheduler. Shutdown: stop scheduler cleanly."""
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Pathfinder AI - Backend", lifespan=lifespan)

# Routers
app.include_router(user_routes.router, prefix="/users", tags=["Users"])
app.include_router(life_event_routes.router, prefix="/life-events", tags=["Life Events"])
app.include_router(task_routes.router, prefix="/tasks", tags=["Tasks"])


@app.get("/")
def root():
    return {"message": "Welcome to the Pathfinder AI Backend"}
