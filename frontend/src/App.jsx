import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

// Auth
import Login from './pages/Login'

// Admin
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import Members from './pages/admin/Members'
import WorkoutPrograms from './pages/admin/WorkoutPrograms'
import WorkoutBuilder from './pages/admin/WorkoutBuilder'
import Finances from './pages/admin/Finances'
import Equipment from './pages/admin/Equipment'
import Plans from './pages/admin/Plans'
import Leads from './pages/admin/Leads'
import Announcements from './pages/admin/Announcements'
import ExerciseLibraryPage from './pages/admin/ExerciseLibraryPage'
import AdminAlertsPage from './pages/admin/AdminAlertsPage'

// Member
import MemberLayout from './pages/member/MemberLayout'
import MemberDashboard from './pages/member/MemberDashboard'
import WorkoutOverview from './pages/member/WorkoutOverview'
import WorkoutCatalog from './pages/member/WorkoutCatalog'
import ProgramDetail from './pages/member/ProgramDetail'
import TodayWorkout from './pages/member/TodayWorkout'
import MemberNutrition from './pages/member/MemberNutrition'
import BodyMetrics from './pages/member/BodyMetrics'
import MemberProfile from './pages/member/MemberProfile'

// Learning & Architecture Explorer
import ArchitectureWorkflow from './learning/ArchitectureWorkflow'

function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role && user?.role !== role) return <Navigate to="/" replace />
  return children
}

function RoleRedirect() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/app'} replace />
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/learning" element={<ArchitectureWorkflow />} />
        <Route path="/workflow" element={<Navigate to="/learning" replace />} />
        <Route path="/architecture" element={<Navigate to="/learning" replace />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* ── Admin Portal ── */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="members"       element={<Members />} />
          <Route path="workouts"      element={<WorkoutPrograms />} />
          <Route path="workouts/:id"  element={<WorkoutBuilder />} />
          <Route path="finances"      element={<Finances />} />
          <Route path="equipment"     element={<Equipment />} />
          <Route path="plans"         element={<Plans />} />
          <Route path="leads"         element={<Leads />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="exercise-library" element={<ExerciseLibraryPage />} />
          <Route path="alerts"        element={<AdminAlertsPage />} />
        </Route>

        {/* ── Member Portal ── */}
        <Route path="/app" element={
          <ProtectedRoute role="member"><MemberLayout /></ProtectedRoute>
        }>
          <Route index element={<MemberDashboard />} />
          <Route path="workouts"                    element={<WorkoutOverview />} />
          <Route path="workouts/programs"           element={<WorkoutCatalog />} />
          <Route path="workouts/programs/:id"       element={<ProgramDetail />} />
          <Route path="workouts/today"              element={<TodayWorkout />} />
          <Route path="nutrition"                   element={<MemberNutrition />} />
          <Route path="body-metrics"                element={<BodyMetrics />} />
          <Route path="profile"                     element={<MemberProfile />} />
        </Route>

        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </Router>
  )
}

export default App
