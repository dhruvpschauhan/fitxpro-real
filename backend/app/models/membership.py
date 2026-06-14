import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, Date, ForeignKey, Text, func
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database import Base

class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    plan_id = Column(Uuid, ForeignKey('membership_plans.id'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(50), default='active')
    frozen_on = Column(Date)
    freeze_reason = Column(Text)
    amount_paid = Column(Numeric(10,2))
    payment_mode = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="memberships")
    plan = relationship("MembershipPlan")
