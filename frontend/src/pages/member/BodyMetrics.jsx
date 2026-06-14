import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const TODAY = new Date().toISOString().split('T')[0]

const api = {
  // Backend returns ASC (oldest first) — correct order for chart
  getLogs:   ()         => client.get('/admin/finances/body-metrics').then(r => r.data),
  addLog:    (b)        => client.post('/admin/finances/body-metrics', b).then(r => r.data),
  deleteLog: (id)       => client.delete(`/admin/finances/body-metrics/${id}`),
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #333', padding: '10px 14px', borderRadius: 2 }}>
      <p style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: '#E8001D', fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 14 }}>
          {p.value} KG
        </p>
      ))}
    </div>
  )
}

export default function BodyMetrics() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ weight: '', log_date: TODAY })
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try { setLogs(await api.getLogs()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.addLog({ body_weight_kg: parseFloat(form.weight), log_date: form.log_date })
      setIsOpen(false)
      setForm({ weight: '', log_date: TODAY })
      await load()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save. Please try again.')
    } finally { setBusy(false) }
  }

  const handleDelete = async (id) => {
    if (deletingId === id) {
      // Second click = confirm delete
      try {
        await api.deleteLog(id)
        setDeletingId(null)
        await load()
      } catch (e) { console.error(e) }
    } else {
      // First click = arm the delete (turn red)
      setDeletingId(id)
    }
  }

  // Backend returns ASC (oldest→newest). Correct order for chart — no reverse needed.
  const chartData = logs.map(l => ({
    date: new Date(l.log_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase(),
    weight: parseFloat(l.body_weight_kg),
  }))

  // Newest entry is the LAST element (ASC order)
  const latest = logs.length > 0 ? parseFloat(logs[logs.length - 1].body_weight_kg) : null
  const prev   = logs.length > 1 ? parseFloat(logs[logs.length - 2].body_weight_kg) : null
  const change = (latest != null && prev != null) ? (latest - prev).toFixed(1) : null
  const avg    = logs.length > 0 ? (logs.reduce((s, l) => s + parseFloat(l.body_weight_kg), 0) / logs.length).toFixed(1) : null

  // Color change: green if losing weight (negative), amber if gaining
  const changeColor = change
    ? (parseFloat(change) < 0 ? '#22C55E' : '#F59E0B')
    : '#F0F0F0'

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-page-title">BODY METRICS</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Weight tracking and progress — today or future dates only</p>
        </div>
        <button onClick={() => { setError(null); setIsOpen(true) }} className="btn-primary">
          <Plus size={16} strokeWidth={2.5} /> LOG WEIGHT
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid-stats" style={{ marginBottom: '2rem' }}>
        <div className="card-stat">
          <p className="text-label" style={{ marginBottom: 8 }}>CURRENT</p>
          <p className="text-hero-number" style={{ fontSize: 36 }}>{latest ?? '--'}</p>
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#444', marginTop: 4 }}>KG</p>
        </div>
        <div className="card-stat">
          <p className="text-label" style={{ marginBottom: 8 }}>CHANGE</p>
          <p className="text-hero-number" style={{ fontSize: 36, color: changeColor }}>
            {change ? `${parseFloat(change) > 0 ? '+' : ''}${change}` : '--'}
          </p>
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#444', marginTop: 4 }}>KG vs PREV</p>
        </div>
        <div className="card-stat">
          <p className="text-label" style={{ marginBottom: 8 }}>AVERAGE</p>
          <p className="text-hero-number" style={{ fontSize: 36 }}>{avg ?? '--'}</p>
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#444', marginTop: 4 }}>KG</p>
        </div>
      </div>

      {/* Chart — past (left) to future (right) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="text-section" style={{ marginBottom: 24 }}>WEIGHT TREND</h3>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p>
        ) : chartData.length < 2 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Log at least 2 entries to see the trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid stroke="#1E1E1E" horizontal={true} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="weight" stroke="#E8001D" strokeWidth={2} dot={{ fill: '#E8001D', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Log History with Delete */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1E1E1E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="text-section" style={{ fontSize: 14 }}>LOG HISTORY</h3>
          {deletingId && (
            <p style={{ fontSize: 11, color: '#F59E0B', fontFamily: '"JetBrains Mono", monospace' }}>
              CLICK DELETE AGAIN TO CONFIRM
            </p>
          )}
        </div>
        <table className="table-grid">
          <thead>
            <tr>
              <th>DATE</th>
              <th>WEIGHT</th>
              <th style={{ width: 60, textAlign: 'center' }}>DEL</th>
            </tr>
          </thead>
          <tbody>
            {/* Show newest first in the table (reverse of ASC) */}
            {[...logs].reverse().map((l) => (
              <tr key={l.id}>
                <td style={{ color: '#888', fontFamily: '"JetBrains Mono", monospace', fontSize: 13 }}>
                  {new Date(l.log_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                </td>
                <td style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500 }}>
                  {parseFloat(l.body_weight_kg)} KG
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(l.id)}
                    title={deletingId === l.id ? 'Click again to confirm' : 'Delete entry'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                      color: deletingId === l.id ? '#E8001D' : '#333',
                      transition: 'color 100ms ease',
                    }}
                    onMouseOver={e => e.currentTarget.style.color = '#E8001D'}
                    onMouseOut={e => { if (deletingId !== l.id) e.currentTarget.style.color = '#333' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!logs.length && (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#444' }}>No entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Log Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-header"><h2>LOG WEIGHT</h2></div>
            <div className="modal-body">
              <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">WEIGHT (KG) *</label>
                  <input
                    type="number" className="input" style={{ width: '100%' }}
                    required step="0.1" min={20} max={300}
                    value={form.weight}
                    onChange={e => setForm({ ...form, weight: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">DATE * (TODAY OR FUTURE ONLY)</label>
                  <input
                    type="date" className="input" style={{ width: '100%' }}
                    required
                    min={TODAY}
                    value={form.log_date}
                    onChange={e => setForm({ ...form, log_date: e.target.value })}
                  />
                  <p style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Past dates are not allowed.</p>
                </div>
                {error && (
                  <p style={{ fontSize: 12, color: '#E8001D', background: 'rgba(232,0,29,0.08)', padding: '8px 12px', borderRadius: 2, borderLeft: '2px solid #E8001D' }}>
                    {error}
                  </p>
                )}
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => { setIsOpen(false); setError(null) }} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={busy} className="btn-primary">{busy ? 'SAVING...' : 'LOG'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
