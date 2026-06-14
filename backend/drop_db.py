import asyncio
from app.database import engine
from sqlalchemy import text

async def drop():
    async with engine.begin() as conn:
        await conn.execute(text('DROP TABLE IF EXISTS alembic_version'))
    print("Dropped alembic_version.")

if __name__ == "__main__":
    asyncio.run(drop())
