import { useEffect, useState, useCallback } from 'react'
import { Plus, Download, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react'
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
    <div style={{ 
      background: 'rgba(15, 15, 15, 0.95)', 
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)', 
      padding: '12px 16px', 
      borderRadius: '4px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      <p style={{ color: '#888', fontFamily: '"Inter", sans-serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ color: '#aaa', fontSize: 12, fontFamily: '"Inter", sans-serif' }}>{p.name}</span>
          <span style={{ color: p.color, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: 14 }}>
            ₹{p.value.toLocaleString()}
          </span>
        </div>
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
    { label: 'REVENUE (MONTH)',  value: `₹${summary.revenue_this_month.toLocaleString()}`, icon: TrendingUp, color: '#22C55E' },
    { label: 'EXPENSES (MONTH)', value: `₹${summary.expenses_this_month.toLocaleString()}`, icon: TrendingDown, color: '#E8001D' },
    { label: 'NET PROFIT',       value: `₹${summary.net_this_month.toLocaleString()}`, icon: DollarSign, color: '#3B82F6' },
    { label: 'ACTIVE MEMBERS',   value: summary.active_members, icon: Users, color: '#A855F7' },
  ] : []

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ 
            fontFamily: '"Barlow Condensed", sans-serif', 
            fontSize: '42px', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.02em', 
            color: '#fff', 
            lineHeight: 1 
          }}>
            FINANCES
          </h1>
          <p style={{ color: '#888', fontSize: '13px', fontFamily: '"Inter", sans-serif', marginTop: '6px', letterSpacing: '0.02em' }}>
            Track revenue, operational expenses, and cash flow
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setIsOpen(true)} className="btn-primary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} strokeWidth={2.5} /> RECORD EXPENSE
          </button>
          <button className="btn-secondary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Download size={16} /> EXPORT
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.25rem', 
        marginBottom: '2.5rem' 
      }}>
        {loading
          ? Array(4).fill(0).map((_, i) => <div key={i} style={{ height: 110, background: 'rgba(25,25,25,0.4)', borderRadius: '6px' }} className="animate-pulse" />)
          : stats.map((s, i) => (
            <div key={i} style={{
              background: 'rgba(20, 20, 20, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', 
                background: `radial-gradient(circle at top right, ${s.color}20 0%, transparent 70%)` 
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <p style={{ 
                  color: '#aaa', fontSize: '11px', fontFamily: '"Inter", sans-serif', 
                  fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' 
                }}>
                  {s.label}
                </p>
                <s.icon size={16} color={s.color} style={{ opacity: 0.8 }} />
              </div>
              <p style={{ 
                fontFamily: '"Barlow Condensed", sans-serif', 
                fontSize: '38px', 
                fontWeight: 700, 
                color: '#fff', 
                lineHeight: 1 
              }}>
                {s.value}
              </p>
            </div>
          ))}
      </div>

      {/* Main Chart Area */}
      <div style={{
        background: 'rgba(15, 15, 15, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CASH FLOW TRENDS</h3>
          <p style={{ color: '#666', fontSize: '12px', fontFamily: '"Inter", sans-serif', marginTop: '4px' }}>6-Month Performance Overview</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={TREND} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8001D" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#E8001D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" horizontal={true} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 11, fontFamily: '"Inter", sans-serif' }} axisLine={false} tickLine={false} dy={10} />
            <YAxis tick={{ fill: '#666', fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} dx={-10} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2.5} fill="url(#revG)" name="Revenue" activeDot={{ r: 6, fill: '#22C55E', stroke: '#111', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="expenses" stroke="#E8001D" strokeWidth={2.5} fill="url(#expG)" name="Expenses" activeDot={{ r: 6, fill: '#E8001D', stroke: '#111', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Data Tables Area */}
      <div style={{
        background: 'rgba(15, 15, 15, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          {['transactions', 'expenses'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '16px 0', fontSize: '13px', fontWeight: 600,
              fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em',
              cursor: 'pointer', border: 'none', borderBottom: tab === t ? '2px solid #E8001D' : '2px solid transparent',
              transition: 'all 200ms ease',
              background: tab === t ? 'rgba(232, 0, 29, 0.05)' : 'transparent',
              color: tab === t ? '#fff' : '#666',
            }}>
              {t === 'transactions' ? 'Recent Income' : 'Operating Expenses'}
            </button>
          ))}
        </div>

        {/* Table Container (Responsive Scroll) */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontFamily: '"Inter", sans-serif', fontSize: '13px' }}>
            {tab === 'transactions' ? (
              <>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>MEMBER</th>
                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>AMOUNT</th>
                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>MODE</th>
                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>DATE</th>
                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.recent_transactions || []).map((tx, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 150ms ease' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px 20px', color: '#fff', fontWeight: 500 }}>{tx.member}</td>
                      <td style={{ padding: '16px 20px', color: '#22C55E', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>+₹{tx.amount.toLocaleString()}</td>
                      <td style={{ padding: '16px 20px', color: '#888', textTransform: 'uppercase', fontSize: '12px' }}>{tx.mode}</td>
                      <td style={{ padding: '16px 20px', color: '#888', fontFamily: '"JetBrains Mono", monospace' }}>{tx.date}</td>
                      <td style={{ padding: '16px 20px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>{tx.status?.toUpperCase()}</span></td>
                    </tr>
                  ))}
                  {!loading && !summary?.recent_transactions?.length && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>No transactions recorded yet.</td></tr>
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>CATEGORY</th>
                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>DESCRIPTION</th>
                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>AMOUNT</th>
                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: 600, letterSpacing: '0.05em' }}>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 150ms ease' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#ccc', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>
                          {exp.category?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#aaa' }}>{exp.description || '--'}</td>
                      <td style={{ padding: '16px 20px', color: '#E8001D', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>-₹{parseFloat(exp.amount).toLocaleString()}</td>
                      <td style={{ padding: '16px 20px', color: '#888', fontFamily: '"JetBrains Mono", monospace' }}>{exp.expense_date}</td>
                    </tr>
                  ))}
                  {!expenses.length && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>No expenses recorded yet.</td></tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#111', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', width: '100%', maxWidth: '440px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '0.02em', margin: 0 }}>
                RECORD EXPENSE
              </h2>
            </div>
            <div style={{ padding: '24px' }}>
              {error && <div style={{ background: 'rgba(232, 0, 29, 0.1)', border: '1px solid #E8001D', color: '#E8001D', padding: '12px', borderRadius: '4px', fontSize: '13px', marginBottom: '20px' }}>{error}</div>}
              <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#888', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px' }}>CATEGORY</label>
                    <select className="input" style={{ width: '100%', background: '#1A1A1A', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: '4px', outline: 'none', fontFamily: '"Inter", sans-serif' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#888', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px' }}>AMOUNT (₹) *</label>
                    <input type="number" className="input" style={{ width: '100%', background: '#1A1A1A', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: '4px', outline: 'none', fontFamily: '"JetBrains Mono", monospace' }} required step="0.01" min={0}
                      value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#888', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px' }}>DESCRIPTION</label>
                  <input type="text" className="input" style={{ width: '100%', background: '#1A1A1A', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: '4px', outline: 'none', fontFamily: '"Inter", sans-serif' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Monthly electricity bill" />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#888', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px' }}>DATE *</label>
                  <input type="date" className="input" style={{ width: '100%', background: '#1A1A1A', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: '4px', outline: 'none', fontFamily: '"JetBrains Mono", monospace' }} required value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button type="button" onClick={() => setIsOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: '#888', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: '"Inter", sans-serif' }}>CANCEL</button>
                  <button type="submit" disabled={busy} className="btn-primary" style={{ padding: '10px 20px', border: 'none', background: '#E8001D', color: '#fff', fontSize: '13px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer', fontFamily: '"Inter", sans-serif' }}>{busy ? 'SAVING...' : 'SAVE EXPENSE'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

