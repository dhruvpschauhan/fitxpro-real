from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from datetime import date, timedelta
import uuid

from app.database import get_db
from app.models import User, Membership, MembershipPlan
from app.routers.auth import require_admin

router = APIRouter(prefix="/memberships", tags=["admin-memberships"])

#membership plans
class PlanOut(BaseModel):
    id: uuid.UUID
    name: str
    duration_days: int
    price: float
    description: str | None
    is_active: bool

    class Config:
        from_attributes = True


class AssignMembership(BaseModel):
    user_id: uuid.UUID
    plan_id: uuid.UUID
    start_date: date
    amount_paid: float
    payment_mode: str = "cash"
    notes: str | None = None

#specified plan for a member
class MembershipOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    plan_id: uuid.UUID
    start_date: date
    end_date: date
    status: str
    amount_paid: float | None
    payment_mode: str | None
    notes: str | None

    class Config:
        from_attributes = True


# ── Plans ──────────────────────────────────────────────
@router.get("/plans", response_model=List[PlanOut])
async def list_plans(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(MembershipPlan).where(MembershipPlan.is_active == True))
    return result.scalars().all()


# ── Assign plan to a member ────────────────────────────
@router.post("/assign", response_model=MembershipOut)
async def assign_membership(
    body: AssignMembership,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    # Validate user and plan exist
    user_res = await db.execute(select(User).where(User.id == body.user_id))
    if not user_res.scalars().first():
        raise HTTPException(status_code=404, detail="User not found")

    plan_res = await db.execute(select(MembershipPlan).where(MembershipPlan.id == body.plan_id))
    plan = plan_res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    end_date = body.start_date + timedelta(days=plan.duration_days)

    #create the sqlalchemy record for the specific member
    m = Membership(
        user_id=body.user_id,
        plan_id=body.plan_id,
        start_date=body.start_date,
        end_date=end_date,
        status="active",
        amount_paid=body.amount_paid,
        payment_mode=body.payment_mode,
        notes=body.notes,
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


# ── List all memberships (admin view) ─────────────────
@router.get("/", response_model=List[MembershipOut])
async def list_memberships(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Membership).order_by(Membership.created_at.desc()))
    return result.scalars().all()


# ── List memberships for one user ─────────────────────
@router.get("/user/{user_id}", response_model=List[MembershipOut])
async def get_user_memberships(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(
        select(Membership).where(Membership.user_id == user_id).order_by(Membership.start_date.desc())
    )
    return result.scalars().all()
