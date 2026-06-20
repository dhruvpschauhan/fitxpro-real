from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.scheduler import start_scheduler, stop_scheduler
from app.database import engine
from app.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="FitX Pro API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://fitxpro-real.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth ───────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc), "traceback": traceback.format_exc()}
    )

from app.routers import auth
app.include_router(auth.router, prefix="/api/v1")

# ── Admin ──────────────────────────────────────────────
from app.routers.admin import users as admin_users
from app.routers.admin import finances as admin_finances
from app.routers.admin import memberships as admin_memberships
from app.routers.admin import equipment as admin_equipment
from app.routers.admin import plans as admin_plans
from app.routers.admin import leads as admin_leads
from app.routers.admin import workout_programs as admin_workout_programs
from app.routers.admin import exercise_library as admin_exercise_library
from app.routers.admin import alerts as admin_alerts

app.include_router(admin_users.router,              prefix="/api/v1/admin")
app.include_router(admin_finances.router,           prefix="/api/v1/admin")
app.include_router(admin_memberships.router,        prefix="/api/v1/admin")
app.include_router(admin_equipment.router,          prefix="/api/v1/admin")
app.include_router(admin_plans.router,              prefix="/api/v1/admin")
app.include_router(admin_leads.router,              prefix="/api/v1/admin")
app.include_router(admin_workout_programs.router,   prefix="/api/v1/admin")
app.include_router(admin_exercise_library.router,   prefix="/api/v1/admin")
app.include_router(admin_alerts.router,             prefix="/api/v1")

# ── Shared (admin + member) ────────────────────────────
from app.routers import announcements
from app.routers import workouts
app.include_router(announcements.router, prefix="/api/v1")
app.include_router(workouts.router, prefix="/api/v1")

# ── Member Portal ──────────────────────────────────────
from app.routers.user import portal as user_portal
from app.routers.user import workout as user_workout
app.include_router(user_portal.router,  prefix="/api/v1")
app.include_router(user_workout.router, prefix="/api/v1/user")


@app.get("/")
def read_root():
    return {"status": "ok", "app": "FitX Pro API", "version": "1.0.0"}
