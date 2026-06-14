"""
Background scheduler using APScheduler.
Runs membership expiry checks on a daily schedule.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta
import logging

from app.database import AsyncSessionLocal
from app.models import Membership, User
from app.jobs.expiry_checker import run_expiry_email_alerts

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def expire_overdue_memberships():
    """Mark memberships as expired if their end_date has passed."""
    async with AsyncSessionLocal() as db:
        try:
            today = date.today()
            # Find active memberships whose end_date has passed
            result = await db.execute(
                select(Membership).where(
                    Membership.status == 'active',
                    Membership.end_date < today
                )
            )
            expired = result.scalars().all()

            count = 0
            for m in expired:
                m.status = 'expired'
                count += 1

            if count:
                await db.commit()
                logger.info(f"[Scheduler] Expired {count} membership(s).")
            else:
                logger.info("[Scheduler] No memberships to expire today.")

        except Exception as e:
            await db.rollback()
            logger.error(f"[Scheduler] Error during expiry check: {e}")


async def email_alerts_job():
    """Run the expiry email alerts (resend) logic."""
    async with AsyncSessionLocal() as db:
        try:
            await run_expiry_email_alerts(db)
            logger.info("[Scheduler] Completed email alerts job.")
        except Exception as e:
            logger.error(f"[Scheduler] Error running email alerts: {e}")


def start_scheduler():
    """Register all jobs and start the scheduler."""
    # Daily at midnight — expire overdue memberships
    scheduler.add_job(
        expire_overdue_memberships,
        trigger=CronTrigger(hour=0, minute=0),
        id="expire_memberships",
        replace_existing=True,
    )
    # Daily at 8 AM — notify members via Resend
    scheduler.add_job(
        email_alerts_job,
        trigger=CronTrigger(hour=8, minute=0),
        id="notify_expiring",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[Scheduler] APScheduler started — expiry + email alerts jobs active.")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[Scheduler] APScheduler stopped.")
