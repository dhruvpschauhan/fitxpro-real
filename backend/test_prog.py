import asyncio, sys, uuid
sys.path.insert(0, '.')

async def test():
    from app.database import engine
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.models.extra_models import WorkoutProgram, WorkoutDay, Exercise

    async with AsyncSession(engine) as db:
        prog_id = uuid.UUID("6e9535d0-af4b-4eca-931a-a8d95f200397")
        try:
            result = await db.execute(
                select(WorkoutProgram)
                .options(selectinload(WorkoutProgram.days).selectinload(WorkoutDay.exercises))
                .where(WorkoutProgram.id == prog_id)
            )
            prog = result.scalars().first()
            if prog:
                print(f"Program: {prog.name}, days: {len(prog.days)}")
                for d in prog.days:
                    print(f"  Day: {d.day_label}, exercises: {len(d.exercises)}")
            else:
                print("Not found")
        except Exception as e:
            import traceback; traceback.print_exc()

asyncio.run(test())
