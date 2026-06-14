import asyncio
from sqlalchemy import select
from app.database import async_session
from app.models import User

async def run():
    async with async_session() as s:
        res = await s.execute(select(User))
        users = res.scalars().all()
        print([(u.username, u.password_hash) for u in users])

if __name__ == "__main__":
    asyncio.run(run())
