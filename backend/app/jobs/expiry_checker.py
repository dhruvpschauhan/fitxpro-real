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
    """
    Fetches all memberships that are set to expire (or have expired) on a specific date.
    It uses 'selectinload' to eagerly fetch the associated User and Plan data 
    in a single database round-trip, preventing N+1 query issues.
    """
    stmt = (
        select(Membership)
        .options(selectinload(Membership.user), selectinload(Membership.plan))
        .where(
            and_(
                Membership.end_date == target_date,
                # We only care about memberships that are either currently active or just expired
                Membership.status.in_(["active", "expired"])
            )
        )
    )
    res = await db.execute(stmt)
    return res.scalars().all()

async def check_notification_log(db: AsyncSession, user_id, trigger_reason: str, today: date) -> bool:
    """
    Checks if an email notification for a specific reason (e.g., "7_day_expiry") 
    has already been successfully sent to a user TODAY.
    This prevents spamming the user with duplicate emails if the job runs multiple times a day.
    """
    stmt = (
        select(NotificationLog)
        .where(
            and_(
                NotificationLog.user_id == user_id,
                NotificationLog.trigger_reason == trigger_reason,
                NotificationLog.status == "sent",
            )
        )
        # Order by the latest sent time and grab the top 1
        .order_by(NotificationLog.sent_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    log = res.scalar_one_or_none()
    
    # If a log exists and it was sent today, return True (already sent)
    if log and log.sent_at.date() == today:
        return True
    return False

async def log_notification(db: AsyncSession, user_id, trigger_reason: str, email: str, status: str, error: str = None, triggered_by=None):
    """
    Records an entry in the NotificationLog table in the database.
    This helps keep an audit trail of all emails sent (or failed) by the system.
    """
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
    """
    Main job function that orchestrates sending expiry reminder emails.
    It checks for memberships expiring in 7, 3, and 1 days, as well as today (0 days).
    """
    today = date.today()
    # Number of days before expiry when we want to send alerts. 0 means it expires today.
    thresholds = [7, 3, 1, 0]

    # Initialize the Resend email service with our API key from the environment/config
    resend.api_key = settings.RESEND_API_KEY

    for days in thresholds:
        # Calculate the exact date that matches the current threshold
        target_date = today + timedelta(days=days)
        # Create a string label (e.g., "7_day_expiry" or "expired") to log what email was sent
        trigger_reason = f"{days}_day_expiry" if days > 0 else "expired"

        # Fetch all memberships ending on 'target_date'
        memberships = await get_memberships_by_end_date(db, target_date)

        for membership in memberships:
            user = membership.user

            # 1. Skip if we already sent this specific alert to this user today
            already_sent = await check_notification_log(db, user.id, trigger_reason, today)
            if already_sent:
                continue

            # 2. Skip if the user has no email address on file
            if not user.email:
                continue

            # 3. Generate the email content (HTML & Subject) from our templates
            template = get_email_template(trigger_reason, {
                "full_name": user.full_name,
                "plan_name": membership.plan.name,
                "expiry_date": membership.end_date.strftime("%d %B %Y")
            })

            # 4. Attempt to send the email and log the result
            try:
                resend.Emails.send({
                    "from": settings.EMAIL_FROM,
                    "to": [user.email],
                    "subject": template["subject"],
                    "html": template["html"]
                })
                # Log success
                await log_notification(db, user.id, trigger_reason, user.email, "sent")
            except Exception as e:
                # Log failure if the email bounces or the API key is wrong, etc.
                await log_notification(db, user.id, trigger_reason, user.email, "failed", error=str(e))
