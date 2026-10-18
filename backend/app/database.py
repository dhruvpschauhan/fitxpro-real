from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

# ── Database URL cleanup ────────────────────────────────────────────────────────
# asyncpg does NOT support the ?ssl=require query parameter — it will fail with
# a DNS / connection error if left in the URL.
# Instead we strip it out here and pass ssl="require" via connect_args below.
_db_url = settings.DATABASE_URL.split("?")[0]  # strip any ?ssl=... suffix

# Only pass SSL connect_args for real PostgreSQL (not local SQLite/aiosqlite)
_is_postgres = _db_url.startswith("postgresql")
_connect_args = {"ssl": "require"} if _is_postgres else {}

engine = create_async_engine(_db_url, echo=False, connect_args=_connect_args)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
AsyncSessionLocal = async_session  # alias used by the scheduler and background tasks

Base = declarative_base()

async def get_db():
    async with async_session() as session:
        yield session
