import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Layers, ArrowRight, ArrowLeft, Database, Server, Cpu, ShieldCheck, Mail,
  Dumbbell, Utensils, CheckCircle2, FileCode, Play, RotateCcw, Info,
  Code2, ExternalLink, Lock, Flame, Sparkles, ChevronRight, Hash
} from 'lucide-react'
import useAuthStore from '../store/authStore'

// ─────────────────────────────────────────────────────────────────────────────
// DATA: WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────

const WORKFLOWS = [
  {
    id: 'auth',
    title: '1. Authentication & JWT Lifecycle',
    subtitle: 'From user typing credentials to stored JWT and protected route access',
    badge: 'Security & State',
    steps: [
      {
        step: 1,
        title: 'User Submits Credentials on Frontend',
        file: 'frontend/src/pages/Login.jsx',
        actor: 'Client (React)',
        description:
          'The user fills in username and password. The handleSubmit event calls login(username, password) from the Zustand auth store.',
        code: `// frontend/src/pages/Login.jsx
const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)
  try {
    const role = await login(username, password)
    // Redirect based on role extracted from JWT
    navigate(role === 'admin' ? '/admin' : '/app', { replace: true })
  } catch (err) {
    setError(err.response?.data?.detail || 'Invalid credentials')
  }
}`,
        output: 'Triggers Zustand action login() with urlencoded payload.',
        proTip: 'Using OAuth2 form urlencoded payload adheres directly to FastAPI OAuth2PasswordRequestForm standard.'
      },
      {
        step: 2,
        title: 'Zustand Store Dispatches POST Request',
        file: 'frontend/src/store/authStore.js',
        actor: 'Client State (Zustand)',
        description:
          'Zustand formats credentials into URLSearchParams and sends a POST request via axios client to /api/v1/auth/login.',
        code: `// frontend/src/store/authStore.js
login: async (username, password) => {
  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)

  const response = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })

  const token = response.data.access_token
  const payload = decodeJwt(token)

  set({
    accessToken: token,
    user: { username: payload.sub, role: payload.role },
    isAuthenticated: true
  })
  return payload.role
}`,
        output: 'HTTP POST /api/v1/auth/login dispatched with body { username, password }',
        proTip: 'The persist middleware automatically writes this state to localStorage under "auth-storage".'
      },
      {
        step: 3,
        title: 'Rate Limiter Intercepts Incoming IP',
        file: 'backend/app/routers/auth.py & app/limiter.py',
        actor: 'Backend Middleware',
        description:
          'FastAPI receives the request. The @limiter.limit("5/minute") decorator checks the client IP address extracted via request: Request.',
        code: `// backend/app/routers/auth.py
@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    # If client exceeds 5 calls/min, slowapi returns HTTP 429 Too Many Requests`,
        output: 'Rate limiter verifies client has < 5 requests in current minute window.',
        proTip: 'request: Request is required in the signature so slowapi can retrieve the remote IP or X-Forwarded-For header.'
      },
      {
        step: 4,
        title: 'User Verified & Password Hashed with Bcrypt',
        file: 'backend/app/routers/auth.py',
        actor: 'Backend Service & Database',
        description:
          'The database queries User where User.username == form_data.username. Bcrypt compares the plain text password against the hashed string.',
        code: `// backend/app/routers/auth.py
result = await db.execute(select(User).where(User.username == form_data.username))
user = result.scalars().first()

if not user or not verify_password(form_data.password, user.password_hash):
    raise HTTPException(status_code=401, detail="Incorrect username or password")

access_token = create_access_token(
    data={"sub": user.username, "role": user.role},
    expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
)
return {"access_token": access_token, "token_type": "bearer"}`,
        output: 'JSON response: { "access_token": "eyJhbGciOi...", "token_type": "bearer" }',
        proTip: 'The token encodes {"sub": "dhruv", "role": "admin"} signed with HS256 secret key.'
      },
      {
        step: 5,
        title: 'Axios Interceptor Attaches Token to Subsequent Calls',
        file: 'frontend/src/api/client.js',
        actor: 'Client Network Layer',
        description:
          'Every subsequent API call automatically reads the token from localStorage and injects Authorization: Bearer <token>.',
        code: `// frontend/src/api/client.js
client.interceptors.request.use(config => {
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    const parsed = JSON.parse(authStorage)
    const token = parsed?.state?.accessToken
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`
    }
  }
  return config
})`,
        output: 'Headers: { Authorization: "Bearer eyJhbGciOi..." } attached to all requests.',
        proTip: 'If a 401 response ever comes back, the response interceptor wipes localStorage and redirects to /login.'
      }
    ]
  },
  {
    id: 'expiry',
    title: '2. Membership Expiry & Background Email Scheduler',
    subtitle: 'How memberships expire automatically and trigger transactional alert emails',
    badge: 'Background Jobs',
    steps: [
      {
        step: 1,
        title: 'APScheduler Initializes with FastAPI Lifespan',
        file: 'backend/main.py & app/scheduler.py',
        actor: 'Asyncio Scheduler',
        description:
          'When FastAPI starts up, lifespan(app) starts the AsyncIOScheduler running cron jobs in the background.',
        code: `// backend/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()  # <── Kicks off APScheduler
    yield
    stop_scheduler()

// backend/app/scheduler.py
def start_scheduler():
    # Runs daily at midnight 00:00:
    scheduler.add_job(expire_overdue_memberships, CronTrigger(hour=0, minute=0))
    # Runs daily alert emails at 08:00 AM:
    scheduler.add_job(send_daily_expiry_alerts, CronTrigger(hour=8, minute=0))
    scheduler.start()`,
        output: 'Cron triggers scheduled in background event loop without blocking HTTP requests.',
        proTip: 'AsyncIOScheduler integrates directly into Python’s native asyncio event loop.'
      },
      {
        step: 2,
        title: 'Querying Active Memberships Expiring at Thresholds',
        file: 'backend/app/jobs/expiry_checker.py',
        actor: 'SQLAlchemy Async Engine',
        description:
          'The job calculates target dates for 7, 3, 1, and 0 days until expiry and queries the memberships table.',
        code: `// backend/app/jobs/expiry_checker.py
thresholds = [7, 3, 1, 0] # 0 = expires today

for days in thresholds:
    target_date = today + timedelta(days=days)
    trigger_reason = f"{days}_day_expiry" if days > 0 else "expired"

    # Eager load user and plan with selectinload to prevent N+1 queries!
    stmt = (
        select(Membership)
        .options(selectinload(Membership.user), selectinload(Membership.plan))
        .where(
            and_(
                Membership.end_date == target_date,
                Membership.status.in_(["active", "expired"])
            )
        )
    )`,
        output: 'Returns list of matching memberships with user email and plan details.',
        proTip: 'selectinload fetches related user and plan rows in a single batch query.'
      },
      {
        step: 3,
        title: 'Deduplication Check via NotificationLog Table',
        file: 'backend/app/jobs/expiry_checker.py',
        actor: 'Database Audit Log',
        description:
          'Before sending an email, check_notification_log verifies whether this user was already sent this alert today.',
        code: `// backend/app/jobs/expiry_checker.py
already_sent = await check_notification_log(db, user.id, trigger_reason, today)
if already_sent:
    continue # Skip to avoid spamming the gym member!`,
        output: 'Boolean result: True = skip, False = proceed to send.',
        proTip: 'This idempotency check ensures server restarts do not trigger duplicate reminder emails.'
      },
      {
        step: 4,
        title: 'Render HTML Template & Send via Resend API',
        file: 'backend/app/jobs/expiry_checker.py',
        actor: 'External Email Service',
        description:
          'The HTML template is generated with member name and expiry date, then sent via Resend REST API.',
        code: `// backend/app/jobs/expiry_checker.py
template = get_email_template(trigger_reason, {
    "full_name": user.full_name,
    "plan_name": membership.plan.name,
    "expiry_date": membership.end_date.strftime("%d %B %Y")
})

try:
    resend.Emails.send({
        "from": settings.EMAIL_FROM,
        "to": [user.email],
        "subject": template["subject"],
        "html": template["html"]
    })
    await log_notification(db, user.id, trigger_reason, user.email, "sent")
except Exception as e:
    await log_notification(db, user.id, trigger_reason, user.email, "failed", error=str(e))`,
        output: 'Email delivered to user inbox; NotificationLog saved with status "sent".',
        proTip: 'If Resend fails or errors, it logs "failed" with the exact error message for admin inspection.'
      }
    ]
  },
  {
    id: 'workout',
    title: '3. Workout Builder to Member Daily Routine',
    subtitle: 'From Admin creating multi-day routines to Member selecting & doing today workout',
    badge: 'Core Business Logic',
    steps: [
      {
        step: 1,
        title: 'Admin Builds Routine in WorkoutBuilder',
        file: 'frontend/src/pages/admin/WorkoutBuilder.jsx',
        actor: 'Admin UI',
        description:
          'Admin structures Days (Day 1 - Push, Day 2 - Pull) and attaches Exercises (Bench Press, 3 sets x 8-12 reps, 90s rest).',
        code: `// frontend/src/pages/admin/WorkoutBuilder.jsx
const handleSave = async () => {
  const payload = {
    name: program.name,
    difficulty: program.difficulty,
    days: program.days.map((d, dIdx) => ({
      day_label: d.day_label,
      focus: d.focus,
      sort_order: dIdx,
      exercises: d.exercises.map((ex, eIdx) => ({
        name: ex.name,
        sets: String(ex.sets),
        reps: String(ex.reps),
        rest_seconds: Number(ex.rest_seconds),
        sort_order: eIdx
      }))
    }))
  }
  await api.post('/admin/workout-programs', payload)
}`,
        output: 'Nested JSON program payload sent to admin router.',
        proTip: 'Nested Pydantic models validate all 3 levels (Program -> Days -> Exercises) in one request.'
      },
      {
        step: 2,
        title: 'Backend Persists Relational Hierarchy',
        file: 'backend/app/routers/admin/workout_programs.py',
        actor: 'SQLAlchemy Database',
        description:
          'FastAPI receives the nested payload, creates a WorkoutProgram row, flushes for the ID, creates WorkoutDay rows, and links Exercise rows.',
        code: `// backend/app/routers/admin/workout_programs.py
prog = WorkoutProgram(name=body.name, difficulty=body.difficulty, created_by=current_user.id)
db.add(prog)
await db.flush() # Generates prog.id

for d_in in body.days:
    day = WorkoutDay(program_id=prog.id, day_label=d_in.day_label)
    db.add(day)
    await db.flush()
    for ex_in in d_in.exercises:
        db.add(Exercise(workout_day_id=day.id, name=ex_in.name, sets=ex_in.sets, reps=ex_in.reps))

await db.commit()`,
        output: 'Database stores 1 WorkoutProgram + N WorkoutDay + M Exercise rows with Foreign Keys.',
        proTip: 'Foreign key cascading ensures if a program or day is deleted, child exercises are cleaned up cleanly.'
      },
      {
        step: 3,
        title: 'Member Selects Program in Member Portal',
        file: 'backend/app/routers/user/workout.py & UserProgramSelection',
        actor: 'Member Portal',
        description:
          'When a member clicks "Select Program", a UserProgramSelection record is created with selected_at timestamp.',
        code: `// backend/app/routers/user/workout.py
@router.post("/select-program")
async def select_program(
    body: SelectProgramIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    selection = await _get_selection(current_user.id, db)
    if selection:
        selection.program_id = body.program_id
        selection.selected_at = func.now()
    else:
        selection = UserProgramSelection(
            user_id=current_user.id,
            program_id=body.program_id
        )
        db.add(selection)
    await db.commit()`,
        output: 'Stores current active program reference for this user ID.',
        proTip: 'Recording selected_at allows dynamic calculation of which day of the routine is active today.'
      },
      {
        step: 4,
        title: 'Dynamic Calculation of "Today\'s Workout"',
        file: 'backend/app/routers/user/workout.py & TodayWorkout.jsx',
        actor: 'Calculation Engine',
        description:
          'The endpoint calculates days elapsed since selected_at using modulo arithmetic over total routine days.',
        code: `// backend/app/routers/user/workout.py
@router.get("/today-workout", response_model=TodayWorkout)
async def get_today_workout(...):
    # Days elapsed since program was activated
    days_elapsed = (date.today() - selection.selected_at.date()).days
    total_days = len(program.days)
    day_index = days_elapsed % total_days  # Loops back to Day 1 after routine finishes
    todays_day = sorted_days[day_index]

    return {
        "status": "ok",
        "day_label": todays_day.day_label,
        "focus": todays_day.focus,
        "day_number": day_index + 1,
        "exercises": todays_day.exercises
    }`,
        output: 'TodayWorkout.jsx renders the exact exercises, sets, reps, and rest timers for today!',
        proTip: 'Modulo arithmetic (days_elapsed % total_days) creates an infinite recurring training cycle!'
      }
    ]
  },
  {
    id: 'nutrition',
    title: '4. Nutrition & Dynamic Macro Engine',
    subtitle: 'From user fitness stats to Mifflin-St Jeor metabolic target calculations',
    badge: 'Algorithms & Health',
    steps: [
      {
        step: 1,
        title: 'Member Saves Biometrics (Weight, Height, Age, Gender)',
        file: 'frontend/src/pages/member/MemberNutrition.jsx',
        actor: 'Client UI',
        description:
          'Member enters weight (kg), height (cm), age, activity level, and goal (e.g. Lean Bulk / Fat Loss).',
        code: `// frontend/src/pages/member/MemberNutrition.jsx
await api.put('/user/fitness-profile', {
  age: Number(age),
  height_cm: Number(height),
  weight_kg: Number(weight),
  gender: gender,
  activity_level: activityLevel, // 'sedentary', 'moderate', 'active'
  goal_type: goalType            // 'weight_loss', 'maintenance', 'lean_bulk'
})`,
        output: 'Persisted to user_profiles table linked via user_id.',
        proTip: 'Separating UserProfile from User keeps authentication credentials lightweight.'
      },
      {
        step: 2,
        title: 'Frontend Computes BMR & TDEE (Mifflin-St Jeor Formula)',
        file: 'frontend/src/pages/member/MemberNutrition.jsx',
        actor: 'Calculation Algorithm',
        description:
          'Basal Metabolic Rate is computed using standard sports nutrition equations, adjusted by activity multiplier.',
        code: `// Mifflin-St Jeor Equation:
// Men:   BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
// Women: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161

const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161)
const tdee = bmr * activityMultiplier[activityLevel] // e.g. 1.55 for moderate

// Adjust calories for target goal:
const targetCalories = goal === 'weight_loss' ? tdee - 500 : goal === 'lean_bulk' ? tdee + 300 : tdee
const targetProtein = Math.round(weight * 2.0) // 2g per kg bodyweight
const targetFats = Math.round((targetCalories * 0.25) / 9)
const targetCarbs = Math.round((targetCalories - (targetProtein * 4 + targetFats * 9)) / 4)`,
        output: 'Dynamic calorie & macro breakdown customized for the user.',
        proTip: 'Target macro grams update dynamically whenever the member logs a new body weight.'
      },
      {
        step: 3,
        title: 'Daily Meal Logging & Local Aggregation',
        file: 'frontend/src/pages/member/MemberNutrition.jsx',
        actor: 'State & Storage',
        description:
          'Foods logged for today are summed to show real-time progress bars vs targets (Calories, Protein, Carbs, Fats).',
        code: `// Aggregating today's intake
const consumed = logs.reduce((acc, item) => ({
  calories: acc.calories + item.calories,
  protein: acc.protein + item.protein,
  carbs: acc.carbs + item.carbs,
  fats: acc.fats + item.fats
}), { calories: 0, protein: 0, carbs: 0, fats: 0 })

const proteinPercent = Math.min(100, Math.round((consumed.protein / targetProtein) * 100))`,
        output: 'Interactive UI showing macro circular gauges and calorie deficits/surpluses.',
        proTip: 'Provides members visual feedback on whether they met their daily protein requirements.'
      }
    ]
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// DATA: CODE FILE CONNECTIONS
// ─────────────────────────────────────────────────────────────────────────────

const CODE_FILES = [
  {
    path: 'backend/main.py',
    type: 'Backend Entry Point',
    role: 'FastAPI application root, CORS middleware, lifespan events, and router registration.',
    imports: ['app.scheduler.start_scheduler', 'app.limiter.limiter', 'app.database.engine', 'app.routers.*'],
    importedBy: ['uvicorn main:app --reload'],
    description:
      'Creates the FastAPI app, manages database table creation on startup, initializes the rate limiter exception handler, and registers all admin, member, and shared API routers.',
    snippet: `app = FastAPI(title="FitX Pro API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", ...])
app.include_router(auth.router, prefix="/api/v1")
app.include_router(admin_workout_programs.router, prefix="/api/v1/admin")
app.include_router(user_portal.router, prefix="/api/v1")`
  },
  {
    path: 'backend/app/limiter.py',
    type: 'Security & Rate Limiting',
    role: 'Instantiates SlowAPI limiter using client remote IP address.',
    imports: ['slowapi.Limiter', 'slowapi.util.get_remote_address'],
    importedBy: ['backend/main.py', 'backend/app/routers/auth.py'],
    description:
      'Provides a singleton Limiter instance keyed by client IP address to prevent brute force attacks on endpoints like /login.',
    snippet: `from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)`
  },
  {
    path: 'backend/app/scheduler.py',
    type: 'Background Worker',
    role: 'APScheduler asynchronous cron manager for gym operations.',
    imports: ['apscheduler.schedulers.asyncio.AsyncIOScheduler', 'app.jobs.expiry_checker.run_expiry_email_alerts'],
    importedBy: ['backend/main.py'],
    description:
      'Runs daily cron tasks without blocking HTTP requests: marks overdue memberships as expired and triggers email notifications at 8 AM.',
    snippet: `scheduler = AsyncIOScheduler()

async def expire_overdue_memberships():
    async with AsyncSessionLocal() as db:
        today = date.today()
        # Find active memberships where end_date < today and update to 'expired'`
  },
  {
    path: 'backend/app/jobs/expiry_checker.py',
    type: 'Job Logic & Email Alerts',
    role: 'Orchestrates member expiry notifications at 7, 3, 1, and 0 days.',
    imports: ['resend', 'app.models.Membership', 'app.models.extra_models.NotificationLog', 'app.services.email_templates'],
    importedBy: ['backend/app/scheduler.py'],
    description:
      'Checks for upcoming membership expirations, checks the NotificationLog to prevent duplicate emails, formats HTML templates, and calls Resend API.',
    snippet: `thresholds = [7, 3, 1, 0]
for days in thresholds:
    target_date = today + timedelta(days=days)
    memberships = await get_memberships_by_end_date(db, target_date)
    for m in memberships:
        if not await check_notification_log(db, m.user_id, trigger, today):
            resend.Emails.send(...)
            await log_notification(db, m.user_id, trigger, m.user.email, "sent")`
  },
  {
    path: 'backend/app/routers/auth.py',
    type: 'Authentication Router',
    role: 'JWT login, password verification, and authentication dependencies.',
    imports: ['passlib.context.CryptContext', 'jose.jwt', 'app.database.get_db', 'app.limiter.limiter'],
    importedBy: ['backend/main.py', 'backend/app/routers/* (imports get_current_user, require_admin)'],
    description:
      'Defines the /login route, password hashing with bcrypt, JWT creation, get_current_user dependency, and require_admin guard.',
    snippet: `async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user`
  },
  {
    path: 'frontend/src/api/client.js',
    type: 'Frontend HTTP Client',
    role: 'Centralized Axios instance with request and response interceptors.',
    imports: ['axios'],
    importedBy: ['frontend/src/store/authStore.js', 'frontend/src/pages/**/*'],
    description:
      'Automatically attaches Bearer <token> to headers from localStorage and handles 401 Unauthorized responses by clearing auth state and redirecting.',
    snippet: `client.interceptors.request.use(config => {
  const auth = JSON.parse(localStorage.getItem('auth-storage') || '{}')
  const token = auth?.state?.accessToken
  if (token) config.headers.Authorization = \`Bearer \${token}\`
  return config
})`
  },
  {
    path: 'frontend/src/store/authStore.js',
    type: 'Frontend Global State',
    role: 'Zustand persistent auth store managing user session.',
    imports: ['zustand', 'zustand/middleware.persist', '../api/client'],
    importedBy: ['frontend/src/App.jsx', 'frontend/src/pages/Login.jsx', 'Layouts'],
    description:
      'Stores user object, accessToken, and isAuthenticated status. Automatically syncs to localStorage so page refresh preserves logged-in status.',
    snippet: `const useAuthStore = create(
  persist((set) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    login: async (username, password) => { ... },
    logout: () => set({ user: null, accessToken: null, isAuthenticated: false })
  }), { name: 'auth-storage' })
)`
  },
  {
    path: 'frontend/src/App.jsx',
    type: 'Frontend Router & App Shell',
    role: 'React Router v7 route definitions and role-based guards.',
    imports: ['react-router-dom', './store/authStore', './pages/admin/*', './pages/member/*'],
    importedBy: ['frontend/src/main.jsx'],
    description:
      'Maps URL paths to components, wrapping /admin routes in ProtectedRoute role="admin" and /app routes in ProtectedRoute role="member".',
    snippet: `<Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
  <Route index element={<AdminDashboard />} />
  <Route path="workouts" element={<WorkoutPrograms />} />
</Route>`
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// DATA: SYSTEM ARCHITECTURE LAYERS
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_LAYERS = [
  {
    layer: '1. Frontend Client Layer',
    badge: 'React 19 + Vite',
    color: '#3B82F6',
    items: [
      { name: 'Pages & Layouts', detail: 'AdminLayout, MemberLayout, Dashboard, WorkoutBuilder, MemberNutrition' },
      { name: 'Zustand State Store', detail: 'authStore.js with persistent localStorage sync' },
      { name: 'Network Client', detail: 'api/client.js with auto Bearer token injection and 401 redirect interceptor' },
      { name: 'Styling System', detail: 'Tailwind CSS v4 + Industrial Precision dark mode custom variables' }
    ]
  },
  {
    layer: '2. API Gateway & Middleware Layer',
    badge: 'FastAPI + Starlette',
    color: '#10B981',
    items: [
      { name: 'CORS Middleware', detail: 'Allows localhost:5173 and Vercel domains with credentials' },
      { name: 'Rate Limiter (SlowAPI)', detail: 'Limits brute-force attempts on sensitive endpoints (e.g. 5/min on /login)' },
      { name: 'Global Exception Handler', detail: 'Catches unhandled errors and returns JSON responses with tracebacks' },
      { name: 'Lifespan Context Manager', detail: 'Creates DB tables and initializes APScheduler worker on server start' }
    ]
  },
  {
    layer: '3. Router & Security Layer',
    badge: 'OAuth2 + JWT',
    color: '#E8001D',
    items: [
      { name: 'Universal Auth Router', detail: '/api/v1/auth/login, password verify, access token generation' },
      { name: 'Admin Routers', detail: '/api/v1/admin/* (Members, Finances, Equipment, Plans, Workout Programs)' },
      { name: 'Member Portal Routers', detail: '/api/v1/user/* (Profile, Membership, Today Workout, Nutrition Logs)' },
      { name: 'Shared Routers', detail: '/api/v1/announcements, /api/v1/workouts' }
    ]
  },
  {
    layer: '4. Database & ORM Layer',
    badge: 'SQLAlchemy Async + SQLite / PostgreSQL',
    color: '#F59E0B',
    items: [
      { name: 'Users & Roles', detail: 'users table with role ("admin" | "member") and bcrypt password_hash' },
      { name: 'Memberships & Plans', detail: 'memberships linked to membership_plans and users with cascade delete' },
      { name: 'Workout Hierarchy', detail: 'workout_programs -> workout_days -> exercises with sort_order' },
      { name: 'Health & Nutrition', detail: 'user_profiles, user_nutrition_logs, body_metrics, strength_logs' }
    ]
  },
  {
    layer: '5. Background Jobs & Services Layer',
    badge: 'APScheduler + Resend API',
    color: '#8B5CF6',
    items: [
      { name: 'APScheduler AsyncIOScheduler', detail: 'Runs periodic cron triggers in Python asyncio event loop' },
      { name: 'Expiry Checker Worker', detail: 'Evaluates memberships at 7, 3, 1, 0 days from end_date' },
      { name: 'Deduplication Guard', detail: 'NotificationLog audit table prevents sending duplicate emails per day' },
      { name: 'Resend Email Service', detail: 'Sends transactional HTML reminder emails with member and plan data' }
    ]
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ArchitectureWorkflow() {
  const [activeTab, setActiveTab] = useState('workflows') // 'workflows' | 'architecture' | 'files' | 'database'
  const [activeWorkflowId, setActiveWorkflowId] = useState('auth')
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [selectedFile, setSelectedFile] = useState(CODE_FILES[0])
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const currentWorkflow = WORKFLOWS.find(w => w.id === activeWorkflowId)
  const currentStep = currentWorkflow.steps[activeStepIndex]

  const handleSelectWorkflow = (id) => {
    setActiveWorkflowId(id)
    setActiveStepIndex(0)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      color: '#F0F0F0',
      fontFamily: '"Inter", sans-serif',
      paddingBottom: '5rem'
    }}>
      {/* ── Top Bar ── */}
      <header style={{
        background: '#111111',
        borderBottom: '1px solid #242424',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate(user ? (user.role === 'admin' ? '/admin' : '/app') : '/login')}
            style={{
              background: '#1A1A1A',
              border: '1px solid #333',
              color: '#F0F0F0',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              textTransform: 'uppercase'
            }}
          >
            <ArrowLeft size={14} /> Back to App
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 900,
                fontSize: '22px',
                color: '#E8001D',
                letterSpacing: '0.05em'
              }}>FITX PRO</span>
              <span style={{
                background: '#E8001D22',
                color: '#E8001D',
                border: '1px solid #E8001D55',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>Master Workflow & Architecture</span>
            </div>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
              Comprehensive interactive learning guide: how each file, route, and code connects.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#080808', padding: '4px', borderRadius: '6px', border: '1px solid #242424' }}>
          {[
            { id: 'workflows', label: 'Interactive Workflows', icon: Play },
            { id: 'architecture', label: 'System Layers', icon: Layers },
            { id: 'files', label: 'Code File Connections', icon: FileCode },
            { id: 'database', label: 'Database Schema', icon: Database },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? '#E8001D' : 'transparent',
                color: activeTab === tab.id ? '#FFF' : '#888',
                border: 'none',
                padding: '0.45rem 0.85rem',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 0.15s ease'
              }}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: INTERACTIVE WORKFLOWS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'workflows' && (
          <div>
            {/* Workflow selector pills */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              {WORKFLOWS.map(w => {
                const isSelected = w.id === activeWorkflowId
                return (
                  <div
                    key={w.id}
                    onClick={() => handleSelectWorkflow(w.id)}
                    style={{
                      background: isSelected ? '#1A1A1A' : '#111111',
                      border: `1px solid ${isSelected ? '#E8001D' : '#242424'}`,
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: '#E8001D'
                      }} />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: isSelected ? '#E8001D' : '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                      }}>
                        {w.badge}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: '#666'
                      }}>
                        {w.steps.length} Steps
                      </span>
                    </div>
                    <h3 style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: isSelected ? '#FFF' : '#DDD',
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}>
                      {w.title}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#777', lineHeight: 1.4 }}>
                      {w.subtitle}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Stepper progress bar */}
            <div style={{
              background: '#111111',
              border: '1px solid #242424',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div>
                  <span style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#E8001D',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}>WORKFLOW PROGRESSION</span>
                  <h2 style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontSize: '24px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#FFF'
                  }}>
                    {currentWorkflow.title}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    disabled={activeStepIndex === 0}
                    onClick={() => setActiveStepIndex(p => Math.max(0, p - 1))}
                    style={{
                      background: activeStepIndex === 0 ? '#1A1A1A' : '#222',
                      color: activeStepIndex === 0 ? '#555' : '#FFF',
                      border: '1px solid #333',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: activeStepIndex === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <ArrowLeft size={14} /> Previous
                  </button>
                  <button
                    disabled={activeStepIndex === currentWorkflow.steps.length - 1}
                    onClick={() => setActiveStepIndex(p => Math.min(currentWorkflow.steps.length - 1, p + 1))}
                    style={{
                      background: activeStepIndex === currentWorkflow.steps.length - 1 ? '#1A1A1A' : '#E8001D',
                      color: activeStepIndex === currentWorkflow.steps.length - 1 ? '#555' : '#FFF',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: activeStepIndex === currentWorkflow.steps.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    Next Step <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Steps timeline */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${currentWorkflow.steps.length}, 1fr)`,
                gap: '0.5rem',
                position: 'relative'
              }}>
                {currentWorkflow.steps.map((s, idx) => {
                  const isActive = idx === activeStepIndex
                  const isDone = idx < activeStepIndex
                  return (
                    <button
                      key={s.step}
                      onClick={() => setActiveStepIndex(idx)}
                      style={{
                        background: isActive ? '#1F1214' : (isDone ? '#141414' : '#0B0B0B'),
                        border: `1px solid ${isActive ? '#E8001D' : (isDone ? '#444' : '#222')}`,
                        borderRadius: '6px',
                        padding: '0.65rem 0.5rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '4px' }}>
                        <span style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: isActive ? '#E8001D' : (isDone ? '#22C55E' : '#242424'),
                          color: '#FFF',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isDone ? '✓' : s.step}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontFamily: '"JetBrains Mono", monospace',
                          color: isActive ? '#E8001D' : '#777',
                          fontWeight: 600
                        }}>
                          STEP {s.step}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isActive ? '#FFF' : '#AAA',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {s.title}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Active Step Detailed Card */}
            <div style={{
              background: '#111111',
              border: '1px solid #242424',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{
                      background: '#E8001D',
                      color: '#FFF',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '3px',
                      fontFamily: '"JetBrains Mono", monospace'
                    }}>
                      STEP {currentStep.step} OF {currentWorkflow.steps.length}
                    </span>
                    <span style={{
                      background: '#1A1A1A',
                      border: '1px solid #333',
                      color: '#AAA',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '3px'
                    }}>
                      Actor: {currentStep.actor}
                    </span>
                  </div>
                  <h3 style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontSize: '28px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#FFF',
                    letterSpacing: '0.03em'
                  }}>
                    {currentStep.title}
                  </h3>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#080808',
                    border: '1px solid #242424',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    marginTop: '4px',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '12px',
                    color: '#38BDF8'
                  }}>
                    <FileCode size={13} /> {currentStep.file}
                  </div>
                </div>

                <div style={{
                  background: '#1A1A1A',
                  border: '1px solid #333',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  maxWidth: '380px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Output & Effect
                  </div>
                  <p style={{ fontSize: '12px', color: '#DDD', lineHeight: 1.4 }}>
                    {currentStep.output}
                  </p>
                </div>
              </div>

              {/* Explanation text */}
              <p style={{ fontSize: '14px', color: '#CCC', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {currentStep.description}
              </p>

              {/* Code Snippet Box */}
              <div style={{
                background: '#080808',
                border: '1px solid #242424',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '1.25rem'
              }}>
                <div style={{
                  background: '#141414',
                  padding: '0.5rem 1rem',
                  borderBottom: '1px solid #242424',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: '#888' }}>
                    Code in action: {currentStep.file}
                  </span>
                  <span style={{ fontSize: '11px', color: '#E8001D', fontWeight: 700 }}>PYTHON / JAVASCRIPT</span>
                </div>
                <pre style={{
                  padding: '1rem',
                  margin: 0,
                  fontSize: '12px',
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#E0E0E0',
                  lineHeight: 1.6,
                  overflowX: 'auto',
                  background: '#080808'
                }}>
                  {currentStep.code}
                </pre>
              </div>

              {/* Pro Tip Box */}
              <div style={{
                background: '#17130B',
                border: '1px solid #D9770644',
                borderRadius: '6px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <Sparkles size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Architectural Insight
                  </span>
                  <p style={{ fontSize: '13px', color: '#FDE68A', margin: 0, marginTop: '2px', lineHeight: 1.5 }}>
                    {currentStep.proTip}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: SYSTEM LAYERS ARCHITECTURE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'architecture' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '28px',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#FFF',
                letterSpacing: '0.04em'
              }}>
                FITX PRO FULL-STACK TOPOLOGY
              </h2>
              <p style={{ fontSize: '13px', color: '#888' }}>
                Visual diagram of how data flows across the 5 core layers of the system.
              </p>
            </div>

            {/* Topology Flow Graph */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {SYSTEM_LAYERS.map((layer, index) => (
                <div
                  key={layer.layer}
                  style={{
                    background: '#111111',
                    border: '1px solid #242424',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    borderBottom: '1px solid #1E1E1E',
                    paddingBottom: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: layer.color
                      }} />
                      <h3 style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontSize: '20px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#FFF',
                        letterSpacing: '0.05em'
                      }}>
                        {layer.layer}
                      </h3>
                    </div>
                    <span style={{
                      background: '#1A1A1A',
                      border: `1px solid ${layer.color}44`,
                      color: layer.color,
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontFamily: '"JetBrains Mono", monospace'
                    }}>
                      {layer.badge}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    {layer.items.map(item => (
                      <div
                        key={item.name}
                        style={{
                          background: '#0A0A0A',
                          border: '1px solid #222',
                          borderRadius: '6px',
                          padding: '0.75rem'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#EEE', marginBottom: '3px' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.4 }}>
                          {item.detail}
                        </div>
                      </div>
                    ))}
                  </div>

                  {index < SYSTEM_LAYERS.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#080808',
                      border: '1px solid #333',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#888',
                      zIndex: 2
                    }}>
                      ↓
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Runtime Networking Card */}
            <div style={{
              marginTop: '2rem',
              background: '#111111',
              border: '1px solid #242424',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <h4 style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '18px',
                fontWeight: 700,
                color: '#FFF',
                textTransform: 'uppercase',
                marginBottom: '0.75rem'
              }}>
                Runtime Topology & Port Mapping
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#080808', padding: '0.85rem', borderRadius: '6px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>CLIENT PORT</div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>
                    http://localhost:5173
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Vite Development Server serving React SPA with HMR (Hot Module Replacement).
                  </p>
                </div>
                <div style={{ background: '#080808', padding: '0.85rem', borderRadius: '6px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '11px', color: '#22C55E', fontWeight: 700 }}>API SERVER PORT</div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>
                    http://localhost:8000
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Uvicorn ASGI server running FastAPI backend with OpenAPI /docs at /docs.
                  </p>
                </div>
                <div style={{ background: '#080808', padding: '0.85rem', borderRadius: '6px', border: '1px solid #222' }}>
                  <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700 }}>DATA STORE</div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>
                    gymdb.sqlite / Postgres
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Asynchronous connection via SQLAlchemy asyncpg / aiosqlite driver.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: CODE FILE CONNECTIONS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'files' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', alignItems: 'start' }}>
            {/* File List */}
            <div style={{
              background: '#111111',
              border: '1px solid #242424',
              borderRadius: '8px',
              padding: '1rem',
              maxHeight: 'calc(100vh - 180px)',
              overflowY: 'auto'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#E8001D',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '0.75rem'
              }}>
                SELECT FILE TO INSPECT
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {CODE_FILES.map(f => {
                  const isSelected = selectedFile.path === f.path
                  return (
                    <button
                      key={f.path}
                      onClick={() => setSelectedFile(f)}
                      style={{
                        background: isSelected ? '#1A1A1A' : '#0A0A0A',
                        border: `1px solid ${isSelected ? '#E8001D' : '#222'}`,
                        borderRadius: '6px',
                        padding: '0.65rem 0.75rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: isSelected ? '#E8001D' : '#666',
                        textTransform: 'uppercase'
                      }}>
                        {f.type}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 600,
                        color: isSelected ? '#FFF' : '#CCC',
                        wordBreak: 'break-all'
                      }}>
                        {f.path}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected File Details */}
            <div style={{
              background: '#111111',
              border: '1px solid #242424',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{
                    background: '#E8001D22',
                    color: '#E8001D',
                    border: '1px solid #E8001D55',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {selectedFile.type}
                  </span>
                  <h3 style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#FFF',
                    marginTop: '6px'
                  }}>
                    {selectedFile.path}
                  </h3>
                </div>
              </div>

              <p style={{ fontSize: '14px', color: '#CCC', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {selectedFile.description}
              </p>

              {/* Inbound & Outbound Connections */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: '6px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    What this file imports / relies on:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '12px', color: '#AAA', lineHeight: 1.6 }}>
                    {selectedFile.imports.map((imp, idx) => (
                      <li key={idx} style={{ fontFamily: '"JetBrains Mono", monospace' }}>{imp}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: '6px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#22C55E', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Who imports / invokes this file:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '12px', color: '#AAA', lineHeight: 1.6 }}>
                    {selectedFile.importedBy.map((impBy, idx) => (
                      <li key={idx} style={{ fontFamily: '"JetBrains Mono", monospace' }}>{impBy}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Code Snippet */}
              <div style={{
                background: '#080808',
                border: '1px solid #242424',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#141414',
                  padding: '0.5rem 1rem',
                  borderBottom: '1px solid #242424',
                  fontSize: '11px',
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#888'
                }}>
                  Key implementation excerpt:
                </div>
                <pre style={{
                  padding: '1rem',
                  margin: 0,
                  fontSize: '12px',
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#E0E0E0',
                  lineHeight: 1.6,
                  overflowX: 'auto',
                  background: '#080808'
                }}>
                  {selectedFile.snippet}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: DATABASE SCHEMA & ENTITIES
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'database' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '28px',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#FFF',
                letterSpacing: '0.04em'
              }}>
                DATABASE RELATIONAL ARCHITECTURE (SQLAlchemy Models)
              </h2>
              <p style={{ fontSize: '13px', color: '#888' }}>
                All tables use UUID primary keys for security and distributed generation without sequence conflicts.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem'
            }}>
              {/* User Model */}
              <div style={{ background: '#111111', border: '1px solid #242424', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '15px', color: '#E8001D', fontWeight: 800 }}>
                    users
                  </h4>
                  <span style={{ fontSize: '11px', color: '#777' }}>Core Auth Entity</span>
                </div>
                <div style={{ fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.7, color: '#CCC' }}>
                  <div><span style={{ color: '#F59E0B' }}>id</span>: Uuid (PK)</div>
                  <div><span style={{ color: '#38BDF8' }}>username</span>: String(50) [UNIQUE]</div>
                  <div><span style={{ color: '#38BDF8' }}>email</span>: String(150) [UNIQUE]</div>
                  <div><span style={{ color: '#888' }}>password_hash</span>: String(255) (Bcrypt)</div>
                  <div><span style={{ color: '#22C55E' }}>role</span>: 'admin' | 'member'</div>
                  <div><span style={{ color: '#888' }}>is_active</span>: Boolean</div>
                </div>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #1E1E1E', fontSize: '11px', color: '#888' }}>
                  Relationships: 1-to-many with memberships, 1-to-1 with user_profiles.
                </div>
              </div>

              {/* Memberships Model */}
              <div style={{ background: '#111111', border: '1px solid #242424', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '15px', color: '#E8001D', fontWeight: 800 }}>
                    memberships
                  </h4>
                  <span style={{ fontSize: '11px', color: '#777' }}>Subscription State</span>
                </div>
                <div style={{ fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.7, color: '#CCC' }}>
                  <div><span style={{ color: '#F59E0B' }}>id</span>: Uuid (PK)</div>
                  <div><span style={{ color: '#EC4899' }}>user_id</span>: Uuid (FK -&gt; users.id)</div>
                  <div><span style={{ color: '#EC4899' }}>plan_id</span>: Uuid (FK -&gt; membership_plans.id)</div>
                  <div><span style={{ color: '#38BDF8' }}>start_date</span>: Date</div>
                  <div><span style={{ color: '#38BDF8' }}>end_date</span>: Date</div>
                  <div><span style={{ color: '#22C55E' }}>status</span>: 'active' | 'expired' | 'frozen'</div>
                </div>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #1E1E1E', fontSize: '11px', color: '#888' }}>
                  Targeted by: scheduler.py and expiry_checker.py for daily automated status transitions.
                </div>
              </div>

              {/* Workout Hierarchy */}
              <div style={{ background: '#111111', border: '1px solid #242424', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '15px', color: '#E8001D', fontWeight: 800 }}>
                    workout_programs
                  </h4>
                  <span style={{ fontSize: '11px', color: '#777' }}>Multi-level Tree</span>
                </div>
                <div style={{ fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.7, color: '#CCC' }}>
                  <div><span style={{ color: '#F59E0B' }}>id</span>: Uuid (PK)</div>
                  <div><span style={{ color: '#38BDF8' }}>name</span>: String (e.g. "Push Pull Legs")</div>
                  <div><span style={{ color: '#888' }}>difficulty</span>: beginner | intermediate | advanced</div>
                  <div><span style={{ color: '#22C55E' }}>is_published</span>: Boolean</div>
                  <div style={{ color: '#EC4899', marginTop: '4px' }}>
                    ↳ workout_days (1-to-N)
                  </div>
                  <div style={{ color: '#A855F7', paddingLeft: '1rem' }}>
                    ↳ exercises (1-to-N)
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #1E1E1E', fontSize: '11px', color: '#888' }}>
                  Nested Pydantic models parse & serialize this entire tree in single HTTP payloads.
                </div>
              </div>

              {/* Audit Notification Log */}
              <div style={{ background: '#111111', border: '1px solid #242424', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '15px', color: '#E8001D', fontWeight: 800 }}>
                    notification_logs
                  </h4>
                  <span style={{ fontSize: '11px', color: '#777' }}>Email Audit Trail</span>
                </div>
                <div style={{ fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.7, color: '#CCC' }}>
                  <div><span style={{ color: '#F59E0B' }}>id</span>: Uuid (PK)</div>
                  <div><span style={{ color: '#EC4899' }}>user_id</span>: Uuid (FK -&gt; users.id)</div>
                  <div><span style={{ color: '#38BDF8' }}>trigger_reason</span>: '7_day_expiry' | 'expired'</div>
                  <div><span style={{ color: '#22C55E' }}>status</span>: 'sent' | 'failed'</div>
                  <div><span style={{ color: '#888' }}>sent_at</span>: DateTime (default: now)</div>
                </div>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #1E1E1E', fontSize: '11px', color: '#888' }}>
                  Guarantees idempotency: checks here ensure no member gets two alerts on the same calendar day.
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
