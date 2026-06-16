import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import Base
from app.config import settings
import app.models.extra_models  # ensure all models are imported

async def create_tables():
    print(f"Creating missing tables in {settings.DATABASE_URL} ...")
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(create_tables())
