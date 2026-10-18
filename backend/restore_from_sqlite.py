import os
import sys
import uuid
import sqlite3
import asyncio
from datetime import datetime, date
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models import (
    User, MembershipPlan, Membership, Announcement, Equipment, Expense,
    Lead, ExerciseLibrary, WorkoutPlan, WorkoutProgram, WorkoutDay,
    Exercise, UserProfile, BodyMetric, UserProgramSelection
)

def clean_value(val, col_name):
    if val is None:
        return None
    # Parse UUIDs
    if col_name == 'id' or col_name.endswith('_id') or col_name in ('created_by', 'recorded_by', 'assigned_to'):
        try:
            return uuid.UUID(str(val))
        except (ValueError, TypeError):
            return val
    # Parse booleans
    if col_name in ('is_active', 'is_published'):
        return bool(val)
    # Parse dates
    if col_name in ('start_date', 'end_date', 'frozen_on', 'expense_date', 'purchase_date', 'last_serviced', 'next_service_due', 'follow_up_date', 'log_date'):
        if isinstance(val, str):
            try:
                return datetime.strptime(val.split('T')[0], '%Y-%m-%d').date()
            except ValueError:
                return val
    # Parse timestamps
    if col_name in ('created_at', 'updated_at', 'expires_at', 'reported_at', 'resolved_at', 'assigned_at', 'selected_at', 'sent_at'):
        if isinstance(val, str):
            try:
                clean_str = val.replace('Z', '')
                if '.' in clean_str:
                    return datetime.fromisoformat(clean_str)
                return datetime.strptime(clean_str, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return val
    return val

MODEL_TABLES = [
    ('users', User),
    ('membership_plans', MembershipPlan),
    ('memberships', Membership),
    ('announcements', Announcement),
    ('equipment', Equipment),
    ('expenses', Expense),
    ('leads', Lead),
    ('exercise_library', ExerciseLibrary),
    ('workout_plans', WorkoutPlan),
    ('workout_programs', WorkoutProgram),
    ('workout_days', WorkoutDay),
    ('exercises', Exercise),
    ('user_profiles', UserProfile),
    ('body_metrics', BodyMetric),
    ('user_program_selections', UserProgramSelection)
]

def find_sqlite_file(sqlite_path: str = None) -> str:
    candidates = [
        sqlite_path,
        os.path.join(os.path.dirname(__file__), "gymdb.sqlite"),
        os.path.join(os.getcwd(), "gymdb.sqlite"),
        os.path.join(os.getcwd(), "backend", "gymdb.sqlite")
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return os.path.abspath(p)
    raise FileNotFoundError("Could not find gymdb.sqlite file.")

async def run_sqlite_restore(session: AsyncSession = None, sqlite_path: str = None) -> dict:
    db_file = find_sqlite_file(sqlite_path)
    sqlite_conn = sqlite3.connect(db_file)
    c = sqlite_conn.cursor()

    should_close_session = False
    if session is None:
        from app.database import async_session
        session = async_session()
        should_close_session = True

    summary = {}
    total_count = 0

    try:
        for table_name, model_cls in MODEL_TABLES:
            try:
                c.execute(f"SELECT * FROM {table_name}")
                cols = [d[0] for d in c.description]
                rows = [dict(zip(cols, r)) for r in c.fetchall()]
                for r in rows:
                    cleaned = {k: clean_value(v, k) for k, v in r.items()}
                    obj = model_cls(**cleaned)
                    await session.merge(obj)
                await session.flush()
                summary[table_name] = len(rows)
                total_count += len(rows)
            except Exception as e:
                print(f"Warning importing table {table_name}: {e}")
                summary[table_name] = f"error: {str(e)}"
        
        await session.commit()
    finally:
        sqlite_conn.close()
        if should_close_session:
            await session.close()

    return {
        "status": "success",
        "message": f"Successfully restored {total_count} records from gymdb.sqlite into the database!",
        "records_imported": summary,
        "total_records": total_count
    }

async def cli_main():
    custom_url = sys.argv[1] if len(sys.argv) > 1 else None
    if custom_url:
        target_url = custom_url.strip()
        if target_url.startswith("postgres://"):
            target_url = "postgresql+asyncpg://" + target_url[len("postgres://"):]
        elif target_url.startswith("postgresql://"):
            target_url = "postgresql+asyncpg://" + target_url[len("postgresql://"):]
        target_url = target_url.split("?")[0]
        
        is_pg = "postgresql" in target_url
        connect_args = {"ssl": "require"} if is_pg else {}
        
        print(f"Connecting to custom database: {target_url.split('@')[-1] if '@' in target_url else target_url}")
        engine = create_async_engine(target_url, echo=False, connect_args=connect_args)
        session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with session_factory() as session:
            result = await run_sqlite_restore(session=session)
        await engine.dispose()
    else:
        print("Using default configured database from app.database...")
        from app.database import async_session
        async with async_session() as session:
            result = await run_sqlite_restore(session=session)

    print("\nRestore Result:")
    print(f"Status: {result['status']}")
    print(f"Total: {result['total_records']} rows")
    for tbl, count in result['records_imported'].items():
        print(f"  - {tbl}: {count}")

if __name__ == "__main__":
    asyncio.run(cli_main())
