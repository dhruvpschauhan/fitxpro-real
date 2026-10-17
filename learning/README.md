# FitX Pro: Comprehensive Learning & Architecture Guide

Welcome to the **Learning Hub** for FitX Pro! This folder contains everything you need to understand how the entire application works, how each file and layer connects, and how requests flow through the system.

---

## 🚀 How to Run the Interactive Learning Guide

You can explore the interactive workflow simulator in two ways:

### Option 1: Live Interactive React App (Recommended)
1. Start your frontend development server:
   ```bash
   cd e:\fitxpro\frontend
   npm run dev
   ```
2. In your browser, navigate directly to:
   👉 **`http://localhost:5173/learning`** (or `http://localhost:5173/workflow`)

*(The standard app UI remains 100% clean and uncluttered—this route is privately accessible whenever you want to study the code!)*

### Option 2: Standalone Offline HTML Guide
Simply double-click [`learning/workflow_guide.html`](./workflow_guide.html) in your file explorer to open the interactive visualization directly in any web browser without running any servers.

---

## 🏛️ System Architecture Layers

FitX Pro is structured as a modern 5-tier web application:

```
┌────────────────────────────────────────────────────────────────────────┐
│  1. CLIENT TIER (React 19 + Vite)                                      │
│     - Pages & Layouts (Admin & Member Portals)                         │
│     - Zustand Global State Store (persistent localStorage sync)        │
│     - Axios HTTP Client (Bearer JWT auto-injection & 401 redirect)     │
│     - Tailwind CSS v4 + Industrial Precision dark theme                │
├────────────────────────────────────────────────────────────────────────┤
│  2. GATEWAY & MIDDLEWARE TIER (FastAPI / Starlette)                    │
│     - CORS Middleware (localhost:5173 + Vercel domains)               │
│     - SlowAPI Rate Limiter (remote IP keyed, e.g. 5/min on /login)     │
│     - Lifespan context manager (creates DB tables & starts scheduler)  │
├────────────────────────────────────────────────────────────────────────┤
│  3. ROUTERS & SECURITY TIER (OAuth2 + JWT)                             │
│     - /api/v1/auth: Login, Bcrypt password hashing, JWT HS256 tokens    │
│     - /api/v1/admin/*: Require admin role (Members, Finance, Plans)    │
│     - /api/v1/user/*: Scoped to logged-in user (Workouts, Nutrition)   │
│     - /api/v1/announcements & workouts: Shared across roles            │
├────────────────────────────────────────────────────────────────────────┤
│  4. DATA & PERSISTENCE TIER (SQLAlchemy Async + SQLite / PostgreSQL)   │
│     - Users, Memberships, Plans, WorkoutPrograms, NotificationLogs     │
│     - UUID Primary Keys for distributed generation & security          │
│     - selectinload eager relationships to prevent N+1 query slowdowns  │
├────────────────────────────────────────────────────────────────────────┤
│  5. WORKERS & TRANSACTIONAL MESSAGING TIER (APScheduler + Resend)      │
│     - APScheduler running inside Python asyncio event loop             │
│     - Daily expiry checker jobs (7, 3, 1, 0 days to membership end)    │
│     - Deduplication audit check via NotificationLog table              │
│     - Resend REST API for HTML transactional email delivery            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ 4 Core System Workflows

### 1. Authentication & JWT Token Lifecycle
1. User types credentials in `frontend/src/pages/Login.jsx`.
2. `useAuthStore` dispatches `POST /api/v1/auth/login` with URL-encoded form data.
3. `limiter.py` intercepts request IP address to guard against brute-force attacks.
4. `routers/auth.py` looks up user, verifies bcrypt hash, and creates an access token signed with HS256.
5. `authStore.js` saves token in `localStorage`.
6. `api/client.js` attaches `Authorization: Bearer <token>` to every subsequent request.

### 2. Membership Expiry & Background Email Scheduler
1. `main.py` starts `APScheduler.AsyncIOScheduler` on server boot.
2. Daily job runs `run_expiry_email_alerts` in `backend/app/jobs/expiry_checker.py`.
3. Checks memberships ending in 7, 3, 1, or 0 days using `selectinload(Membership.user)`.
4. Checks `NotificationLog` table to verify if an alert was already sent today (idempotency).
5. Renders template and delivers email via Resend API, logging `"sent"` or `"failed"`.

### 3. Workout Programs: Admin Builder $\rightarrow$ Member Routine
1. Admin creates multi-day routines with exercises in `WorkoutBuilder.jsx`.
2. Validated through nested Pydantic models in `admin/workout_programs.py` (`ProgramCreate` $\rightarrow$ `DayIn` $\rightarrow$ `ExerciseIn`).
3. Persisted into relational hierarchy (`workout_programs` $\rightarrow$ `workout_days` $\rightarrow$ `exercises`).
4. Member clicks "Select Program" $\rightarrow$ saves `UserProgramSelection` with timestamp.
5. `user/workout.py` calculates active day via modulo arithmetic: `(date.today() - selected_at.date()).days % total_days`.

### 4. Nutrition & Dynamic Macro Engine
1. Member updates biometrics (weight, height, age, activity level, goal) in `MemberNutrition.jsx`.
2. Saved to `user_profiles` table via `/api/v1/user/fitness-profile`.
3. Mifflin-St Jeor equation computes Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE).
4. Targets set: Protein ($2\text{g}/\text{kg}$), Fats ($25\%$ calories), and remainder Carbs.
5. Daily meals logged update interactive circular gauges and macro balances in real time.

---

## 📂 Key Files & What They Do

| File Path | Role & Connections |
| :--- | :--- |
| **`backend/main.py`** | FastAPI app initialization, middleware, lifespan context, and router includes. |
| **`backend/app/limiter.py`** | Singleton SlowAPI limiter using client remote IP address. |
| **`backend/app/scheduler.py`** | Background cron scheduler for gym operations. |
| **`backend/app/jobs/expiry_checker.py`** | Expiry queries, notification deduplication, and Resend email calls. |
| **`backend/app/routers/auth.py`** | JWT generation, bcrypt verification, and auth dependencies. |
| **`backend/app/routers/admin/workout_programs.py`** | Nested Pydantic schemas and endpoints for managing workout plans. |
| **`backend/app/routers/user/portal.py`** | Member portal: profile, active membership, fitness stats, nutrition logs. |
| **`backend/app/models/`** | SQLAlchemy ORM database entities (`User`, `Membership`, etc.). |
| **`frontend/src/api/client.js`** | Axios client with JWT request interceptor and 401 response handler. |
| **`frontend/src/store/authStore.js`** | Zustand persistent store holding session and token. |
| **`frontend/src/learning/ArchitectureWorkflow.jsx`** | The interactive workflow simulator and code explorer. |
