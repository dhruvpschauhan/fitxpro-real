import sqlite3, os
db_path = 'gymdb.sqlite'
if not os.path.exists(db_path):
    print(f'DB not found at {db_path}, listing files:')
    print(os.listdir('.'))
    exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print('Tables:', tables)

c.execute('PRAGMA table_info(workout_days)')
cols = [(r[0], r[1]) for r in c.fetchall()]
print('workout_days cols:', cols)

# Add program_id if missing
col_names = [r[1] for r in cols]
if 'program_id' not in col_names:
    c.execute('ALTER TABLE workout_days ADD COLUMN program_id TEXT REFERENCES workout_programs(id)')
    conn.commit()
    print('Added program_id to workout_days')
else:
    print('program_id already exists')

conn.close()
print('Done')
