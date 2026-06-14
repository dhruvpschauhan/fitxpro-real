from datetime import date, timedelta
import resend
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models import Membership, User
from app.models.extra_models import NotificationLog
from app.config import settings
from app.services.email_templates import get_email_template

async def get_memberships_by_end_date(db: AsyncSession, target_date: date):
    stmt = (
        select(Membership)
        .options(selectinload(Membership.user), selectinload(Membership.plan))
        .where(
            and_(
                Membership.end_date == target_date,
                Membership.status.in_(["active", "expired"])
            )
        )
    )
    res = await db.execute(stmt)
    return res.scalars().all()

async def check_notification_log(db: AsyncSession, user_id, trigger_reason: str, today: date) -> bool:
    stmt = (
        select(NotificationLog)
        .where(
            and_(
                NotificationLog.user_id == user_id,
                NotificationLog.trigger_reason == trigger_reason,
                NotificationLog.status == "sent",
                # SQLite func.date() can be tricky via SQLAlchemy, so we can just check if sent_at is within today.
                # Actually, simpler: just order by sent_at desc and check if it's the same day.
            )
        )
        .order_by(NotificationLog.sent_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    log = res.scalar_one_or_none()
    if log and log.sent_at.date() == today:
        return True
    return False

async def log_notification(db: AsyncSession, user_id, trigger_reason: str, email: str, status: str, error: str = None, triggered_by=None):
    log = NotificationLog(
        user_id=user_id,
        trigger_reason=trigger_reason,
        recipient_email=email,
        status=status,
        error_message=error,
        triggered_by=triggered_by
    )
    db.add(log)
    await db.commit()

async def run_expiry_email_alerts(db: AsyncSession):
    today = date.today()
    thresholds = [7, 3, 1, 0]   # 0 = expired today

    resend.api_key = settings.RESEND_API_KEY

    for days in thresholds:
        target_date = today + timedelta(days=days)
        trigger_reason = f"{days}_day_expiry" if days > 0 else "expired"

        memberships = await get_memberships_by_end_date(db, target_date)

        for membership in memberships:
            user = membership.user

            already_sent = await check_notification_log(db, user.id, trigger_reason, today)
            if already_sent:
                continue

            if not user.email:
                continue

            template = get_email_template(trigger_reason, {
                "full_name": user.full_name,
                "plan_name": membership.plan.name,
                "expiry_date": membership.end_date.strftime("%d %B %Y")
            })

            try:
                resend.Emails.send({
                    "from": settings.EMAIL_FROM,
                    "to": [user.email],
                    "subject": template["subject"],
                    "html": template["html"]
                })
                await log_notification(db, user.id, trigger_reason, user.email, "sent")
            except Exception as e:
                await log_notification(db, user.id, trigger_reason, user.email, "failed", error=str(e))
