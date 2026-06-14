import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session
from app.models import User, MembershipPlan, FoodItem
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

async def seed_data():
    async with async_session() as session:
        # Check if admin exists
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.username == 'admin'))
        admin = result.scalars().first()
        if not admin:
            admin = User(
                username='admin',
                password_hash=get_password_hash('Admin@123'),
                full_name='System Admin',
                email='admin@gym.com',
                role='admin'
            )
            session.add(admin)
        
        # Add plans
        plans = [
            ("Monthly", 30, 1200),
            ("Quarterly", 90, 3200),
            ("Half-Yearly", 180, 5800),
            ("Annual", 365, 10000)
        ]
        for name, duration, price in plans:
            result = await session.execute(select(MembershipPlan).where(MembershipPlan.name == name))
            if not result.scalars().first():
                session.add(MembershipPlan(name=name, duration_days=duration, price=price))

        # Add workout plans
        from app.models.extra_models import WorkoutPlan, WorkoutDay, Exercise
        result = await session.execute(select(WorkoutPlan).where(WorkoutPlan.name == 'Push/Pull/Legs (6-Day)'))
        if not result.scalars().first():
            w_plan = WorkoutPlan(name='Push/Pull/Legs (6-Day)', description='Standard PPL Routine', created_by=admin.id)
            session.add(w_plan)
            await session.flush()
            
            day1 = WorkoutDay(plan_id=w_plan.id, day_label='Day 1', focus='Push', sort_order=0)
            session.add(day1)
            await session.flush()
            session.add_all([
                Exercise(workout_day_id=day1.id, name='Barbell Bench Press', sets='4', reps='8-10', rest_seconds=90, sort_order=0),
                Exercise(workout_day_id=day1.id, name='Overhead Press', sets='3', reps='8-12', rest_seconds=90, sort_order=1),
                Exercise(workout_day_id=day1.id, name='Incline Dumbbell Press', sets='3', reps='10-12', rest_seconds=60, sort_order=2)
            ])
            
            day2 = WorkoutDay(plan_id=w_plan.id, day_label='Day 2', focus='Pull', sort_order=1)
            session.add(day2)
            await session.flush()
            session.add_all([
                Exercise(workout_day_id=day2.id, name='Barbell Row', sets='4', reps='8-10', rest_seconds=90, sort_order=0),
                Exercise(workout_day_id=day2.id, name='Lat Pulldown', sets='3', reps='10-12', rest_seconds=60, sort_order=1),
                Exercise(workout_day_id=day2.id, name='Barbell Curls', sets='3', reps='12-15', rest_seconds=60, sort_order=2)
            ])

        await session.commit()
        print("Database seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
