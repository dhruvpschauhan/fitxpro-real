"""add exercise library and library_id

Revision ID: 2a_add_exercise_library
Revises: 1ebbe3eec40a
Create Date: 2026-06-10 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import uuid
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '2a_add_exercise_library'
down_revision = '1ebbe3eec40a'
branch_labels = None
depends_on = None

SEED_DATA = [
    # Push
    ("Bench Press", "Push", "Chest"),
    ("Incline Dumbbell Press", "Push", "Chest"),
    ("Decline Bench Press", "Push", "Chest"),
    ("Overhead Press", "Push", "Shoulders"),
    ("Arnold Press", "Push", "Shoulders"),
    ("Lateral Raise", "Push", "Shoulders"),
    ("Front Raise", "Push", "Shoulders"),
    ("Tricep Pushdown", "Push", "Triceps"),
    ("Skull Crushers", "Push", "Triceps"),
    ("Close Grip Bench Press", "Push", "Triceps"),
    ("Dips", "Push", "Triceps"),
    ("Cable Fly", "Push", "Chest"),
    ("Pec Deck", "Push", "Chest"),
    ("Push Up", "Push", "Chest"),
    # Pull
    ("Deadlift", "Pull", "Back"),
    ("Barbell Row", "Pull", "Back"),
    ("Lat Pulldown", "Pull", "Back"),
    ("Seated Cable Row", "Pull", "Back"),
    ("Pull Up", "Pull", "Back"),
    ("Chin Up", "Pull", "Back"),
    ("Single Arm Dumbbell Row", "Pull", "Back"),
    ("Face Pull", "Pull", "Shoulders"),
    ("Barbell Curl", "Pull", "Biceps"),
    ("Dumbbell Curl", "Pull", "Biceps"),
    ("Hammer Curl", "Pull", "Biceps"),
    ("Preacher Curl", "Pull", "Biceps"),
    ("Cable Curl", "Pull", "Biceps"),
    ("Shrugs", "Pull", "Back"),
    # Legs
    ("Squat", "Legs", "Quads"),
    ("Front Squat", "Legs", "Quads"),
    ("Leg Press", "Legs", "Quads"),
    ("Hack Squat", "Legs", "Quads"),
    ("Leg Extension", "Legs", "Quads"),
    ("Romanian Deadlift", "Legs", "Hamstrings"),
    ("Leg Curl", "Legs", "Hamstrings"),
    ("Nordic Curl", "Legs", "Hamstrings"),
    ("Hip Thrust", "Legs", "Glutes"),
    ("Bulgarian Split Squat", "Legs", "Glutes"),
    ("Glute Bridge", "Legs", "Glutes"),
    ("Walking Lunges", "Legs", "Quads"),
    ("Calf Raise", "Legs", "Calves"),
    ("Seated Calf Raise", "Legs", "Calves"),
    # Core
    ("Plank", "Core", "Abs"),
    ("Cable Crunch", "Core", "Abs"),
    ("Hanging Leg Raise", "Core", "Abs"),
    ("Ab Wheel Rollout", "Core", "Abs"),
    ("Russian Twist", "Core", "Abs"),
    ("Crunches", "Core", "Abs"),
    ("Side Plank", "Core", "Abs"),
    ("Pallof Press", "Core", "Abs"),
    ("Decline Sit Up", "Core", "Abs"),
    # Cardio
    ("Treadmill Run", "Cardio", "Full Body"),
    ("Rowing Machine", "Cardio", "Full Body"),
    ("Assault Bike", "Cardio", "Full Body"),
    ("Jump Rope", "Cardio", "Full Body"),
    ("Stair Climber", "Cardio", "Full Body"),
    ("Cycling", "Cardio", "Full Body"),
    ("Burpees", "Cardio", "Full Body"),
    ("Battle Ropes", "Cardio", "Full Body"),
    # Full Body / Olympic
    ("Kettlebell Swing", "Full Body", "Full Body"),
    ("Clean and Press", "Full Body", "Full Body"),
    ("Thruster", "Full Body", "Full Body"),
    ("Box Jump", "Full Body", "Full Body"),
    ("Farmer's Carry", "Full Body", "Full Body"),
    ("Snatch", "Full Body", "Full Body"),
    ("Power Clean", "Full Body", "Full Body"),
    ("Turkish Get Up", "Full Body", "Full Body"),
]


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)

    # 1. Create exercise_library table
    if not insp.has_table("exercise_library"):
        op.create_table(
            "exercise_library",
            sa.Column("id", sa.String(32), primary_key=True),
            sa.Column("name", sa.String(150), unique=True, nullable=False),
            sa.Column("category", sa.String(100), nullable=False),
            sa.Column("muscle_group", sa.String(100), nullable=False),
            sa.Column("created_by", sa.String(36), nullable=True),
            sa.Column("created_at", sa.DateTime(), default=datetime.utcnow)
        )

        # 2. Seed data
        now = datetime.utcnow()
        for name, category, muscle_group in SEED_DATA:
            conn.execute(sa.text(
                "INSERT INTO exercise_library (id, name, category, muscle_group, created_at) "
                "VALUES (:id, :name, :category, :muscle_group, :now)"
            ), {"id": uuid.uuid4().hex, "name": name, "category": category, "muscle_group": muscle_group, "now": now})

    # 3. Add library_id to exercises
    if "exercises" in insp.get_table_names():
        columns = [col['name'] for col in insp.get_columns("exercises")]
        if 'library_id' not in columns:
            with op.batch_alter_table('exercises', schema=None) as batch_op:
                batch_op.add_column(sa.Column('library_id', sa.String(32), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if "exercises" in insp.get_table_names():
        columns = [col['name'] for col in insp.get_columns("exercises")]
        if 'library_id' in columns:
            with op.batch_alter_table('exercises', schema=None) as batch_op:
                batch_op.drop_column('library_id')
    if insp.has_table("exercise_library"):
        op.drop_table("exercise_library")
