from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import uuid

from app.database import get_db
from app.models import User, Membership, MembershipPlan
from app.models.extra_models import UserProfile
from app.routers.auth import get_current_user

router = APIRouter(prefix="/user", tags=["member-portal"])


class MembershipDetail(BaseModel):
    id: uuid.UUID
    plan_name: str
    start_date: date
    end_date: date
    status: str
    days_left: int
    amount_paid: float | None
    payment_mode: str | None

    class Config:
        from_attributes = True


class ProfileOut(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    email: str
    phone: str | None
    role: str
    is_active: bool

    class Config:
        from_attributes = True


# ── Fitness Profile schemas ────────────────────────────

class FitnessProfileOut(BaseModel):
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None  # sedentary, light, moderate, active, very_active
    goal_type: Optional[str] = None       # weight_loss, maintenance, weight_gain, lean_bulk
    diet_preference: Optional[str] = None

    class Config:
        from_attributes = True


class FitnessProfileUpdate(BaseModel):
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None
    goal_type: Optional[str] = None
    diet_preference: Optional[str] = None


@router.get("/profile", response_model=ProfileOut)
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.get("/membership", response_model=MembershipDetail | None)
async def get_my_active_membership(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Membership, MembershipPlan)
        .join(MembershipPlan, Membership.plan_id == MembershipPlan.id)
        .where(
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
        .order_by(Membership.end_date.desc())
    )
    row = result.first()
    if not row:
        return None
    membership, plan = row
    days_left = max((membership.end_date - date.today()).days, 0)
    return {
        "id": membership.id,
        "plan_name": plan.name,
        "start_date": membership.start_date,
        "end_date": membership.end_date,
        "status": membership.status,
        "days_left": days_left,
        "amount_paid": float(membership.amount_paid) if membership.amount_paid else None,
        "payment_mode": membership.payment_mode,
    }


# ── Fitness Profile endpoints ─────────────────────────

@router.get("/fitness-profile", response_model=FitnessProfileOut)
async def get_fitness_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return FitnessProfileOut()
    return profile


@router.put("/fitness-profile", response_model=FitnessProfileOut)
async def update_fitness_profile(
    body: FitnessProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(profile, key, value)

    await db.commit()
    await db.refresh(profile)
    return profile


# ── Nutrition Log endpoints ────────────────────────────

class NutritionLogOut(BaseModel):
    id: uuid.UUID
    log_date: date
    logged_food: list
    water_glasses: int

    class Config:
        from_attributes = True

class NutritionLogUpdate(BaseModel):
    logged_food: list
    water_glasses: int


@router.get("/nutrition-log/today", response_model=NutritionLogOut)
async def get_today_nutrition_log(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.extra_models import UserNutritionLog
    today = date.today()
    result = await db.execute(
        select(UserNutritionLog).where(
            UserNutritionLog.user_id == current_user.id,
            UserNutritionLog.log_date == today
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        # Return an empty shell, but don't create it in DB until they save
        return NutritionLogOut(
            id=uuid.uuid4(),
            log_date=today,
            logged_food=[],
            water_glasses=0
        )
    return log

@router.put("/nutrition-log/today", response_model=NutritionLogOut)
async def update_today_nutrition_log(
    body: NutritionLogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.extra_models import UserNutritionLog
    today = date.today()
    result = await db.execute(
        select(UserNutritionLog).where(
            UserNutritionLog.user_id == current_user.id,
            UserNutritionLog.log_date == today
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        log = UserNutritionLog(
            user_id=current_user.id,
            log_date=today,
            logged_food=body.logged_food,
            water_glasses=body.water_glasses
        )
        db.add(log)
    else:
        log.logged_food = body.logged_food
        log.water_glasses = body.water_glasses

    await db.commit()
    await db.refresh(log)
    return log
