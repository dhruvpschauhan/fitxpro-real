from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from datetime import date, datetime
import uuid

from app.database import get_db
from app.models import User
from app.models.extra_models import Lead
from app.routers.auth import require_admin

router = APIRouter(prefix="/leads", tags=["admin-leads"])

VALID_STATUSES = ["new", "contacted", "interested", "converted", "lost"]


class LeadCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    source: str | None = None
    notes: str | None = None
    follow_up_date: date | None = None


class LeadUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None
    follow_up_date: date | None = None


class LeadOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    source: str | None
    status: str
    notes: str | None
    follow_up_date: date | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[LeadOut])
async def list_leads(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Lead).order_by(Lead.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=LeadOut)
async def create_lead(
    body: LeadCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    lead = Lead(**body.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: uuid.UUID,
    body: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if body.status and body.status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {VALID_STATUSES}")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    await db.commit()
    await db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()
