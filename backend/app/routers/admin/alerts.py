import uuid
from typing import List, Optional
from datetime import datetime, date, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
import asyncio

from app.database import get_db
from app.models import User, Membership
from app.models.extra_models import NotificationLog
from app.routers.auth import get_current_user
from app.services.whatsapp_service import send_whatsapp

router = APIRouter(prefix="/admin/alerts", tags=["Admin Alerts"])

# ── Schemas ─────────────────────────────────────────────────────────────

class AlertMemberOut(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    phone: Optional[str]
    plan_name: str
    end_date: date
    days_remaining: int
    last_alerted_at: Optional[datetime]

class SendAllRequest(BaseModel):
    user_ids: List[uuid.UUID]

class SendAllResponse(BaseModel):
    sent: int
    failed: int
    errors: List[dict]

# ── Helper ──────────────────────────────────────────────────────────────

async def _get_last_alerts(user_ids: List[uuid.UUID], db: AsyncSession) -> dict:
    if not user_ids:
        return {}
    stmt = (
        select(NotificationLog.user_id, func.max(NotificationLog.sent_at).label("last_sent"))
        .where(and_(NotificationLog.user_id.in_(user_ids), NotificationLog.status == "sent"))
        .group_by(NotificationLog.user_id)
    )
    res = await db.execute(stmt)
    return {row.user_id: row.last_sent for row in res}

async def _send_whatsapp_alert(user_id: uuid.UUID, db: AsyncSession, admin_id: uuid.UUID) -> dict:
    """Internal helper: send a WhatsApp alert for a given user_id."""
    stmt = (
        select(Membership)
        .options(selectinload(Membership.user), selectinload(Membership.plan))
        .where(Membership.user_id == user_id)
        .order_by(Membership.end_date.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    m = res.scalar_one_or_none()

    if not m:
        return {"success": False, "error": "No membership found"}

    user = m.user
    if not user.phone:
        return {"success": False, "error": "Member has no phone number on file"}

    today = datetime.now(timezone.utc).date()
    days_rem = (m.end_date - today).days
    expiry_str = m.end_date.strftime("%d %B %Y")

    if days_rem < 0:
        msg = (
            f"Hi {user.full_name} 👋\n\n"
            f"Your *{m.plan.name}* membership at *FitX Pro* expired on *{expiry_str}*."
            f" Renew now to keep your fitness streak going! 💪\n\n"
            f"Visit us or contact reception to renew."
        )
    elif days_rem == 0:
        msg = (
            f"Hi {user.full_name} 👋\n\n"
            f"Your *{m.plan.name}* membership at *FitX Pro* expires *TODAY*! ⚠️"
            f" Renew before end of day to avoid any interruption.\n\n"
            f"Visit us or contact reception to renew."
        )
    else:
        msg = (
            f"Hi {user.full_name} 👋\n\n"
            f"Your *{m.plan.name}* membership at *FitX Pro* expires in *{days_rem} day{'s' if days_rem != 1 else ''}* on *{expiry_str}*. ⏳"
            f"\n\nRenew early to avoid any break in your training! 💪\n\n"
            f"Visit us or contact reception to renew."
        )

    result = send_whatsapp(to_phone=user.phone, body=msg)

    log = NotificationLog(
        user_id=user.id,
        trigger_reason="whatsapp_manual",
        status="sent" if result["success"] else "failed",
        recipient_email=user.phone,
        error_message=result.get("error"),
        triggered_by=admin_id
    )
    db.add(log)
    await db.commit()

    return {"success": result["success"], "error": result.get("error"), "sent_to": user.phone}

# ── Endpoints ───────────────────────────────────────────────────────────

@router.get("/expiring", response_model=List[AlertMemberOut])
async def get_expiring_members(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user)
):
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    today = datetime.now(timezone.utc).date()
    target_date = today + timedelta(days=days)

    stmt = (
        select(Membership)
        .options(selectinload(Membership.user), selectinload(Membership.plan))
        .where(
            and_(
                Membership.status == "active",
                Membership.end_date >= today,
                Membership.end_date <= target_date
            )
        )
    )
    res = await db.execute(stmt)
    memberships = res.scalars().all()

    user_ids = [m.user_id for m in memberships]
    last_alerts = await _get_last_alerts(user_ids, db)

    out = []
    for m in memberships:
        days_rem = (m.end_date - today).days
        out.append(AlertMemberOut(
            user_id=m.user_id,
            full_name=m.user.full_name,
            email=m.user.email or "",
            phone=m.user.phone,
            plan_name=m.plan.name,
            end_date=m.end_date,
            days_remaining=days_rem,
            last_alerted_at=last_alerts.get(m.user_id)
        ))
    out.sort(key=lambda x: x.days_remaining)
    return out

@router.get("/expired", response_model=List[AlertMemberOut])
async def get_expired_members(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user)
):
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    today = datetime.now(timezone.utc).date()

    stmt = (
        select(Membership)
        .options(selectinload(Membership.user), selectinload(Membership.plan))
        .where(Membership.end_date <= today)
    )
    res = await db.execute(stmt)
    memberships = res.scalars().all()

    user_ids = [m.user_id for m in memberships]
    last_alerts = await _get_last_alerts(user_ids, db)

    out = []
    for m in memberships:
        days_rem = (m.end_date - today).days
        out.append(AlertMemberOut(
            user_id=m.user_id,
            full_name=m.user.full_name,
            email=m.user.email or "",
            phone=m.user.phone,
            plan_name=m.plan.name,
            end_date=m.end_date,
            days_remaining=days_rem,
            last_alerted_at=last_alerts.get(m.user_id)
        ))
    out.sort(key=lambda x: x.end_date, reverse=True)
    return out

@router.post("/whatsapp/{user_id}")
async def send_single_whatsapp_alert(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user)
):
    """Send a WhatsApp renewal reminder to a single member."""
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await _send_whatsapp_alert(user_id, db, current_admin.id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"success": True, "sent_to": result.get("sent_to")}

@router.post("/renew/{user_id}")
async def quick_renew_membership(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user)
):
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    stmt = (
        select(Membership)
        .options(selectinload(Membership.plan))
        .where(Membership.user_id == user_id)
        .order_by(Membership.end_date.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    old_m = res.scalar_one_or_none()

    if not old_m:
        raise HTTPException(status_code=404, detail="No membership found to renew")

    today = datetime.now(timezone.utc).date()
    start_date = today if old_m.end_date < today else old_m.end_date
    end_date = start_date + timedelta(days=old_m.plan.duration_days)

    new_m = Membership(
        user_id=user_id,
        plan_id=old_m.plan_id,
        start_date=start_date,
        end_date=end_date,
        status="active",
        amount_paid=old_m.plan.price,
        payment_mode="Cash",
        notes="Quick Renew from Alerts Dashboard"
    )
    db.add(new_m)
    await db.commit()
    return {"success": True, "new_end_date": end_date}

@router.post("/send-all", response_model=SendAllResponse)
async def send_whatsapp_alerts_bulk(
    req: SendAllRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user)
):
    """Send WhatsApp alerts to all provided user IDs."""
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    sent = 0
    failed = 0
    errors = []

    for uid in req.user_ids:
        result = await _send_whatsapp_alert(uid, db, current_admin.id)
        if result["success"]:
            sent += 1
        else:
            failed += 1
            errors.append({"user_id": str(uid), "error": result["error"]})

        # Small delay to respect Twilio rate limits
        await asyncio.sleep(0.3)

    return SendAllResponse(sent=sent, failed=failed, errors=errors)

@router.get("/logs")
async def get_recent_logs(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user)
):
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    stmt = (
        select(NotificationLog, User.full_name)
        .join(User, NotificationLog.user_id == User.id)
        .order_by(NotificationLog.sent_at.desc())
        .limit(50)
    )
    res = await db.execute(stmt)

    out = []
    for log, name in res:
        out.append({
            "id": log.id,
            "user_name": name,
            "recipient_phone": log.recipient_email,  # field stores phone now
            "trigger_reason": log.trigger_reason,
            "sent_at": log.sent_at,
            "status": log.status,
            "error_message": log.error_message,
            "triggered_by": log.triggered_by
        })
    return out
