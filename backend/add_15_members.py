import asyncio
import uuid
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.database import async_session
from app.models import User, MembershipPlan, Membership

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

async def add_15_members():
    async with async_session() as session:
        # Get "Monthly" plan
        result = await session.execute(select(MembershipPlan).where(MembershipPlan.name == 'Monthly'))
        plan = result.scalars().first()
        
        if not plan:
            print("Monthly plan not found, creating it...")
            plan = MembershipPlan(name="Monthly", duration_days=30, price=1200)
            session.add(plan)
            await session.flush()
        
        # We need to add 15 users
        password_hash = get_password_hash("password")
        today = date.today()
        end_date = today + timedelta(days=plan.duration_days)
        
        print("Adding 15 members...")
        
        for i in range(1, 16):
            username = f"member_{uuid.uuid4().hex[:6]}"
            user = User(
                username=username,
                password_hash=password_hash,
                full_name=f"Demo Member {i}",
                email=f"demo{i}@gym.com",
                phone=f"555-01{i:02d}",
                role="member"
            )
            session.add(user)
            await session.flush()
            
            # Add membership
            membership = Membership(
                user_id=user.id,
                plan_id=plan.id,
                start_date=today,
                end_date=end_date,
                status="active",
                amount_paid=plan.price,
                payment_mode="Cash"
            )
            session.add(membership)
            
        await session.commit()
        print("15 members and their monthly memberships added successfully!")

if __name__ == "__main__":
    asyncio.run(add_15_members())
