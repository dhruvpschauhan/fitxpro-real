import uuid
from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class User(Base):
    __tablename__ = "users"

    # For SQLite compatibility we can use String(36) to store UUIDs, but since Alembic might complain, we can map UUID to String in sqlite.
    # Alternatively, use sqlalchemy.types.Uuid
    from sqlalchemy.types import Uuid
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(15))
    role = Column(String(20), default='member') # 'admin' or 'member'
    profile_photo = Column(String(1000000), nullable=True) # Text column for base64 image
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    memberships = relationship("Membership", back_populates="user", cascade="all, delete-orphan")
