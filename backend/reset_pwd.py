import asyncio
from sqlalchemy import select
from app.database import async_session
from app.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_pwd():
    async with async_session() as s:
        res = await s.execute(select(User).where(User.full_name.ilike('%Dhruv%')))
        user = res.scalars().first()
        if user:
            print(f"Found user: {user.username}")
            # Reset password to 'Dhruv@123'
            user.password_hash = pwd_context.hash('Dhruv@123')
            await s.commit()
            print("Password reset to 'Dhruv@123'")
        else:
            print("User not found.")

if __name__ == "__main__":
    asyncio.run(reset_pwd())
