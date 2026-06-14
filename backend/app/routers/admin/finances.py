from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from pydantic import BaseModel
from datetime import date, datetime
import uuid

from app.database import get_db
from app.models import User, Membership
from app.models.extra_models import Expense, BodyMetric, EquipmentMaintenanceLog, Equipment
from app.routers.auth import require_admin, get_current_user

def _time_ago(dt) -> str:
    if not dt: return "JUST NOW"
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time())
    if dt.tzinfo:
        dt = dt.replace(tzinfo=None)
    diff = datetime.utcnow() - dt
    if diff.total_seconds() < -60: # Handle local time vs UTC mismatch
        diff = datetime.now() - dt
    if diff.total_seconds() < 0:
        return "JUST NOW"
    if diff.days > 0:
        return f"{diff.days} DAY{'S' if diff.days > 1 else ''} AGO"
    seconds = diff.seconds
    if seconds >= 3600:
        hrs = seconds // 3600
        return f"{hrs} HR{'S' if hrs > 1 else ''} AGO"
    if seconds >= 60:
        mins = seconds // 60
        return f"{mins} MIN AGO"
    return "JUST NOW"

router = APIRouter(prefix="/finances", tags=["finances"])


# ── Expense tracking ───────────────────────────────────

class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: str | None = None
    expense_date: date


class ExpenseOut(BaseModel):
    id: uuid.UUID
    category: str
    amount: float
    description: str | None
    expense_date: date
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/expenses", response_model=ExpenseOut)
async def record_expense(
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    exp = Expense(
        category=body.category,
        amount=body.amount,
        description=body.description,
        expense_date=body.expense_date,
        recorded_by=current_user.id,
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return exp


@router.get("/expenses", response_model=List[ExpenseOut])
async def list_expenses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Expense).order_by(Expense.expense_date.desc()))
    return result.scalars().all()


# ── Summary endpoint ───────────────────────────────────

@router.get("/summary")
async def get_finances_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    today = date.today()
    month_start = today.replace(day=1)

    # Revenue this month (sum of amount_paid from memberships created this month)
    rev_result = await db.execute(
        select(func.sum(Membership.amount_paid)).where(
            func.date(Membership.created_at) >= month_start
        )
    )
    revenue_this_month = float(rev_result.scalar() or 0)

    # Expenses this month
    exp_result = await db.execute(
        select(func.sum(Expense.amount)).where(
            Expense.expense_date >= month_start
        )
    )
    expenses_this_month = float(exp_result.scalar() or 0)

    # Active members
    active_result = await db.execute(
        select(func.count(Membership.id)).where(
            Membership.status == 'active',
            Membership.end_date >= today,
        )
    )
    active_members = active_result.scalar() or 0

    # Expiring this week
    week_end = date.fromordinal(today.toordinal() + 7)
    expiring_result = await db.execute(
        select(func.count(Membership.id)).where(
            Membership.status == 'active',
            Membership.end_date >= today,
            Membership.end_date <= week_end,
        )
    )
    expiring_this_week = expiring_result.scalar() or 0

    # Recent transactions (last 10 memberships with payment)
    tx_result = await db.execute(
        select(Membership, User)
        .join(User, Membership.user_id == User.id)
        .where(Membership.amount_paid != None)
        .order_by(Membership.created_at.desc())
        .limit(10)
    )
    transactions = [
        {
            "member": u.full_name,
            "amount": float(m.amount_paid),
            "mode": m.payment_mode,
            "date": m.created_at.date().isoformat() if m.created_at else None,
            "status": m.status,
        }
        for m, u in tx_result.all()
    ]

    # --- Recent Activity Feed ---
    activity = []

    # 1. New Members
    u_res = await db.execute(select(User).where(User.role == 'member').order_by(User.created_at.desc()).limit(3))
    for u in u_res.scalars().all():
        activity.append({"text": f"New member {u.full_name} registered", "dt": u.created_at, "type": "member"})

    # 2. Payments
    p_res = await db.execute(
        select(Membership, User).join(User, Membership.user_id == User.id)
        .where(Membership.amount_paid != None).order_by(Membership.created_at.desc()).limit(3)
    )
    for m, u in p_res.all():
        activity.append({"text": f"Payment of ₹{float(m.amount_paid)} received from {u.full_name}", "dt": m.created_at, "type": "payment"})

    # 3. Equipment logs
    e_res = await db.execute(
        select(EquipmentMaintenanceLog, Equipment).join(Equipment, EquipmentMaintenanceLog.equipment_id == Equipment.id)
        .order_by(EquipmentMaintenanceLog.reported_at.desc()).limit(3)
    )
    for log, eq in e_res.all():
        activity.append({"text": f"Equipment: {eq.name} flagged for maintenance", "dt": log.reported_at, "type": "equipment"})

    # Sort activity by dt descending, format it, and limit to top 6
    activity.sort(key=lambda x: x["dt"] or datetime.min, reverse=True)
    recent_activity = [{"text": a["text"], "time": _time_ago(a["dt"]), "type": a["type"]} for a in activity[:6]]

    return {
        "active_members": active_members,
        "expiring_this_week": expiring_this_week,
        "revenue_this_month": revenue_this_month,
        "expenses_this_month": expenses_this_month,
        "net_this_month": revenue_this_month - expenses_this_month,
        "pending_issues": 0,
        "recent_transactions": transactions,
        "recent_activity": recent_activity,
    }


# ── Body Metrics (member) ──────────────────────────────

class BodyMetricCreate(BaseModel):
    log_date: date
    body_weight_kg: float | None = None
    goal_type: str | None = None
    notes: str | None = None


class BodyMetricOut(BaseModel):
    id: uuid.UUID
    log_date: date
    body_weight_kg: float | None
    goal_type: str | None
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/body-metrics", response_model=List[BodyMetricOut])
async def get_my_body_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(BodyMetric)
        .where(BodyMetric.user_id == current_user.id)
        .order_by(BodyMetric.log_date.asc())
        .limit(90)
    )
    return result.scalars().all()


@router.post("/body-metrics", response_model=BodyMetricOut)
async def log_body_metric(
    body: BodyMetricCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if body.log_date < date.today():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Log date cannot be in the past. Only today or future dates are allowed.")
    metric = BodyMetric(
        user_id=current_user.id,
        log_date=body.log_date,
        body_weight_kg=body.body_weight_kg,
        goal_type=body.goal_type,
        notes=body.notes,
    )
    db.add(metric)
    await db.commit()
    await db.refresh(metric)
    return metric


@router.delete("/body-metrics/{metric_id}", status_code=204)
async def delete_body_metric(
    metric_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from fastapi import HTTPException
    result = await db.execute(
        select(BodyMetric).where(
            BodyMetric.id == metric_id,
            BodyMetric.user_id == current_user.id
        )
    )
    metric = result.scalar_one_or_none()
    if not metric:
        raise HTTPException(status_code=404, detail="Record not found.")
    await db.delete(metric)
    await db.commit()
