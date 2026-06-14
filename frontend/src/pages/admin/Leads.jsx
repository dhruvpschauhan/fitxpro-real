import { useEffect, useState, useCallback } from 'react'
import { Plus, ArrowRight, Phone, Mail, Users, TrendingUp, UserCheck, UserX, XCircle } from 'lucide-react'
import client from '../../api/client'

const api = {
  list:   () => client.get('/admin/leads/').then(r => r.data),
  create: (b) => client.post('/admin/leads/', b).then(r => r.data),
  update: (id, b) => client.patch(`/admin/leads/${id}`, b).then(r => r.data),
}
const STAGES = ['new', 'contacted', 'interested', 'converted', 'lost']
const STAGE_META = {
  new:        { label: 'NEW',        badge: 'badge-neutral',  icon: Users },
  contacted:  { label: 'CONTACTED',  badge: 'badge-expiring', icon: Phone },
  interested: { label: 'INTERESTED', badge: 'badge-frozen',   icon: TrendingUp },
  converted:  { label: 'CONVERTED',  badge: 'badge-active',   icon: UserCheck },
  lost:       { label: 'LOST',       badge: 'badge-expired',  icon: UserX },
}
const SOURCES = ['Walk-in', 'Social Media', 'Referral', 'Google', 'Website', 'Other']

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', source: 'Walk-in', notes: '', follow_up_date: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setLeads(await api.list()) } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      await api.create({ ...form, follow_up_date: form.follow_up_date || null })
      setIsOpen(false)
      setForm({ name: '', phone: '', email: '', source: 'Walk-in', notes: '', follow_up_date: '' })
      await load()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create lead.') }
    finally { setBusy(false) }
  }
  const advance = async (lead) => {
    const idx = STAGES.indexOf(lead.status)
    if (idx >= STAGES.length - 2) return
    await api.update(lead.id, { status: STAGES[idx + 1] }); await load()
  }
  const markLost = async (lead) => { await api.update(lead.id, { status: 'lost' }); await load() }
  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter)
  const counts = STAGES.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.status === s).length }), {})

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 1280, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="text-page-title">LEADS CRM</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>{leads.length} prospects tracked</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="btn-primary"><Plus size={16} strokeWidth={2.5} /> ADD LEAD</button>
      </div>

      {/* Pipeline Stage Cards */}
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.75rem', overflowX: 'auto', paddingBottom: 4 }}>
        {STAGES.map(s => {
          const Icon = STAGE_META[s].icon
          const active = filter === s
          return (
            <button key={s} onClick={() => setFilter(active ? 'all' : s)} style={{
              flex: '0 0 auto', minWidth: 100, background: '#111',
              border: `1px solid ${active ? '#E8001D' : '#1E1E1E'}`,
              borderLeft: `3px solid ${active ? '#E8001D' : 'transparent'}`,
              borderRadius: 4, padding: '0.875rem 1rem', textAlign: 'left', cursor: 'pointer', transition: 'border-color 100ms ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 26, color: active ? '#E8001D' : '#F0F0F0', lineHeight: 1 }}>{counts[s] || 0}</p>
                <Icon size={13} color={active ? '#E8001D' : '#333'} />
              </div>
              <p className="text-label-sm">{STAGE_META[s].label}</p>
            </button>
          )
        })}
      </div>

      {/* Desktop Table */}
      <div className="card hide-mobile" style={{ padding: 0 }}>
        {loading ? <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p> : (
          <table className="table-grid">
            <thead><tr><th>NAME</th><th>CONTACT</th><th>SOURCE</th><th>FOLLOW-UP</th><th>STATUS</th><th style={{ textAlign: 'right' }}>ACTIONS</th></tr></thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600 }}>{lead.name}</td>
                  <td>
                    {lead.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13 }}><Phone size={11} />{lead.phone}</div>}
                    {lead.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#444', fontSize: 12, marginTop: 2, fontFamily: '"JetBrains Mono", monospace' }}><Mail size={11} />{lead.email}</div>}
                  </td>
                  <td style={{ color: '#888', fontSize: 13 }}>{lead.source || '--'}</td>
                  <td style={{ color: lead.follow_up_date ? '#F59E0B' : '#333', fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>
                    {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase() : '--'}
                  </td>
                  <td><span className={`badge ${STAGE_META[lead.status]?.badge || 'badge-neutral'}`}>{STAGE_META[lead.status]?.label || lead.status?.toUpperCase()}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {lead.status !== 'converted' && lead.status !== 'lost' && (
                        <button onClick={() => advance(lead)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11, minHeight: 32 }}><ArrowRight size={11} /> ADVANCE</button>
                      )}
                      {lead.status !== 'lost' && lead.status !== 'converted' && (
                        <button onClick={() => markLost(lead)} className="btn-danger" style={{ padding: '4px 10px', fontSize: 11, minHeight: 32 }}>LOST</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>{filter === 'all' ? 'No leads yet.' : `No ${filter} leads.`}</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="show-mobile">
        {loading ? <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p>
          : filtered.length === 0 ? <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>{filter === 'all' ? 'No leads yet.' : `No ${filter} leads.`}</p>
          : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {filtered.map(lead => (
              <div key={lead.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#F0F0F0' }}>{lead.name}</div>
                    {lead.source && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{lead.source}</div>}
                  </div>
                  <span className={`badge ${STAGE_META[lead.status]?.badge || 'badge-neutral'}`}>{STAGE_META[lead.status]?.label || lead.status?.toUpperCase()}</span>
                </div>
                {lead.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 12, marginBottom: 3 }}><Phone size={11} />{lead.phone}</div>}
                {lead.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#555', fontSize: 12, fontFamily: '"JetBrains Mono", monospace' }}><Mail size={11} />{lead.email}</div>}
                {lead.follow_up_date && <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 6, fontFamily: '"JetBrains Mono", monospace' }}>FOLLOW-UP: {new Date(lead.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()}</div>}
                {lead.status !== 'converted' && lead.status !== 'lost' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => advance(lead)} className="btn-secondary" style={{ flex: 1, fontSize: 11, minHeight: 36, justifyContent: 'center' }}><ArrowRight size={11} /> ADVANCE</button>
                    <button onClick={() => markLost(lead)} className="btn-danger" style={{ fontSize: 11, minHeight: 36, padding: '0 14px' }}>LOST</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header"><h2>ADD LEAD</h2></div>
            <div className="modal-body">
              {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><label className="input-label">NAME *</label><input type="text" className="input" style={{ width: '100%' }} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid-2col">
                  <div><label className="input-label">PHONE</label><input type="text" className="input" style={{ width: '100%' }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><label className="input-label">SOURCE</label>
                    <select className="input" style={{ width: '100%' }} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                      {SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="input-label">EMAIL</label><input type="email" className="input" style={{ width: '100%' }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="input-label">FOLLOW-UP DATE</label><input type="date" className="input" style={{ width: '100%' }} value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} /></div>
                <div><label className="input-label">NOTES</label><textarea className="input" style={{ width: '100%' }} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => setIsOpen(false)} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={busy} className="btn-primary">{busy ? 'ADDING...' : 'ADD LEAD'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
