import { useEffect, useState, useCallback } from 'react'
import { Plus, Wrench, Search, CheckCircle, AlertTriangle, Clock, Archive } from 'lucide-react'
import { getEquipment, addEquipment, addMaintenanceLog } from '../../api/admin'

const CONDITION_MAP = {
  good:        { badge: 'badge-active',   label: 'GOOD',        icon: CheckCircle,   color: '#22C55E' },
  fair:        { badge: 'badge-expiring', label: 'FAIR',        icon: AlertTriangle, color: '#F59E0B' },
  maintenance: { badge: 'badge-expired',  label: 'MAINTENANCE', icon: Wrench,        color: '#E8001D' },
  retired:     { badge: 'badge-neutral',  label: 'RETIRED',     icon: Archive,       color: '#444' },
}

export default function Equipment() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isLogOpen, setIsLogOpen] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'Cardio', condition: 'good', serial_number: '', notes: '' })
  const [logForm, setLogForm] = useState({ description: '', cost: '', serviced_by: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setItems(await getEquipment()) } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const handleAdd = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try { await addEquipment(form); setIsAddOpen(false); setForm({ name: '', category: 'Cardio', condition: 'good', serial_number: '', notes: '' }); await load() }
    catch (err) { setError(err.response?.data?.detail || 'Failed.') }
    finally { setBusy(false) }
  }
  const handleLog = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await addMaintenanceLog({ equipment_id: isLogOpen, ...logForm, cost: parseFloat(logForm.cost) || 0 }); setIsLogOpen(null); setLogForm({ description: '', cost: '', serviced_by: '' }) }
    catch (err) { console.error(err) }
    finally { setBusy(false) }
  }

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  const condCounts = ['good', 'fair', 'maintenance', 'retired'].map(c => ({ key: c, count: items.filter(i => i.condition === c).length }))

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 1280, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="text-page-title">EQUIPMENT</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>{items.length} items tracked</p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="btn-primary"><Plus size={16} strokeWidth={2.5} /> ADD EQUIPMENT</button>
      </div>

      {/* Condition Summary */}
      <div className="grid-stats" style={{ marginBottom: '1.75rem' }}>
        {condCounts.map(c => {
          const { label, icon: Icon, color } = CONDITION_MAP[c.key]
          return (
            <div key={c.key} className="card-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p className="text-label-sm">{label}</p>
                <Icon size={15} color={color} strokeWidth={1.8} />
              </div>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 32, color, lineHeight: 1 }}>{c.count}</p>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem', position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
        <input type="text" placeholder="Search equipment..." className="input" style={{ width: '100%', paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Desktop Table */}
      <div className="card hide-mobile" style={{ padding: 0 }}>
        {loading ? <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p> : (
          <table className="table-grid">
            <thead><tr><th>NAME</th><th>CATEGORY</th><th>SERIAL</th><th>CONDITION</th><th style={{ textAlign: 'right' }}>ACTIONS</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td style={{ color: '#888', fontSize: 13 }}>{item.category}</td>
                  <td style={{ color: '#555', fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>{item.serial_number || '--'}</td>
                  <td><span className={`badge ${CONDITION_MAP[item.condition]?.badge || 'badge-neutral'}`}>{CONDITION_MAP[item.condition]?.label || item.condition?.toUpperCase()}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setIsLogOpen(item.id)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: 11, minHeight: 32 }}><Wrench size={11} /> LOG</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>No equipment found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="show-mobile">
        {loading ? <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p>
          : filtered.length === 0 ? <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>No equipment found.</p>
          : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {filtered.map(item => (
              <div key={item.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#F0F0F0' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{item.category}{item.serial_number ? ` · ${item.serial_number}` : ''}</div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${CONDITION_MAP[item.condition]?.badge || 'badge-neutral'}`}>{CONDITION_MAP[item.condition]?.label || item.condition?.toUpperCase()}</span>
                  </div>
                </div>
                <button onClick={() => setIsLogOpen(item.id)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11, flexShrink: 0, minHeight: 36 }}><Wrench size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Equipment Modal */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header"><h2>ADD EQUIPMENT</h2></div>
            <div className="modal-body">
              {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
              <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><label className="input-label">NAME *</label><input type="text" className="input" style={{ width: '100%' }} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid-2col">
                  <div><label className="input-label">CATEGORY</label>
                    <select className="input" style={{ width: '100%' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {['Cardio', 'Strength', 'Free Weights', 'Cables', 'Functional', 'Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="input-label">CONDITION</label>
                    <select className="input" style={{ width: '100%' }} value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                      {['good', 'fair', 'maintenance', 'retired'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="input-label">SERIAL NUMBER</label><input type="text" className="input" style={{ width: '100%' }} value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} /></div>
                <div><label className="input-label">NOTES</label><textarea className="input" style={{ width: '100%' }} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => setIsAddOpen(false)} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={busy} className="btn-primary">{busy ? 'ADDING...' : 'ADD EQUIPMENT'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Log Modal */}
      {isLogOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h2>LOG MAINTENANCE</h2></div>
            <div className="modal-body">
              <form onSubmit={handleLog} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><label className="input-label">DESCRIPTION *</label><textarea className="input" style={{ width: '100%' }} rows={3} required value={logForm.description} onChange={e => setLogForm({ ...logForm, description: e.target.value })} /></div>
                <div className="grid-2col">
                  <div><label className="input-label">COST (₹)</label><input type="number" className="input" style={{ width: '100%' }} step="0.01" value={logForm.cost} onChange={e => setLogForm({ ...logForm, cost: e.target.value })} /></div>
                  <div><label className="input-label">SERVICED BY</label><input type="text" className="input" style={{ width: '100%' }} value={logForm.serviced_by} onChange={e => setLogForm({ ...logForm, serviced_by: e.target.value })} /></div>
                </div>
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => setIsLogOpen(null)} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={busy} className="btn-primary">{busy ? 'SAVING...' : 'SAVE LOG'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
