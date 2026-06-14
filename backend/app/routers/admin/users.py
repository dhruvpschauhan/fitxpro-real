from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid

from app.database import get_db
from app.models import User
from app.routers.auth import require_admin, get_password_hash

router = APIRouter(prefix="/users", tags=["admin-users"])

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: EmailStr
    phone: str | None = None
    role: str = "member"
    profile_photo: str | None = None

class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    email: str
    phone: str | None
    role: str
    is_active: bool
    profile_photo: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[UserResponse])
async def get_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users

@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    # Check if username or email exists
    result = await db.execute(select(User).where((User.username == user.username) | (User.email == user.email)))
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="Username or email already registered")

    new_user = User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        profile_photo=user.profile_photo
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    password: str | None = None
    profile_photo: str | None = None

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: uuid.UUID, user_update: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user_obj = result.scalars().first()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.email and user_update.email != user_obj.email:
        check = await db.execute(select(User).where(User.email == user_update.email))
        if check.scalars().first():
            raise HTTPException(status_code=409, detail="Email already registered")
        user_obj.email = user_update.email

    if user_update.full_name is not None:
        user_obj.full_name = user_update.full_name
    if user_update.phone is not None:
        user_obj.phone = user_update.phone
    if user_update.profile_photo is not None:
        user_obj.profile_photo = user_update.profile_photo
    if user_update.password:
        user_obj.password_hash = get_password_hash(user_update.password)
        
    await db.commit()
    await db.refresh(user_obj)
    return user_obj

