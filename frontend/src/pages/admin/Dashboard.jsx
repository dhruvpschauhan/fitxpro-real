import { useEffect, useState } from 'react'
import useAuthStore from '../../store/authStore'
import { getDashboardSummary } from '../../api/admin'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'

const REVENUE_DATA = [
  { month: 'JAN', revenue: 48000, members: 38 },
  { month: 'FEB', revenue: 52000, members: 41 },
  { month: 'MAR', revenue: 61000, members: 47 },
  { month: 'APR', revenue: 55000, members: 44 },
  { month: 'MAY', revenue: 67000, members: 53 },
  { month: 'JUN', revenue: 71000, members: 58 },
]

const PLAN_DATA = [
  { name: 'MONTHLY', value: 34 },
  { name: 'QUARTERLY', value: 18 },
  { name: 'ANNUAL', value: 6 },
]

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #333', padding: '10px 14px', borderRadius: 2 }}>
      <p style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#F0F0F0', fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 13 }}>
          {p.name === 'revenue' ? `₹${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState({ active_members: 0, expiring_this_week: 0, revenue_this_month: 0, pending_issues: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'ACTIVE MEMBERS',     value: summary.active_members },
    { label: 'EXPIRING THIS WEEK', value: summary.expiring_this_week },
    { label: 'REVENUE (MONTH)',    value: `₹${(summary.revenue_this_month || 0).toLocaleString()}` },
    { label: 'PENDING ISSUES',     value: summary.pending_issues },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: 1280, margin: '0 auto' }}>

      {/* Welcome strip with watermark */}
      <div style={{ position: 'relative', marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-20px', left: 0, right: 0,
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '120px',
          textTransform: 'uppercase', color: '#111', letterSpacing: '0.04em',
          lineHeight: 1, whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none',
        }}>
          FITX PRO
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="text-page-title" style={{ color: '#F0F0F0' }}>DASHBOARD</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>
            Operations overview / {user?.username?.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Stat Cards — 4 in a row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s, i) => (
          <div key={i} className="card-stat">
            <p className="text-label" style={{ marginBottom: 8 }}>{s.label}</p>
            <p className="text-hero-number">{loading ? '--' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Revenue Area Chart */}
        <div className="card">
          <h3 className="text-section" style={{ marginBottom: 4 }}>REVENUE TREND</h3>
          <p className="text-label" style={{ marginBottom: 24, fontSize: 11 }}>LAST 6 MONTHS</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={REVENUE_DATA} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8001D" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E8001D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1E1E1E" strokeDasharray="" horizontal={true} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 11, fontFamily: '"Inter", sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#E8001D" strokeWidth={2} fill="url(#revGrad)" name="revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="card">
          <h3 className="text-section" style={{ marginBottom: 4 }}>PLAN DISTRIBUTION</h3>
          <p className="text-label" style={{ marginBottom: 24, fontSize: 11 }}>MEMBERS BY PLAN</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={PLAN_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1E1E1E" horizontal={true} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" fill="#E8001D" radius={[2, 2, 0, 0]} name="MEMBERS" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1E1E1E' }}>
          <h3 className="text-section">RECENT ACTIVITY</h3>
        </div>
        <div>
          {(summary.recent_activity || []).map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',

              padding: '0.75rem 1.5rem', borderBottom: '1px solid #1E1E1E',
              transition: 'background 80ms ease',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#1A1A1A'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 3, height: 24, borderRadius: 1, flexShrink: 0,
                background: a.type === 'member' ? '#E8001D' :
                             a.type === 'expiry' ? '#F59E0B' :
                             a.type === 'payment' ? '#22C55E' : '#E8001D',
              }} />
              <p style={{ flex: 1, fontSize: 14, color: '#F0F0F0' }}>{a.text}</p>
              <span style={{ fontSize: 11, color: '#444', fontFamily: '"JetBrains Mono", monospace', flexShrink: 0 }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
