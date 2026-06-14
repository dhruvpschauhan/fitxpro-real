from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, field_validator
from datetime import datetime
import uuid

from app.database import get_db
from app.models import User
from app.models.extra_models import WorkoutProgram, WorkoutDay, Exercise, ExerciseLibrary
from app.routers.auth import require_admin

router = APIRouter(prefix="/workout-programs", tags=["admin-workout-programs"])


# ── Schemas ────────────────────────────────────────────────────────────

class ExerciseIn(BaseModel):
    name: str
    library_id: Optional[uuid.UUID] = None
    category: Optional[str] = "Full Body"
    muscle_group: Optional[str] = "Full Body"
    sets: Optional[str] = "3"
    reps: Optional[str] = "10-12"
    rest_seconds: Optional[int] = 60
    notes: Optional[str] = None
    sort_order: int = 0

class ExerciseOut(BaseModel):
    id: uuid.UUID
    name: str
    library_id: Optional[uuid.UUID]
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

class ExercisePatch(BaseModel):
    name: Optional[str] = None
    sets: Optional[str] = None
    reps: Optional[str] = None
    rest_seconds: Optional[int] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None

class DayIn(BaseModel):
    day_label: str = "Day 1"
    focus: Optional[str] = None
    sort_order: int = 0
    week_day: Optional[str] = None

class DayOut(BaseModel):
    id: uuid.UUID
    day_label: str
    focus: Optional[str]
    sort_order: int
    week_day: Optional[str]
    exercises: List[ExerciseOut]
    class Config: from_attributes = True

class DayPatch(BaseModel):
    day_label: Optional[str] = None
    focus: Optional[str] = None
    sort_order: Optional[int] = None
    week_day: Optional[str] = None

class ReorderItem(BaseModel):
    id: uuid.UUID
    sort_order: int

class ProgramCreate(BaseModel):
    name: str
    description: Optional[str] = None
    difficulty: str = "beginner"
    goal_tag: str = "general_fitness"
    is_published: bool = False

class ProgramPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    goal_tag: Optional[str] = None
    is_published: Optional[bool] = None

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


# ── Helpers ─────────────────────────────────────────────────────────────

async def _load_program(program_id: uuid.UUID, db: AsyncSession) -> WorkoutProgram:
    result = await db.execute(
        select(WorkoutProgram)
        .options(selectinload(WorkoutProgram.days).selectinload(WorkoutDay.exercises))
        .where(WorkoutProgram.id == program_id)
    )
    prog = result.scalars().first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    return prog


# ── Program CRUD ─────────────────────────────────────────────────────────

@router.get("", response_model=List[ProgramSummary])
async def list_programs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(
        select(WorkoutProgram)
        .options(selectinload(WorkoutProgram.days).selectinload(WorkoutDay.exercises))
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


@router.post("", response_model=ProgramDetail)
async def create_program(
    body: ProgramCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    prog = WorkoutProgram(
        name=body.name, description=body.description,
        difficulty=body.difficulty, goal_tag=body.goal_tag,
        is_published=body.is_published, created_by=current_user.id
    )
    db.add(prog)
    await db.commit()
    await db.refresh(prog)
    return await _load_program(prog.id, db)


@router.get("/{program_id}", response_model=ProgramDetail)
async def get_program(
    program_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    return await _load_program(program_id, db)


@router.patch("/{program_id}", response_model=ProgramDetail)
async def update_program(
    program_id: uuid.UUID,
    body: ProgramPatch,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    prog = await _load_program(program_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(prog, field, value)
    await db.commit()
    return await _load_program(program_id, db)


@router.delete("/{program_id}", status_code=204)
async def delete_program(
    program_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    prog = await _load_program(program_id, db)
    await db.delete(prog)
    await db.commit()


@router.patch("/{program_id}/publish", response_model=ProgramDetail)
async def toggle_publish(
    program_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    prog = await _load_program(program_id, db)
    prog.is_published = not prog.is_published
    await db.commit()
    return await _load_program(program_id, db)


# ── Day CRUD ──────────────────────────────────────────────────────────────

@router.post("/{program_id}/days", response_model=DayOut)
async def add_day(
    program_id: uuid.UUID,
    body: DayIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    await _load_program(program_id, db)  # 404 guard
    # Auto sort_order = current max + 1
    result = await db.execute(
        select(func.count(WorkoutDay.id)).where(WorkoutDay.program_id == program_id)
    )
    count = result.scalar() or 0
    day = WorkoutDay(
        program_id=program_id,
        day_label=body.day_label,
        focus=body.focus,
        sort_order=count
    )
    db.add(day)
    await db.commit()
    # reload with exercises
    result2 = await db.execute(
        select(WorkoutDay).options(selectinload(WorkoutDay.exercises)).where(WorkoutDay.id == day.id)
    )
    return result2.scalars().first()


@router.patch("/days/{day_id}", response_model=DayOut)
async def update_day(
    day_id: uuid.UUID,
    body: DayPatch,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(
        select(WorkoutDay).options(selectinload(WorkoutDay.exercises)).where(WorkoutDay.id == day_id)
    )
    day = result.scalars().first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(day, field, value)
    await db.commit()
    result2 = await db.execute(
        select(WorkoutDay).options(selectinload(WorkoutDay.exercises)).where(WorkoutDay.id == day_id)
    )
    return result2.scalars().first()


@router.delete("/days/{day_id}", status_code=204)
async def delete_day(
    day_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == day_id))
    day = result.scalars().first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    await db.delete(day)
    await db.commit()


@router.patch("/{program_id}/reorder-days", status_code=204)
async def reorder_days(
    program_id: uuid.UUID,
    body: List[ReorderItem],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    for item in body:
        result = await db.execute(
            select(WorkoutDay).where(WorkoutDay.id == item.id, WorkoutDay.program_id == program_id)
        )
        day = result.scalars().first()
        if day:
            day.sort_order = item.sort_order
    await db.commit()


# ── Exercise CRUD ────────────────────────────────────────────────────────

@router.post("/days/{day_id}/exercises", response_model=ExerciseOut)
async def add_exercise(
    day_id: uuid.UUID,
    body: ExerciseIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    result = await db.execute(select(WorkoutDay).where(WorkoutDay.id == day_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Day not found")

    # ── Resolve library entry ──────────────────────────────────────────
    resolved_library_id = None
    if body.library_id:
        lib_check = await db.execute(select(ExerciseLibrary).where(ExerciseLibrary.id == body.library_id))
        if lib_check.scalars().first():
            resolved_library_id = body.library_id
    else:
        # Case-insensitive name search
        lib_match = await db.execute(
            select(ExerciseLibrary).where(func.lower(ExerciseLibrary.name) == body.name.lower())
        )
        matched = lib_match.scalars().first()
        if matched:
            resolved_library_id = matched.id
        else:
            # Auto-create new library entry
            new_lib = ExerciseLibrary(
                name=body.name.title(),
                category=body.category or "Full Body",
                muscle_group=body.muscle_group or "Full Body",
                created_by=current_user.id
            )
            db.add(new_lib)
            await db.flush()  # get id before commit
            resolved_library_id = new_lib.id

    count_result = await db.execute(
        select(func.count(Exercise.id)).where(Exercise.workout_day_id == day_id)
    )
    count = count_result.scalar() or 0

    ex = Exercise(
        workout_day_id=day_id, library_id=resolved_library_id,
        name=body.name, sets=body.sets,
        reps=body.reps, rest_seconds=body.rest_seconds,
        notes=body.notes, sort_order=count
    )
    db.add(ex)
    await db.commit()
    await db.refresh(ex)
    return ex


@router.patch("/exercises/{ex_id}", response_model=ExerciseOut)
async def update_exercise(
    ex_id: uuid.UUID,
    body: ExercisePatch,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Exercise).where(Exercise.id == ex_id))
    ex = result.scalars().first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(ex, field, value)
    await db.commit()
    await db.refresh(ex)
    return ex


@router.delete("/exercises/{ex_id}", status_code=204)
async def delete_exercise(
    ex_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Exercise).where(Exercise.id == ex_id))
    ex = result.scalars().first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    await db.delete(ex)
    await db.commit()


@router.patch("/days/{day_id}/reorder-exercises", status_code=204)
async def reorder_exercises(
    day_id: uuid.UUID,
    body: List[ReorderItem],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    for item in body:
        result = await db.execute(
            select(Exercise).where(Exercise.id == item.id, Exercise.workout_day_id == day_id)
        )
        ex = result.scalars().first()
        if ex:
            ex.sort_order = item.sort_order
    await db.commit()
