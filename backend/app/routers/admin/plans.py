from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.database import get_db
from app.models import User
from app.models.membership_plan import MembershipPlan
from app.routers.auth import require_admin

router = APIRouter(prefix="/plans", tags=["admin-plans"])


class PlanCreate(BaseModel):
    name: str
    duration_days: int
    price: float
    description: str | None = None


class PlanUpdate(BaseModel):
    name: str | None = None
    duration_days: int | None = None
    price: float | None = None
    description: str | None = None
    is_active: bool | None = None


class PlanOut(BaseModel):
    id: uuid.UUID
    name: str
    duration_days: int
    price: float
    description: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[PlanOut])
async def list_plans(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(MembershipPlan).order_by(MembershipPlan.price))
    return result.scalars().all()


@router.post("/", response_model=PlanOut)
async def create_plan(
    body: PlanCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    plan = MembershipPlan(
        name=body.name,
        duration_days=body.duration_days,
        price=body.price,
        description=body.description,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.patch("/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: uuid.UUID,
    body: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(MembershipPlan).where(MembershipPlan.id == plan_id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(MembershipPlan).where(MembershipPlan.id == plan_id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    # Soft-delete: just mark inactive
    plan.is_active = False
    await db.commit()
