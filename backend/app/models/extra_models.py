import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, Date, ForeignKey, Text, JSON
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy import func

class NotificationLog(Base):
    __tablename__ = "notification_log"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey('users.id'))
    trigger_reason = Column(String(100))
    sent_at = Column(DateTime, default=func.now())
    status = Column(String(50))
    recipient_email = Column(String(150), nullable=False)
    error_message = Column(Text)
    triggered_by = Column(Uuid, ForeignKey('users.id'), nullable=True)

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    category = Column(String(100))
    amount = Column(Numeric(10,2), nullable=False)
    description = Column(Text)
    expense_date = Column(Date, nullable=False)
    recorded_by = Column(Uuid, ForeignKey('users.id'))
    created_at = Column(DateTime, default=func.now())

class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    category = Column(String(100))
    purchase_date = Column(Date)
    condition = Column(String(50), default='good')
    last_serviced = Column(Date)
    next_service_due = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    logs = relationship("EquipmentMaintenanceLog", back_populates="equipment")

class EquipmentMaintenanceLog(Base):
    __tablename__ = "equipment_maintenance_log"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    equipment_id = Column(Uuid, ForeignKey('equipment.id'))
    issue_description = Column(Text, nullable=False)
    severity = Column(String(50))
    reported_by = Column(Uuid, ForeignKey('users.id'))
    reported_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime)
    resolved_by = Column(Uuid, ForeignKey('users.id'))
    resolution_note = Column(Text)
    status = Column(String(50), default='open')
    
    equipment = relationship("Equipment", back_populates="logs")

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    phone = Column(String(15))
    email = Column(String(150))
    source = Column(String(50))
    status = Column(String(50), default='new')
    notes = Column(Text)
    follow_up_date = Column(Date)
    assigned_to = Column(Uuid, ForeignKey('users.id'))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(Uuid, ForeignKey('users.id'))
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)

class WorkoutPlan(Base):
    __tablename__ = "workout_plans"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_by = Column(Uuid, ForeignKey('users.id'))
    created_at = Column(DateTime, default=func.now())
    days = relationship("WorkoutDay", back_populates="plan", cascade="all, delete-orphan",
                        foreign_keys="WorkoutDay.plan_id")

class WorkoutProgram(Base):
    __tablename__ = "workout_programs"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(150), nullable=False)
    description = Column(Text)
    difficulty = Column(String(20), default='beginner')   # beginner/intermediate/advanced
    goal_tag = Column(String(30), default='general_fitness')  # strength/fat_loss/endurance/hypertrophy/general_fitness
    is_published = Column(Boolean, default=False)
    created_by = Column(Uuid, ForeignKey('users.id'))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    days = relationship("WorkoutDay", back_populates="program", cascade="all, delete-orphan",
                        foreign_keys="WorkoutDay.program_id")

class WorkoutDay(Base):
    __tablename__ = "workout_days"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    # Legacy FK (old system)
    plan_id = Column(Uuid, ForeignKey('workout_plans.id', ondelete='CASCADE'), nullable=True)
    # New FK (new system)
    program_id = Column(Uuid, ForeignKey('workout_programs.id', ondelete='CASCADE'), nullable=True)
    day_label = Column(String(100), nullable=False)
    focus = Column(String(150))
    sort_order = Column(Integer, default=0)
    week_day = Column(String(20), nullable=True)   # Monday … Sunday, or None
    plan = relationship("WorkoutPlan", back_populates="days", foreign_keys=[plan_id])
    program = relationship("WorkoutProgram", back_populates="days", foreign_keys=[program_id])
    exercises = relationship("Exercise", back_populates="day", cascade="all, delete-orphan")

class ExerciseLibrary(Base):
    __tablename__ = "exercise_library"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(150), nullable=False, unique=True)
    category = Column(String(100), nullable=False)
    muscle_group = Column(String(100), nullable=False)
    created_by = Column(Uuid, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=func.now())


class Exercise(Base):
    __tablename__ = "exercises"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    workout_day_id = Column(Uuid, ForeignKey('workout_days.id', ondelete='CASCADE'))
    library_id = Column(Uuid, ForeignKey('exercise_library.id', ondelete='SET NULL'), nullable=True)
    name = Column(String(150), nullable=False)
    sets = Column(String(20))        # free text: "4", "3-4"
    reps = Column(String(50))        # free text: "8", "12-15", "AMRAP", "60 sec"
    rest_seconds = Column(Integer)
    notes = Column(Text)
    sort_order = Column(Integer, default=0)
    day = relationship("WorkoutDay", back_populates="exercises")

class UserPlanAssignment(Base):
    __tablename__ = "user_plan_assignments"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey('users.id', ondelete='CASCADE'))
    plan_id = Column(Uuid, ForeignKey('workout_plans.id'))
    assigned_by = Column(Uuid, ForeignKey('users.id'))
    assigned_at = Column(DateTime, default=func.now())
    is_active = Column(Boolean, default=True)

class UserProgramSelection(Base):
    __tablename__ = "user_program_selections"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    program_id = Column(Uuid, ForeignKey('workout_programs.id'))
    selected_at = Column(DateTime, default=func.now())
    program = relationship("WorkoutProgram")


class StrengthLog(Base):
    __tablename__ = "strength_logs"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey('users.id', ondelete='CASCADE'))

    exercise_name = Column(String(100), nullable=False)
    log_date = Column(Date, nullable=False)
    sets_data = Column(JSON, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())

class BodyMetric(Base):
    __tablename__ = "body_metrics"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey('users.id', ondelete='CASCADE'))
    log_date = Column(Date, nullable=False)
    body_weight_kg = Column(Numeric(5,2))
    goal_type = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    age = Column(Integer)
    height_cm = Column(Numeric(5,2))
    weight_kg = Column(Numeric(5,2))
    gender = Column(String(50))
    activity_level = Column(String(50))
    goal_type = Column(String(50))
    diet_preference = Column(String(50))
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class FoodItem(Base):
    __tablename__ = "food_items"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(150), nullable=False)
    category = Column(String(100))
    diet_type = Column(String(50))
    serving_unit = Column(String(50))
    calories = Column(Numeric(7,2), nullable=False)
    protein_g = Column(Numeric(7,2), nullable=False)
    carbs_g = Column(Numeric(7,2), nullable=False)
    fat_g = Column(Numeric(7,2), nullable=False)
    fiber_g = Column(Numeric(7,2))
    is_active = Column(Boolean, default=True)

class MealLog(Base):
    __tablename__ = "meal_logs"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey('users.id', ondelete='CASCADE'))
    log_date = Column(Date, nullable=False)
    meal_type = Column(String(50))
    food_item_id = Column(Uuid, ForeignKey('food_items.id'))
    quantity = Column(Numeric(7,2), nullable=False)
    unit = Column(String(50))
    calories = Column(Numeric(7,2), nullable=False)
    protein_g = Column(Numeric(7,2), nullable=False)
    carbs_g = Column(Numeric(7,2), nullable=False)
    fat_g = Column(Numeric(7,2), nullable=False)
    created_at = Column(DateTime, default=func.now())
