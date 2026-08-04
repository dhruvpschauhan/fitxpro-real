import asyncio
import uuid
import random
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from passlib.context import CryptContext
from app.database import async_session
from app.models import User, MembershipPlan, Membership

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

indian_names = [
    ("Aarav Sharma", "aarav.sharma@example.com", "9876543210"),
    ("Vihaan Patel", "vihaan.p@example.com", "9876543211"),
    ("Aditya Singh", "aditya.singh99@example.com", "9876543212"),
    ("Sai Kumar", "sai.kumar.fit@example.com", "9876543213"),
    ("Arjun Reddy", "arjun.reddy@example.com", "9876543214"),
    ("Rohan Gupta", "rohan.gupta@example.com", "9876543215"),
    ("Krishna Iyer", "krishna.iyer@example.com", "9876543216"),
    ("Rahul Verma", "rahul.verma@example.com", "9876543217"),
    ("Amit Desai", "amit.desai@example.com", "9876543218"),
    ("Vikram Malhotra", "vikram.m@example.com", "9876543219"),
    ("Ananya Joshi", "ananya.joshi@example.com", "9876543220"),
    ("Diya Kapoor", "diya.kapoor@example.com", "9876543221"),
    ("Neha Agarwal", "neha.agarwal@example.com", "9876543222"),
    ("Sneha Rao", "sneha.rao@example.com", "9876543223"),
    ("Pooja Mehra", "pooja.mehra@example.com", "9876543224")
]

async def replace_members():
    async with async_session() as session:
        # 1. Delete previous Demo accounts
        print("Deleting demo accounts...")
        result = await session.execute(select(User).where(User.email.like('demo%@gym.com')))
        demo_users = result.scalars().all()
        for user in demo_users:
            await session.delete(user)
        await session.flush()

        # Get "Monthly" plan
        result = await session.execute(select(MembershipPlan).where(MembershipPlan.name == 'Monthly'))
        plan = result.scalars().first()
        
        if not plan:
            print("Monthly plan not found, creating it...")
            plan = MembershipPlan(name="Monthly", duration_days=30, price=1200)
            session.add(plan)
            await session.flush()
        
        # 2. Add 15 new Indian users
        password_hash = get_password_hash("password")
        today = date.today()
        end_date = today + timedelta(days=plan.duration_days)
        
        print("Adding 15 new members with real names...")
        
        for full_name, email, phone in indian_names:
            # simple username generation: first name + random number
            first_name = full_name.split()[0].lower()
            username = f"{first_name}_{random.randint(100, 999)}"
            
            # Check if user already exists
            res = await session.execute(select(User).where(User.email == email))
            existing_user = res.scalars().first()
            if existing_user:
                continue

            user = User(
                username=username,
                password_hash=password_hash,
                full_name=full_name,
                email=email,
                phone=phone,
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
        print("Demo accounts removed and 15 realistic members added successfully!")

if __name__ == "__main__":
    asyncio.run(replace_members())
