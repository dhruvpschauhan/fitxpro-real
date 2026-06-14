import { useEffect, useState, useCallback } from 'react'
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import client from '../../api/client'

const fetchPlans = () => client.get('/admin/plans/').then(r => r.data)
const createPlan = (body) => client.post('/admin/plans/', body).then(r => r.data)
const togglePlan = (id, is_active) => client.patch(`/admin/plans/${id}`, { is_active }).then(r => r.data)

const DURATION_PRESETS = [
  { label: '1 MONTH', days: 30 },
  { label: '3 MONTHS', days: 90 },
  { label: '6 MONTHS', days: 180 },
  { label: '1 YEAR', days: 365 },
]

export default function Plans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ name: '', duration_days: 30, price: '', description: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setPlans(await fetchPlans()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await createPlan({ ...form, price: parseFloat(form.price), duration_days: parseInt(form.duration_days) })
      setIsOpen(false)
      setForm({ name: '', duration_days: 30, price: '', description: '' })
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create plan.')
    } finally { setBusy(false) }
  }

  const handleToggle = async (plan) => {
    await togglePlan(plan.id, !plan.is_active)
    await load()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-page-title">MEMBERSHIP PLANS</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>{plans.filter(p => p.is_active).length} active plans</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="btn-primary"><Plus size={16} strokeWidth={2.5} /> NEW PLAN</button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {plans.map(plan => (
            <div key={plan.id} style={{
              background: '#111', border: '1px solid #1E1E1E', borderRadius: 4,
              borderLeft: `3px solid ${plan.is_active ? '#E8001D' : '#333'}`,
              opacity: plan.is_active ? 1 : 0.5,
              transition: 'opacity 150ms ease',
            }}>
              {/* Plan Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1E1E1E' }}>
                <p className="text-label-sm" style={{ marginBottom: 4 }}>
                  {plan.duration_days >= 365 ? 'ANNUAL' : plan.duration_days >= 180 ? 'SEMI-ANNUAL' : plan.duration_days >= 90 ? 'QUARTERLY' : 'MONTHLY'}
                </p>
                <h3 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: '#F0F0F0' }}>
                  {plan.name}
                </h3>
              </div>

              {/* Price + Duration */}
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <p className="text-hero-number" style={{ fontSize: 36, color: plan.is_active ? '#E8001D' : '#555' }}>
                    ₹{parseFloat(plan.price).toLocaleString()}
                  </p>
                  <p style={{ fontSize: 12, color: '#444', fontFamily: '"JetBrains Mono", monospace', marginTop: 2 }}>
                    {plan.duration_days} DAYS
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(plan)}
                  title={plan.is_active ? 'Deactivate' : 'Activate'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: plan.is_active ? '#22C55E' : '#444',
                    transition: 'color 100ms ease',
                  }}
                >
                  {plan.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>

              {plan.description && (
                <div style={{ padding: '0 1.5rem 1.25rem', fontSize: 13, color: '#888' }}>
                  {plan.description}
                </div>
              )}
            </div>
          ))}

          {plans.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#444', border: '1px dashed #242424', borderRadius: 2 }}>
              No plans created. Click NEW PLAN to add one.
            </div>
          )}
        </div>
      )}

      {/* Create Plan Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>CREATE NEW PLAN</h2>
            </div>
            <div className="modal-body">
              {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">PLAN NAME *</label>
                  <input type="text" className="input" style={{ width: '100%' }} required
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly Premium" />
                </div>
                <div>
                  <label className="input-label" style={{ marginBottom: 10 }}>DURATION</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
                    {DURATION_PRESETS.map(p => (
                      <button key={p.days} type="button"
                        onClick={() => setForm({ ...form, duration_days: p.days })}
                        style={{
                          padding: '8px 4px', borderRadius: 2, fontSize: 11, fontWeight: 600,
                          fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em',
                          cursor: 'pointer', transition: 'all 100ms ease', border: 'none',
                          background: form.duration_days === p.days ? '#E8001D' : '#1A1A1A',
                          color: form.duration_days === p.days ? '#fff' : '#888',
                        }}>{p.label}</button>
                    ))}
                  </div>
                  <input type="number" className="input" style={{ width: '100%' }} min={1}
                    value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} placeholder="Custom days" />
                </div>
                <div>
                  <label className="input-label">PRICE (₹) *</label>
                  <input type="number" className="input" style={{ width: '100%' }} required step="0.01" min={0}
                    value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">DESCRIPTION</label>
                  <input type="text" className="input" style={{ width: '100%' }}
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
                </div>
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => setIsOpen(false)} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={busy} className="btn-primary">{busy ? 'CREATING...' : 'CREATE PLAN'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
