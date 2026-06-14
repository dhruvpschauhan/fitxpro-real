import { useEffect, useState, useCallback } from 'react'
import { Plus, Download } from 'lucide-react'
import client from '../../api/client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const api = {
  summary:  () => client.get('/admin/finances/summary').then(r => r.data),
  expenses: () => client.get('/admin/finances/expenses').then(r => r.data),
  addExp:   (b) => client.post('/admin/finances/expenses', b).then(r => r.data),
}

const CATEGORIES = ['Rent', 'Utilities', 'Equipment', 'Salaries', 'Marketing', 'Maintenance', 'Other']
const TREND = [
  { month: 'JAN', revenue: 48000, expenses: 18000 },
  { month: 'FEB', revenue: 52000, expenses: 21000 },
  { month: 'MAR', revenue: 61000, expenses: 19000 },
  { month: 'APR', revenue: 55000, expenses: 22000 },
  { month: 'MAY', revenue: 67000, expenses: 20000 },
  { month: 'JUN', revenue: 71000, expenses: 24000 },
]

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #333', padding: '10px 14px', borderRadius: 2 }}>
      <p style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 13 }}>
          ₹{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function Finances() {
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ category: 'Rent', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('transactions')

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([api.summary(), api.expenses()])
      setSummary(s)
      setExpenses(e)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAddExpense = async (ev) => {
    ev.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.addExp({ ...form, amount: parseFloat(form.amount) })
      setIsOpen(false)
      setForm({ category: 'Rent', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0] })
      await load()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to record expense.') }
    finally { setBusy(false) }
  }

  const stats = summary ? [
    { label: 'REVENUE (MONTH)',  value: `₹${summary.revenue_this_month.toLocaleString()}` },
    { label: 'EXPENSES (MONTH)', value: `₹${summary.expenses_this_month.toLocaleString()}` },
    { label: 'NET PROFIT',       value: `₹${summary.net_this_month.toLocaleString()}` },
    { label: 'ACTIVE MEMBERS',   value: summary.active_members },
  ] : []

  return (
    <div style={{ padding: '2rem', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-page-title">FINANCES</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Revenue, expenses and cash flow</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setIsOpen(true)} className="btn-primary"><Plus size={16} strokeWidth={2.5} /> RECORD EXPENSE</button>
          <button className="btn-secondary"><Download size={16} /> EXPORT</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {loading
          ? Array(4).fill(0).map((_, i) => <div key={i} className="card-stat" style={{ height: 80 }} />)
          : stats.map((s, i) => (
            <div key={i} className="card-stat">
              <p className="text-label" style={{ marginBottom: 8 }}>{s.label}</p>
              <p className="text-hero-number" style={{ fontSize: 36 }}>{s.value}</p>
            </div>
          ))}
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="text-section" style={{ marginBottom: 4 }}>REVENUE VS EXPENSES</h3>
        <p className="text-label" style={{ marginBottom: 24, fontSize: 11 }}>6-MONTH TREND</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={TREND} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8001D" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#E8001D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1E1E1E" horizontal={true} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#E8001D" strokeWidth={2} fill="url(#revG)" name="Revenue" />
            <Area type="monotone" dataKey="expenses" stroke="#444" strokeWidth={1.5} fill="transparent" name="Expenses" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 2, marginBottom: '1rem' }}>
        {['transactions', 'expenses'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', borderRadius: 2, fontSize: 12, fontWeight: 600,
            fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: 'pointer', border: 'none', transition: 'all 100ms ease',
            background: tab === t ? '#E8001D' : '#1A1A1A',
            color: tab === t ? '#fff' : '#888',
          }}>{t}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <table className="table-grid">
          {tab === 'transactions' ? (
            <>
              <thead><tr><th>MEMBER</th><th>AMOUNT</th><th>MODE</th><th>DATE</th><th>STATUS</th></tr></thead>
              <tbody>
                {(summary?.recent_transactions || []).map((tx, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{tx.member}</td>
                    <td style={{ color: '#22C55E', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>+₹{tx.amount.toLocaleString()}</td>
                    <td style={{ color: '#888', textTransform: 'uppercase' }}>{tx.mode}</td>
                    <td style={{ color: '#888', fontFamily: '"JetBrains Mono", monospace', fontSize: 13 }}>{tx.date}</td>
                    <td><span className="badge badge-active">{tx.status?.toUpperCase()}</span></td>
                  </tr>
                ))}
                {!loading && !summary?.recent_transactions?.length && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>No transactions yet.</td></tr>
                )}
              </tbody>
            </>
          ) : (
            <>
              <thead><tr><th>CATEGORY</th><th>DESCRIPTION</th><th>AMOUNT</th><th>DATE</th></tr></thead>
              <tbody>
                {expenses.map((exp, i) => (
                  <tr key={i}>
                    <td><span className="badge badge-neutral">{exp.category?.toUpperCase()}</span></td>
                    <td style={{ color: '#888' }}>{exp.description || '--'}</td>
                    <td style={{ color: '#E8001D', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>-₹{parseFloat(exp.amount).toLocaleString()}</td>
                    <td style={{ color: '#888', fontFamily: '"JetBrains Mono", monospace', fontSize: 13 }}>{exp.expense_date}</td>
                  </tr>
                ))}
                {!expenses.length && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>No expenses recorded.</td></tr>
                )}
              </tbody>
            </>
          )}
        </table>
      </div>

      {/* Add Expense Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header"><h2>RECORD EXPENSE</h2></div>
            <div className="modal-body">
              {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
              <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="input-label">CATEGORY</label>
                    <select className="input" style={{ width: '100%' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">AMOUNT (₹) *</label>
                    <input type="number" className="input" style={{ width: '100%' }} required step="0.01" min={0}
                      value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="input-label">DESCRIPTION</label>
                  <input type="text" className="input" style={{ width: '100%' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">DATE *</label>
                  <input type="date" className="input" style={{ width: '100%' }} required value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                </div>
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => setIsOpen(false)} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={busy} className="btn-primary">{busy ? 'SAVING...' : 'SAVE EXPENSE'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
