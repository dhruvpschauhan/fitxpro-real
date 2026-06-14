import { useEffect, useState } from 'react'
import client from '../../api/client'
import useAuthStore from '../../store/authStore'

export default function MemberProfile() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [membership, setMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saved, setSaved] = useState(false)
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    Promise.all([
      client.get('/user/profile').then(r => r.data),
      client.get('/user/membership').then(r => r.data).catch(() => null),
      client.get('/announcements/').then(r => r.data).catch(() => []),
    ]).then(([p, m, a]) => {
      setProfile(p)
      setForm({ full_name: p.full_name, email: p.email, phone: p.phone || '' })
      setMembership(m)
      setAnnouncements(a)
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    setProfile(prev => ({ ...prev, ...form }))
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div style={{ padding: '2rem', color: '#444' }}>Loading...</div>

  const daysLeft = membership ? Math.max((new Date(membership.end_date) - new Date()) / 86400000, 0).toFixed(0) : 0

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <h1 className="text-page-title" style={{ marginBottom: '2rem' }}>MY PROFILE</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        {/* Profile Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 2, background: '#1A1A1A', border: '1px solid #2A2A2A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 24, color: '#E8001D',
              }}>{profile?.full_name?.[0]?.toUpperCase()}</div>
              <div>
                <h2 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 22, textTransform: 'uppercase' }}>
                  {profile?.full_name}
                </h2>
                <p style={{ fontSize: 12, color: '#444' }}>@{profile?.username}</p>
                <span className="badge badge-active" style={{ marginTop: 4 }}>MEMBER</span>
              </div>
            </div>
            <button onClick={() => editing ? handleSave() : setEditing(true)}
              className={editing ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: 12, padding: '6px 14px' }}>
              {editing ? 'SAVE' : 'EDIT'}
            </button>
          </div>

          {saved && <div style={{ background: '#052210', border: '1px solid #0A3A1A', color: '#22C55E', padding: '0.5rem 0.75rem', borderRadius: 2, fontSize: 12, marginBottom: 16 }}>PROFILE UPDATED</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { label: 'FULL NAME', key: 'full_name', span: true },
              { label: 'EMAIL', key: 'email' },
              { label: 'PHONE', key: 'phone' },
            ].map(f => (
              <div key={f.key} style={f.span ? { gridColumn: '1 / -1' } : {}}>
                <label className="input-label">{f.label}</label>
                {editing ? (
                  <input type="text" className="input" style={{ width: '100%' }}
                    value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{profile?.[f.key] || '--'}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Membership */}
          <div className="card">
            <h3 className="text-section" style={{ fontSize: 14, marginBottom: 16 }}>MEMBERSHIP</h3>
            {membership ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: 13 }}>
                {[
                  ['PLAN', membership.plan_name],
                  ['EXPIRES', membership.end_date],
                  ['DAYS LEFT', daysLeft],
                  ['STATUS', membership.status?.toUpperCase()],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>{l}</span>
                    <span style={{
                      fontWeight: 600,
                      fontFamily: l === 'DAYS LEFT' || l === 'EXPIRES' ? '"JetBrains Mono", monospace' : '"Inter", sans-serif',
                      color: l === 'DAYS LEFT' ? (parseInt(v) < 10 ? '#E8001D' : '#22C55E') :
                             l === 'STATUS' ? '#22C55E' : '#F0F0F0',
                    }}>{v}</span>
                  </div>
                ))}
                {membership.amount_paid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #1E1E1E' }}>
                    <span style={{ color: '#888' }}>PAID</span>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>₹{parseFloat(membership.amount_paid).toLocaleString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: '#444', fontSize: 13 }}>No active membership.</p>
            )}
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="card">
              <h3 className="text-section" style={{ fontSize: 14, marginBottom: 12 }}>ANNOUNCEMENTS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {announcements.slice(0, 3).map(a => (
                  <div key={a.id} style={{ borderLeft: '2px solid #E8001D', paddingLeft: 12 }}>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</p>
                    <p style={{ color: '#444', fontSize: 12, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {a.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
