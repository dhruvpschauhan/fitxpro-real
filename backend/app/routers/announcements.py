from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.database import get_db
from app.models import User
from app.models.extra_models import Announcement
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/announcements", tags=["announcements"])


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    expires_at: datetime | None = None


class AnnouncementOut(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    is_active: bool
    created_at: datetime
    expires_at: datetime | None

    class Config:
        from_attributes = True


# Admin: create
@router.post("/", response_model=AnnouncementOut)
async def create_announcement(
    body: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ann = Announcement(
        title=body.title,
        body=body.body,
        expires_at=body.expires_at,
        created_by=current_user.id,
    )
    db.add(ann)
    await db.commit()
    await db.refresh(ann)
    return ann


# Admin: list all
@router.get("/admin", response_model=List[AnnouncementOut])
async def list_all_announcements(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Announcement).order_by(Announcement.created_at.desc()))
    return result.scalars().all()


# Admin: deactivate
@router.delete("/{ann_id}", status_code=204)
async def deactivate_announcement(
    ann_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Announcement).where(Announcement.id == ann_id))
    ann = result.scalars().first()
    if ann:
        ann.is_active = False
        await db.commit()


# Member: active announcements
@router.get("/", response_model=List[AnnouncementOut])
async def get_active_announcements(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Announcement)
        .where(Announcement.is_active == True)
        .order_by(Announcement.created_at.desc())
    )
    return result.scalars().all()
