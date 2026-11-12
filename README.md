FitX Pro is a full-stack gym management and member portal application built to help fitness businesses manage members, memberships, workouts, nutrition, leads, equipment, finances, and messaging in one place.


This project combines a FastAPI backend with a React + Vite frontend, giving gym owners and staff a modern admin dashboard while members get a dedicated workout and wellness experience.


## Why FitX Pro?


Modern gyms need more than just a website. They need:


- Membership lifecycle tracking
- Member onboarding and profile management
- Admin operations for plans, leads, and finances
- Workout program creation and assignment
- Nutritional guidance and body metrics
- Automated expiry alerts and reminders
- A clean, responsive experience for both staff and members


FitX Pro brings those workflows together into a single platform.


## Core Features


### Admin Portal
- Manage members and membership plans
- Track finances and expenses
- Manage equipment and maintenance logs
- Create and publish workout programs
- Build and organize exercise library entries
- Track leads and follow-up activity
- Publish announcements and alerts
- Monitor member health and engagement signals


### Member Portal
- Personalized member dashboard
- Workout program browsing and selection
- Daily workout guidance
- Nutrition and macro tracking
- Body metrics logging
- Membership status and plan details
- Profile overview


### Automation & Business Logic
- JWT-based authentication and role-based access control
- Rate limiting for login protection
- Background scheduler for renewal and expiry alerts
- Email notification workflows
- Structured database models for gym operations


## Tech Stack


### Backend
- Python
- FastAPI
- SQLAlchemy (async)
- SQLite / PostgreSQL compatible setup
- Alembic migrations
- SlowAPI rate limiting
- APScheduler for background jobs
- JWT auth with bcrypt hashing


### Frontend
- React 19
- Vite
- React Router
- Zustand for state management
- Axios for API calls
- Tailwind-style design system


## Project Structure


```text
fitxpro-real/
├── backend/
│   ├── app/
│   ├── alembic/
│   ├── main.py
│   ├── requirements.txt
│   ├── seed.py
│   └── ...
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── learning/
│   ├── README.md
│   └── workflow_guide.html
├── docker-compose.yml
├── start_all.bat
├── .gitignore
└── README.md
```


## Architecture Overview


FitX Pro follows a layered architecture:


- Frontend client app for admin and member portals
- FastAPI API layer for routing and business logic
- SQLAlchemy models for the gym domain
- Background jobs for reminders and expiry checks
- Database persistence with migration support


The learning documentation in the project contains a more detailed system map and workflow explanation:


- [learning/README.md](learning/README.md)


## Getting Started


### Option 1: Run with Docker Compose


From the project root:


```bash
docker-compose up --build
```


This will start:
- the backend API on `http://localhost:8000`
- the frontend on `http://localhost:80`
- a Postgres database service


### Option 2: Run Frontend and Backend Locally


#### Backend


```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```


The backend will run with the default SQLite configuration unless you configure a different database via environment variables.


#### Frontend


```bash
cd frontend
npm install
npm run dev
```


Then open:


- Frontend: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`


## Default Admin Access


A seeded admin user is created in the backend seed data. Default credentials:


```text
Username: admin
Password: Admin@123
```


Use these to log in to the admin portal and explore the application.


## Environment Notes


The backend reads settings from `backend/.env` and defaults are defined in `backend/app/config.py`.


Common settings include:
- `DATABASE_URL`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`


## Example Workflows


### Workout Program Lifecycle
1. Admin creates workout days and exercises
2. Program is saved to the database
3. Member selects a program
4. Daily workout logic references the selection and active day


### Membership Expiry Automation
1. Background job checks upcoming expirations
2. It identifies eligible members based on date thresholds
3. Notification logs prevent duplicate alerts
4. Emails are sent through configured notification providers


## Roadmap / Next Enhancements


This project is designed as a strong foundation for a real gym business platform. Future improvements may include:


- more advanced analytics and dashboards
- richer attendance tracking
- appointment booking and scheduling
- WhatsApp / SMS automation improvements
- multi-branch gym support
- payment integrations and invoices
- role-based staff permissions beyond admin/member


## Repository Notes


This repository includes both the application code and the educational architecture guide used to document how the system works.


If you want to understand the internal flow in more depth, start with:


- [learning/README.md](learning/README.md)
- [backend/main.py](backend/main.py)
- [frontend/src/App.jsx](frontend/src/App.jsx)


## Contributing


This repository is intended for learning, internal tooling, and portfolio/demo use. If you want to extend the project:


1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test locally
5. Open a pull request


## Summary


FitX Pro is a practical fitness business management app built to handle the operational side of a gym while also delivering a polished member experience. It is a strong example of a modern full-stack app using FastAPI, React, SQLAlchemy, and workflow automation.


If you are exploring this project for learning, portfolio, or business workflow inspiration, this repository is a good example of how a full-stack SaaS-style application can be structured.
