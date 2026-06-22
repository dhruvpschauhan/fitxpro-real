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
from app.config import settings
from app.services.email_templates import get_email_template
from app.services.email_service import send_email

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
    
    # Sort by days remaining ascending
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
        .where(
            # Use end_date <= today so members expiring TODAY also show up.
            # We don't filter on status='expired' because the system has no
            # background job to auto-flip statuses — end_date is the source of truth.
            Membership.end_date <= today
        )
    )
    res = await db.execute(stmt)
    memberships = res.scalars().all()

    user_ids = [m.user_id for m in memberships]
    last_alerts = await _get_last_alerts(user_ids, db)

    out = []
    for m in memberships:
        days_rem = (m.end_date - today).days  # will be negative
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
    
    # Sort by most recently expired first
    out.sort(key=lambda x: x.end_date, reverse=True)
    return out

async def _send_manual_alert(user_id: uuid.UUID, db: AsyncSession, admin_id: uuid.UUID) -> dict:
    # Get user and their latest membership
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
    if not user.email:
        return {"success": False, "error": "User has no email address"}

    today = datetime.now(timezone.utc).date()
    expiry_str = m.end_date.strftime("%d %B %Y")

    template = get_email_template("manual", {
        "full_name": user.full_name,
        "plan_name": m.plan.name,
        "expiry_date": expiry_str
    })

    try:
        result = send_email(
            to_email=user.email,
            subject=template["subject"],
            html_body=template["html"]
        )
        if not result["success"]:
            raise Exception(result["error"])
        log = NotificationLog(
            user_id=user.id,
            trigger_reason="manual",
            status="sent",
            recipient_email=user.email,
            triggered_by=admin_id
        )
        db.add(log)
        await db.commit()
        return {"success": True, "sent_to": user.email}
    except Exception as e:
        log = NotificationLog(
            user_id=user.id,
            trigger_reason="manual",
            status="failed",
            recipient_email=user.email,
            error_message=str(e),
            triggered_by=admin_id
        )
        db.add(log)
        await db.commit()
        return {"success": False, "error": str(e)}

@router.post("/send/{user_id}")
async def send_manual_alert(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user)
):
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await _send_manual_alert(user_id, db, current_admin.id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/renew/{user_id}")
async def quick_renew_membership(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user)
):
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get latest membership
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
    
    # If expired, start today. If expiring soon, start from current end_date
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
async def send_manual_alerts_bulk(
    req: SendAllRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_user)
):
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    sent = 0
    failed = 0
    errors = []

    for uid in req.user_ids:
        result = await _send_manual_alert(uid, db, current_admin.id)
        if result["success"]:
            sent += 1
        else:
            failed += 1
            errors.append({"user_id": str(uid), "error": result["error"]})
        
        # 200ms delay to avoid rate limits
        await asyncio.sleep(0.2)
    
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
            "recipient_email": log.recipient_email,
            "trigger_reason": log.trigger_reason,
            "sent_at": log.sent_at,
            "status": log.status,
            "error_message": log.error_message,
            "triggered_by": log.triggered_by
        })
    return out
