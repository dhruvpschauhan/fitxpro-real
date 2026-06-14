from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.database import get_db
from app.models import User
from app.models.extra_models import Equipment, EquipmentMaintenanceLog
from app.routers.auth import require_admin

router = APIRouter(prefix="/equipment", tags=["admin-equipment"])


class EquipmentCreate(BaseModel):
    name: str
    category: str | None = None
    serial_number: str | None = None
    purchase_date: str | None = None
    purchase_price: float | None = None
    condition: str = "good"
    notes: str | None = None


class EquipmentOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str | None
    condition: str
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class MaintenanceLogCreate(BaseModel):
    equipment_id: uuid.UUID
    description: str
    cost: float | None = None
    serviced_by: str | None = None


class MaintenanceLogOut(BaseModel):
    id: uuid.UUID
    equipment_id: uuid.UUID
    description: str
    cost: float | None
    serviced_by: str | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[EquipmentOut])
async def list_equipment(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Equipment).order_by(Equipment.name))
    return result.scalars().all()


@router.post("/", response_model=EquipmentOut)
async def add_equipment(
    body: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    eq = Equipment(
        name=body.name,
        category=body.category,
        condition=body.condition,
        notes=body.notes,
    )
    db.add(eq)
    await db.commit()
    await db.refresh(eq)
    return eq


@router.delete("/{eq_id}", status_code=204)
async def delete_equipment(
    eq_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    result = await db.execute(select(Equipment).where(Equipment.id == eq_id))
    eq = result.scalars().first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    await db.delete(eq)
    await db.commit()


@router.post("/logs", response_model=MaintenanceLogOut)
async def add_maintenance_log(
    body: MaintenanceLogCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin)
):
    note_parts = [body.description]
    if body.serviced_by:
        note_parts.append(f"Serviced by: {body.serviced_by}")
    if body.cost:
        note_parts.append(f"Cost: ₹{body.cost}")
    log = EquipmentMaintenanceLog(
        equipment_id=body.equipment_id,
        issue_description="\n".join(note_parts),
        status="resolved",
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    # Return adapted response
    return {
        "id": log.id,
        "equipment_id": log.equipment_id,
        "description": log.issue_description,
        "cost": body.cost,
        "serviced_by": body.serviced_by,
        "created_at": log.reported_at,
    }
