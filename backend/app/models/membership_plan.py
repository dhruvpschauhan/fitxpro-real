import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, Text, func
from sqlalchemy.types import Uuid
from app.database import Base

class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    duration_days = Column(Integer, nullable=False)
    price = Column(Numeric(10,2), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
