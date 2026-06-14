from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from pydantic import BaseModel
from datetime import datetime, date
import uuid

from app.database import get_db
from app.models import User
from app.models.extra_models import (
    WorkoutPlan, WorkoutDay, Exercise, UserPlanAssignment, StrengthLog
)
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/workouts", tags=["workouts"])


# ── Schemas ────────────────────────────────────────────────────────────

class ExerciseIn(BaseModel):
    name: str
    sets: int = 3
    reps: str = "10-12"
    rest_seconds: int = 60
    notes: str | None = None

class ExerciseOut(BaseModel):
    id: uuid.UUID
    name: str
    sets: int
    reps: str
    rest_seconds: int
    notes: str | None
    sort_order: int
    class Config:
        from_attributes = True

class DayIn(BaseModel):
    day_label: str
    focus: str | None = None
    exercises: List[ExerciseIn] = []

class DayOut(BaseModel):
    id: uuid.UUID
    day_label: str
    focus: str | None
    sort_order: int
    exercises: List[ExerciseOut]
    class Config:
        from_attributes = True

class PlanCreate(BaseModel):
    name: str
    description: str | None = None
    days: List[DayIn] = []

class PlanOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    days: List[DayOut]
    class Config:
        from_attributes = True

class PlanSummary(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    class Config:
        from_attributes = True

class AssignPlanIn(BaseModel):
    user_id: uuid.UUID
    plan_id: uuid.UUID


# ── Helpers ────────────────────────────────────────────────────────────

async def _get_plan(plan_id: uuid.UUID, db: AsyncSession) -> WorkoutPlan:
    result = await db.execute(
        select(WorkoutPlan)
        .options(selectinload(WorkoutPlan.days).selectinload(WorkoutDay.exercises))
        .where(WorkoutPlan.id == plan_id)
    )
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


# ── Plans (Admin) ──────────────────────────────────────────────────────

@router.get("/plans", response_model=List[PlanSummary])
async def list_plans(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(WorkoutPlan).order_by(WorkoutPlan.created_at.desc()))
    return result.scalars().all()


@router.post("/plans", response_model=PlanOut)
async def create_plan(
    body: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    plan = WorkoutPlan(name=body.name, description=body.description, created_by=current_user.id)
    db.add(plan)
    await db.flush()  # get plan.id before adding days

    for i, day_in in enumerate(body.days):
        day = WorkoutDay(plan_id=plan.id, day_label=day_in.day_label, focus=day_in.focus, sort_order=i)
        db.add(day)
        await db.flush()
        for j, ex_in in enumerate(day_in.exercises):
            db.add(Exercise(
                workout_day_id=day.id, name=ex_in.name, sets=ex_in.sets,
                reps=ex_in.reps, rest_seconds=ex_in.rest_seconds,
                notes=ex_in.notes, sort_order=j
            ))

    await db.commit()
    return await _get_plan(plan.id, db)


@router.get("/plans/{plan_id}", response_model=PlanOut)
async def get_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    return await _get_plan(plan_id, db)


@router.put("/plans/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: uuid.UUID,
    body: PlanCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    plan = await _get_plan(plan_id, db)
    plan.name = body.name
    plan.description = body.description

    # Delete existing days (cascade deletes exercises)
    for day in plan.days:
        await db.delete(day)
    await db.flush()

    # Recreate days + exercises
    for i, day_in in enumerate(body.days):
        day = WorkoutDay(plan_id=plan.id, day_label=day_in.day_label, focus=day_in.focus, sort_order=i)
        db.add(day)
        await db.flush()
        for j, ex_in in enumerate(day_in.exercises):
            db.add(Exercise(
                workout_day_id=day.id, name=ex_in.name, sets=ex_in.sets,
                reps=ex_in.reps, rest_seconds=ex_in.rest_seconds,
                notes=ex_in.notes, sort_order=j
            ))

    await db.commit()
    return await _get_plan(plan.id, db)


@router.delete("/plans/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    plan = await _get_plan(plan_id, db)
    await db.delete(plan)
    await db.commit()


# ── Assign plan to member ──────────────────────────────────────────────

@router.post("/assign")
async def assign_workout_plan(
    body: AssignPlanIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    # Deactivate existing active assignments for this user
    existing = await db.execute(
        select(UserPlanAssignment).where(
            UserPlanAssignment.user_id == body.user_id,
            UserPlanAssignment.is_active == True
        )
    )
    for a in existing.scalars().all():
        a.is_active = False

    assignment = UserPlanAssignment(
        user_id=body.user_id,
        plan_id=body.plan_id,
        is_active=True,
    )
    db.add(assignment)
    await db.commit()
    return {"status": "assigned"}


# ── Member: get my workout plan ────────────────────────────────────────

@router.get("/my-plan", response_model=PlanOut | None)
async def get_my_plan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find active assignment
    result = await db.execute(
        select(UserPlanAssignment).where(
            UserPlanAssignment.user_id == current_user.id,
            UserPlanAssignment.is_active == True
        )
    )
    assignment = result.scalars().first()
    if not assignment:
        return None
    return await _get_plan(assignment.plan_id, db)


# ── Strength Log ───────────────────────────────────────────────────────

class SetData(BaseModel):
    set_number: int
    weight_kg: float
    reps: int

class StrengthLogIn(BaseModel):
    exercise_name: str
    log_date: date
    sets_data: List[SetData]
    notes: str | None = None

class StrengthLogOut(BaseModel):
    id: uuid.UUID
    exercise_name: str
    log_date: date
    sets_data: list
    notes: str | None
    created_at: datetime
    class Config:
        from_attributes = True


@router.post("/strength-log", response_model=StrengthLogOut)
async def log_strength(
    body: StrengthLogIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = StrengthLog(
        user_id=current_user.id,
        exercise_name=body.exercise_name,
        log_date=body.log_date,
        sets_data=[s.model_dump() for s in body.sets_data],
        notes=body.notes,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/strength-log", response_model=List[StrengthLogOut])
async def get_strength_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(StrengthLog)
        .where(StrengthLog.user_id == current_user.id)
        .order_by(StrengthLog.log_date.desc())
        .limit(50)
    )
    return result.scalars().all()
