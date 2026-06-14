from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models import User
from app.models.extra_models import WorkoutProgram, WorkoutDay, Exercise, UserProgramSelection
from app.routers.auth import get_current_user

router = APIRouter(prefix="/workout", tags=["user-workout"])


# ── Schemas ──────────────────────────────────────────────────────────────

class ExerciseOut(BaseModel):
    id: uuid.UUID
    name: str
    sets: Optional[str]
    reps: Optional[str]
    rest_seconds: Optional[int]
    notes: Optional[str]
    sort_order: int
    class Config: from_attributes = True

    @field_validator('sets', 'reps', mode='before')
    @classmethod
    def coerce_to_str(cls, v):
        if v is None:
            return v
        return str(v)

class DayOut(BaseModel):
    id: uuid.UUID
    day_label: str
    focus: Optional[str]
    sort_order: int
    week_day: Optional[str]
    exercises: List[ExerciseOut]
    class Config: from_attributes = True

class ProgramSummary(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    difficulty: str
    goal_tag: str
    is_published: bool
    created_at: datetime
    day_count: int = 0
    exercise_count: int = 0
    class Config: from_attributes = True

class ProgramDetail(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    difficulty: str
    goal_tag: str
    is_published: bool
    created_at: datetime
    days: List[DayOut]
    class Config: from_attributes = True

class SelectProgramIn(BaseModel):
    program_id: uuid.UUID

class TodayWorkout(BaseModel):
    status: str  # "ok" or "no_program"
    program_id: Optional[uuid.UUID] = None
    program_name: Optional[str] = None
    day_label: Optional[str] = None
    focus: Optional[str] = None
    day_number: Optional[int] = None   # 1-indexed
    total_days: Optional[int] = None
    exercises: Optional[List[ExerciseOut]] = None


# ── Helpers ──────────────────────────────────────────────────────────────

async def _load_program(program_id: uuid.UUID, db: AsyncSession) -> WorkoutProgram:
    result = await db.execute(
        select(WorkoutProgram)
        .options(selectinload(WorkoutProgram.days).selectinload(WorkoutDay.exercises))
        .where(WorkoutProgram.id == program_id, WorkoutProgram.is_published == True)
    )
    prog = result.scalars().first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    return prog


async def _get_selection(user_id: uuid.UUID, db: AsyncSession) -> Optional[UserProgramSelection]:
    result = await db.execute(
        select(UserProgramSelection)
        .options(selectinload(UserProgramSelection.program)
                 .selectinload(WorkoutProgram.days)
                 .selectinload(WorkoutDay.exercises))
        .where(UserProgramSelection.user_id == user_id)
    )
    return result.scalars().first()


# ── Catalog ──────────────────────────────────────────────────────────────

@router.get("/programs", response_model=List[ProgramSummary])
async def list_published_programs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    result = await db.execute(
        select(WorkoutProgram)
        .options(selectinload(WorkoutProgram.days).selectinload(WorkoutDay.exercises))
        .where(WorkoutProgram.is_published == True)
        .order_by(WorkoutProgram.created_at.desc())
    )
    programs = result.scalars().all()
    out = []
    for p in programs:
        ex_count = sum(len(d.exercises) for d in p.days)
        out.append(ProgramSummary(
            id=p.id, name=p.name, description=p.description,
            difficulty=p.difficulty, goal_tag=p.goal_tag,
            is_published=p.is_published, created_at=p.created_at,
            day_count=len(p.days), exercise_count=ex_count
        ))
    return out


@router.get("/programs/{program_id}", response_model=ProgramDetail)
async def get_program_detail(
    program_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    return await _load_program(program_id, db)


# ── My Program ────────────────────────────────────────────────────────────

@router.get("/my-program", response_model=Optional[ProgramDetail])
async def get_my_program(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sel = await _get_selection(current_user.id, db)
    if not sel:
        return None
    return await _load_program(sel.program_id, db)


@router.post("/my-program")
async def select_program(
    body: SelectProgramIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify program exists and is published
    result = await db.execute(
        select(WorkoutProgram).where(
            WorkoutProgram.id == body.program_id,
            WorkoutProgram.is_published == True
        )
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Program not found or not published")

    # Upsert: one row per user
    existing = await db.execute(
        select(UserProgramSelection).where(UserProgramSelection.user_id == current_user.id)
    )
    sel = existing.scalars().first()
    now = datetime.now(timezone.utc)
    if sel:
        sel.program_id = body.program_id
        sel.selected_at = now
    else:
        sel = UserProgramSelection(
            user_id=current_user.id,
            program_id=body.program_id,
            selected_at=now
        )
        db.add(sel)
    await db.commit()
    return {"status": "selected"}


# ── Today's Workout ───────────────────────────────────────────────────────

@router.get("/today", response_model=TodayWorkout)
async def get_today_workout(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sel = await _get_selection(current_user.id, db)
    if not sel:
        return TodayWorkout(status="no_program")

    prog = await _load_program(sel.program_id, db)
    days = sorted(prog.days, key=lambda d: d.sort_order)
    if not days:
        return TodayWorkout(status="no_program")

    today_name = datetime.now().strftime("%A")  # local day name
    total = len(days)

    # 1. Prefer week_day match
    day = next((d for d in days if d.week_day and d.week_day.lower() == today_name.lower()), None)

    # 2. Fall back to cyclic
    if day is None:
        selected_at = sel.selected_at
        if selected_at.tzinfo is None:
            selected_at = selected_at.replace(tzinfo=timezone.utc)
        days_elapsed = (datetime.now(timezone.utc).date() - selected_at.date()).days
        day = days[days_elapsed % total]

    idx = days.index(day)

    return TodayWorkout(
        status="ok",
        program_id=prog.id,
        program_name=prog.name,
        day_label=day.day_label,
        focus=day.focus,
        day_number=idx + 1,
        total_days=total,
        exercises=[
            ExerciseOut(
                id=e.id, name=e.name, sets=e.sets, reps=e.reps,
                rest_seconds=e.rest_seconds, notes=e.notes, sort_order=e.sort_order
            )
            for e in sorted(day.exercises, key=lambda x: x.sort_order)
        ]
    )
