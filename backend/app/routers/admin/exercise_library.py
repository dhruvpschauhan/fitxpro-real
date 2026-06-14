from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import get_db
from app.models import User
from app.models.extra_models import ExerciseLibrary, Exercise
from app.routers.auth import require_admin

router = APIRouter(prefix="/exercise-library", tags=["admin-exercise-library"])


# ── Schemas ─────────────────────────────────────────────────────────────────

class ExerciseLibraryOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    muscle_group: str
    created_by: Optional[uuid.UUID]
    created_at: datetime
    used_in: int = 0
    class Config: from_attributes = True

class ExerciseLibraryIn(BaseModel):
    name: str
    category: str
    muscle_group: str

class ExerciseLibraryPatch(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    muscle_group: Optional[str] = None


async def _build_used_in_map(db: AsyncSession) -> dict:
    """Returns {library_id: usage_count} for all library entries."""
    rows = await db.execute(
        select(Exercise.library_id, func.count(Exercise.id).label("cnt"))
        .where(Exercise.library_id != None)
        .group_by(Exercise.library_id)
    )
    return {str(row.library_id): row.cnt for row in rows}


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("", response_model=List[ExerciseLibraryOut])
async def list_exercises(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    muscle_group: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    query = select(ExerciseLibrary)
    if q:
        query = query.where(ExerciseLibrary.name.ilike(f"%{q}%"))
    if category:
        query = query.where(ExerciseLibrary.category == category)
    if muscle_group:
        query = query.where(ExerciseLibrary.muscle_group == muscle_group)
    query = query.order_by(ExerciseLibrary.name.asc())

    result = await db.execute(query)
    exercises = result.scalars().all()

    used_map = await _build_used_in_map(db)

    return [
        ExerciseLibraryOut(
            id=ex.id,
            name=ex.name,
            category=ex.category,
            muscle_group=ex.muscle_group,
            created_by=ex.created_by,
            created_at=ex.created_at,
            used_in=used_map.get(str(ex.id), 0)
        )
        for ex in exercises
    ]


@router.post("", response_model=ExerciseLibraryOut, status_code=201)
async def create_exercise(
    body: ExerciseLibraryIn,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    existing = await db.execute(
        select(ExerciseLibrary).where(func.lower(ExerciseLibrary.name) == body.name.lower())
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="An exercise with this name already exists")

    new_ex = ExerciseLibrary(
        name=body.name.title(),
        category=body.category,
        muscle_group=body.muscle_group,
        created_by=current_admin.id
    )
    db.add(new_ex)
    await db.commit()
    await db.refresh(new_ex)

    return ExerciseLibraryOut(
        id=new_ex.id, name=new_ex.name, category=new_ex.category,
        muscle_group=new_ex.muscle_group, created_by=new_ex.created_by,
        created_at=new_ex.created_at, used_in=0
    )


@router.patch("/{ex_id}", response_model=ExerciseLibraryOut)
async def update_exercise(
    ex_id: uuid.UUID,
    body: ExerciseLibraryPatch,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(ExerciseLibrary).where(ExerciseLibrary.id == ex_id))
    ex = result.scalars().first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")

    if body.name is not None and body.name.lower() != ex.name.lower():
        clash = await db.execute(
            select(ExerciseLibrary).where(func.lower(ExerciseLibrary.name) == body.name.lower())
        )
        if clash.scalars().first():
            raise HTTPException(status_code=409, detail="An exercise with this name already exists")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(ex, field, value)
    await db.commit()
    await db.refresh(ex)

    used_map = await _build_used_in_map(db)
    return ExerciseLibraryOut(
        id=ex.id, name=ex.name, category=ex.category,
        muscle_group=ex.muscle_group, created_by=ex.created_by,
        created_at=ex.created_at, used_in=used_map.get(str(ex.id), 0)
    )


@router.delete("/{ex_id}", status_code=204)
async def delete_exercise(
    ex_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(ExerciseLibrary).where(ExerciseLibrary.id == ex_id))
    ex = result.scalars().first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")

    count = await db.execute(
        select(func.count(Exercise.id)).where(Exercise.library_id == ex_id)
    )
    if count.scalar() > 0:
        raise HTTPException(status_code=400, detail="Exercise is used in active programs")

    await db.delete(ex)
    await db.commit()
