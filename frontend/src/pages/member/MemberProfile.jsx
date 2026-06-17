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
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="text-page-title" style={{ marginBottom: '2.5rem', letterSpacing: '0.05em' }}>MY PROFILE</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {/* Profile Card - Premium Glassmorphic */}
        <div style={{ 
          flex: '1 1 550px',
          background: 'linear-gradient(145deg, #111111 0%, #151515 100%)', 
          border: '1px solid #1E1E1E', borderRadius: 8, padding: '2.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', position: 'relative'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', bottom: 0, background: '#E8001D', boxShadow: '0 0 15px #E8001D' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 4, 
                background: 'linear-gradient(135deg, #1A0005 0%, #3A0010 100%)', 
                border: '1px solid #E8001D', boxShadow: '0 0 15px rgba(232,0,29,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 32, color: '#F0F0F0',
                textShadow: '0 0 10px rgba(255,255,255,0.3)'
              }}>{profile?.full_name?.[0]?.toUpperCase()}</div>
              <div>
                <h2 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 28, textTransform: 'uppercase', color: '#F0F0F0', letterSpacing: '0.02em', lineHeight: 1.1 }}>
                  {profile?.full_name}
                </h2>
                <p style={{ fontSize: 13, color: '#888', fontFamily: '"JetBrains Mono", monospace', marginTop: 4 }}>@{profile?.username}</p>
                <span className="badge" style={{ marginTop: 8, background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>ACTIVE MEMBER</span>
              </div>
            </div>
            <button onClick={() => editing ? handleSave() : setEditing(true)}
              className={editing ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: 13, padding: '8px 20px', letterSpacing: '0.05em' }}>
              {editing ? 'SAVE CHANGES' : 'EDIT PROFILE'}
            </button>
          </div>

          {saved && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', padding: '0.75rem 1rem', borderRadius: 4, fontSize: 13, fontWeight: 600, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>✓</span> PROFILE UPDATED SUCCESSFULLY</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[
              { label: 'FULL NAME', key: 'full_name', span: true },
              { label: 'EMAIL ADDRESS', key: 'email' },
              { label: 'PHONE NUMBER', key: 'phone' },
            ].map(f => (
              <div key={f.key} style={f.span ? { gridColumn: '1 / -1' } : {}}>
                <label className="text-label-sm" style={{ color: '#888', marginBottom: 8, display: 'block', letterSpacing: '0.1em' }}>{f.label}</label>
                {editing ? (
                  <input type="text" className="input" style={{ width: '100%', background: '#141414', borderColor: '#333' }}
                    value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <div style={{ background: '#141414', border: '1px solid #1E1E1E', padding: '0.875rem 1rem', borderRadius: 4 }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#F0F0F0' }}>{profile?.[f.key] || '--'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Membership - Premium Black Card */}
          <div style={{ 
            background: 'linear-gradient(145deg, #111111 0%, #1A0005 100%)', 
            border: '1px solid #3A0010', borderRadius: 8, padding: '2rem',
            boxShadow: '0 8px 32px rgba(232, 0, 29, 0.15)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #E8001D, transparent)' }} />
            
            <h3 className="text-section" style={{ fontSize: 14, marginBottom: 24, color: '#888', letterSpacing: '0.1em' }}>ACTIVE PLAN</h3>
            {membership ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: 14 }}>
                {[
                  ['PLAN TYPE', membership.plan_name],
                  ['EXPIRES', membership.end_date],
                  ['DAYS LEFT', daysLeft],
                  ['STATUS', membership.status?.toUpperCase()],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#888', fontSize: 12, letterSpacing: '0.05em' }}>{l}</span>
                    <span style={{
                      fontWeight: 700,
                      fontFamily: l === 'DAYS LEFT' || l === 'EXPIRES' ? '"JetBrains Mono", monospace' : '"Barlow Condensed", sans-serif',
                      fontSize: l === 'DAYS LEFT' || l === 'PLAN TYPE' ? 20 : 16,
                      color: l === 'DAYS LEFT' ? (parseInt(v) < 10 ? '#E8001D' : '#22C55E') :
                             l === 'STATUS' ? '#22C55E' : '#F0F0F0',
                      textShadow: l === 'DAYS LEFT' ? `0 0 10px ${parseInt(v) < 10 ? 'rgba(232,0,29,0.3)' : 'rgba(34,197,94,0.3)'}` : 'none'
                    }}>{v}</span>
                  </div>
                ))}
                {membership.amount_paid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4 }}>
                    <span style={{ color: '#888', fontSize: 12, letterSpacing: '0.05em' }}>AMOUNT PAID</span>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: '#F0F0F0' }}>₹{parseFloat(membership.amount_paid).toLocaleString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                <p style={{ color: '#666', fontSize: 14, fontFamily: '"JetBrains Mono", monospace' }}>NO ACTIVE MEMBERSHIP</p>
              </div>
            )}
          </div>

          {/* Announcements - Premium Glass Layout */}
          {announcements.length > 0 && (
            <div style={{ 
              background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden'
            }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1A1A1A', background: 'rgba(255,255,255,0.02)' }}>
                <h3 className="text-section" style={{ fontSize: 13, color: '#888', letterSpacing: '0.1em' }}>RECENT ANNOUNCEMENTS</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {announcements.slice(0, 3).map((a, idx) => (
                  <div key={a.id} style={{ 
                    borderLeft: '3px solid #E8001D', padding: '1.25rem 1.5rem',
                    borderBottom: idx < announcements.length - 1 && idx < 2 ? '1px solid #1A1A1A' : 'none',
                    background: 'transparent', transition: 'background 200ms ease'
                  }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 16, color: '#F0F0F0', letterSpacing: '0.02em' }}>{a.title}</p>
                    <p style={{ color: '#888', fontSize: 13, marginTop: 4, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
