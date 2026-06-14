import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import client from '../../api/client'

const api = {
  list:   () => client.get('/announcements/admin').then(r => r.data),
  create: (b) => client.post('/announcements/', b).then(r => r.data),
  delete: (id) => client.delete(`/announcements/${id}`),
}

export default function Announcements() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', expires_at: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setItems(await api.list()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.create({ ...form, expires_at: form.expires_at || null })
      setIsOpen(false)
      setForm({ title: '', body: '', expires_at: '' })
      await load()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to post.') }
    finally { setBusy(false) }
  }

  const handleDeactivate = async (id) => {
    await api.delete(id)
    await load()
  }

  const active = items.filter(i => i.is_active)
  const inactive = items.filter(i => !i.is_active)

  return (
    <div style={{ padding: '2rem', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-page-title">ANNOUNCEMENTS</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>{active.length} active / {inactive.length} archived</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="btn-primary"><Plus size={16} strokeWidth={2.5} /> POST ANNOUNCEMENT</button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Active */}
          {active.map(item => (
            <div key={item.id} style={{
              background: '#111', border: '1px solid #1E1E1E', borderRadius: 4,
              borderLeft: '3px solid #E8001D', padding: '1.25rem 1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: '#F0F0F0' }}>
                  {item.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span className="badge badge-active">ACTIVE</span>
                  <button onClick={() => handleDeactivate(item.id)} className="btn-danger" style={{ padding: '3px 8px', fontSize: 10 }}>
                    ARCHIVE
                  </button>
                </div>
              </div>
              <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.body}</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: 12 }}>
                <span style={{ fontSize: 11, color: '#444', fontFamily: '"JetBrains Mono", monospace' }}>
                  POSTED {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                </span>
                {item.expires_at && (
                  <span style={{ fontSize: 11, color: '#444', fontFamily: '"JetBrains Mono", monospace' }}>
                    EXPIRES {new Date(item.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}

          {active.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed #242424', borderRadius: 2, color: '#444' }}>
              <p style={{ fontSize: 14 }}>No active announcements.</p>
              <button onClick={() => setIsOpen(true)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#E8001D', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                POST ONE
              </button>
            </div>
          )}

          {/* Archived */}
          {inactive.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 className="text-label" style={{ marginBottom: '1rem' }}>ARCHIVED</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {inactive.map(item => (
                  <div key={item.id} style={{
                    background: '#111', border: '1px solid #1E1E1E', borderRadius: 4,
                    borderLeft: '3px solid #242424', padding: '0.75rem 1rem', opacity: 0.5,
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</p>
                    <p style={{ fontSize: 11, color: '#444', fontFamily: '"JetBrains Mono", monospace', marginTop: 2 }}>
                      {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-header"><h2>POST ANNOUNCEMENT</h2></div>
            <div className="modal-body">
              {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">TITLE *</label>
                  <input type="text" className="input" style={{ width: '100%' }} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. HOLIDAY HOURS" />
                </div>
                <div>
                  <label className="input-label">MESSAGE *</label>
                  <textarea className="input" style={{ width: '100%' }} rows={5} required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">EXPIRES (OPTIONAL)</label>
                  <input type="datetime-local" className="input" style={{ width: '100%' }} value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                </div>
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => setIsOpen(false)} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={busy} className="btn-primary">{busy ? 'POSTING...' : 'POST'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
