import { useState, useEffect } from 'react'
import { Bell, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Users, MailCheck, MessageCircle, RefreshCw } from 'lucide-react'
import client from '../../api/client'

export default function AdminAlertsPage() {
  const [activeTab, setActiveTab]   = useState('expiring')
  const [daysFilter, setDaysFilter] = useState(7)
  const [members,    setMembers]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [sendingAll, setSendingAll] = useState(false)
  const [whatsappIds, setWhatsappIds] = useState({})
  const [renewingIds, setRenewingIds] = useState({})
  const [showLogs,   setShowLogs]   = useState(false)
  const [logs,       setLogs]       = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [toast,      setToast]      = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const endpoint = activeTab === 'expiring'
        ? `/admin/alerts/expiring?days=${daysFilter}`
        : '/admin/alerts/expired'
      const res = await client.get(endpoint)
      setMembers(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const res = await client.get('/admin/alerts/logs')
      setLogs(res.data)
    } catch (e) { console.error(e) }
    finally { setLogsLoading(false) }
  }

  useEffect(() => { fetchMembers() }, [activeTab, daysFilter])
  useEffect(() => { if (showLogs) fetchLogs() }, [showLogs])

  const handleWhatsapp = async (userId) => {
    setWhatsappIds(prev => ({ ...prev, [userId]: 'sending' }))
    try {
      await client.post(`/admin/alerts/whatsapp/${userId}`)
      setWhatsappIds(prev => ({ ...prev, [userId]: 'sent' }))
      setMembers(prev => prev.map(m => m.user_id === userId
        ? { ...m, last_alerted_at: new Date().toISOString() } : m))
      showToast('WhatsApp alert sent!')
      setTimeout(() => setWhatsappIds(prev => ({ ...prev, [userId]: null })), 3000)
    } catch (e) {
      setWhatsappIds(prev => ({ ...prev, [userId]: 'failed' }))
      showToast(e.response?.data?.detail || 'Failed to send WhatsApp.', 'error')
      setTimeout(() => setWhatsappIds(prev => ({ ...prev, [userId]: null })), 3000)
    }
  }

  const handleRenew = async (userId) => {
    if (!window.confirm('Mark this member as renewed? This will extend their plan by its full duration.')) return
    setRenewingIds(prev => ({ ...prev, [userId]: true }))
    try {
      await client.post(`/admin/alerts/renew/${userId}`)
      showToast('Membership renewed successfully!')
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    } catch (e) {
      showToast('Failed to renew membership.', 'error')
    } finally {
      setRenewingIds(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleSendAll = async () => {
    if (!window.confirm(`Send WhatsApp alert to all ${members.length} members in this list?`)) return
    setSendingAll(true)
    try {
      const uids = members.map(m => m.user_id)
      const res = await client.post('/admin/alerts/send-all', { user_ids: uids })
      showToast(`Sent to ${res.data.sent} members via WhatsApp.${res.data.failed > 0 ? ` ${res.data.failed} failed.` : ''}`)
      fetchMembers()
    } catch (e) {
      showToast('Failed to send bulk WhatsApp alerts.', 'error')
    } finally { setSendingAll(false) }
  }

  const urgencyLabel = (days) => {
    if (days < 0)  return { label: `${Math.abs(days)}D OVERDUE`, cls: 'badge badge-expired' }
    if (days === 0) return { label: 'EXPIRES TODAY', cls: 'badge badge-expired' }
    if (days <= 3) return { label: `${days}D LEFT`,   cls: 'badge badge-expired' }
    if (days <= 7) return { label: `${days}D LEFT`,   cls: 'badge badge-expiring' }
    return              { label: `${days}D LEFT`,   cls: 'badge badge-neutral' }
  }

  const formatDate = (isoStr) => {
    if (!isoStr) return '—'
    return new Date(isoStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  const criticalCount = members.filter(m => m.days_remaining <= 3).length
  const alertedCount  = members.filter(m => m.last_alerted_at).length

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 1200, margin: '0 auto', paddingBottom: '3rem' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? '#1A0005' : '#052210',
          border: `1px solid ${toast.type === 'error' ? '#3A0010' : '#0A3A1A'}`,
          color: toast.type === 'error' ? '#E8001D' : '#22C55E',
          padding: '12px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeIn 200ms ease'
        }}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-page-title">MEMBER ALERTS</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Send WhatsApp renewal reminders to members</p>
        </div>
        {members.length > 0 && (
          <button className="btn-primary" onClick={handleSendAll} disabled={sendingAll}
            style={{ background: '#25D366', borderColor: '#25D366', color: '#000' }}>
            <MessageCircle size={14} strokeWidth={2.5} />
            {sendingAll ? 'SENDING...' : `SEND TO ALL (${members.length})`}
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid-stats" style={{ marginBottom: '1.75rem' }}>
        {[
          { icon: Users,         label: 'IN THIS LIST',    value: members.length,              color: '#F0F0F0' },
          { icon: AlertCircle,   label: 'CRITICAL (≤3D)',  value: criticalCount,               color: '#E8001D' },
          { icon: MessageCircle, label: 'ALREADY ALERTED', value: alertedCount,                color: '#25D366' },
          { icon: Bell,          label: 'NOT YET ALERTED', value: members.length - alertedCount, color: '#F59E0B' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card-stat">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <p className="text-label-sm">{label}</p>
              <Icon size={16} color={color} strokeWidth={1.8} />
            </div>
            <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 32, color, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar + Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: 2, background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: 3 }}>
          {['expiring', 'expired'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 20px',
                background: activeTab === tab ? '#E8001D' : 'transparent',
                color: activeTab === tab ? '#fff' : '#888',
                border: 'none', borderRadius: 3, cursor: 'pointer',
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700, fontSize: 13, textTransform: 'uppercase',
                letterSpacing: '0.05em', transition: 'all 120ms ease',
              }}
            >
              {tab === 'expiring' ? 'EXPIRING SOON' : 'EXPIRED'}
            </button>
          ))}
        </div>

        {activeTab === 'expiring' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="text-label-sm">WITHIN</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[3, 7, 14].map(d => (
                <button
                  key={d}
                  onClick={() => setDaysFilter(d)}
                  style={{
                    padding: '5px 14px', fontSize: 12, fontWeight: 600,
                    fontFamily: '"Inter", sans-serif',
                    background: daysFilter === d ? '#1A1A1A' : 'transparent',
                    color: daysFilter === d ? '#F0F0F0' : '#555',
                    border: daysFilter === d ? '1px solid #333' : '1px solid transparent',
                    borderRadius: 3, cursor: 'pointer', transition: 'all 100ms ease',
                  }}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Member List */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>
            <div style={{ width: 24, height: 24, border: '2px solid #333', borderTopColor: '#E8001D', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
            Loading...
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <Bell size={40} color="#1E1E1E" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#555', fontSize: 14 }}>No members in this category.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <table className="table-grid hide-mobile">
              <thead>
                <tr>
                  <th>MEMBER</th>
                  <th>PHONE</th>
                  <th>PLAN</th>
                  <th>{activeTab === 'expiring' ? 'URGENCY' : 'EXPIRED ON'}</th>
                  <th>LAST ALERTED</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const { label, cls } = urgencyLabel(m.days_remaining)
                  const waState = whatsappIds[m.user_id]
                  return (
                    <tr key={m.user_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.full_name}</div>
                        <div style={{ fontSize: 12, color: '#555', fontFamily: '"JetBrains Mono", monospace', marginTop: 2 }}>{m.email}</div>
                      </td>
                      <td style={{ color: '#888', fontSize: 12, fontFamily: '"JetBrains Mono", monospace' }}>
                        {m.phone || <span style={{ color: '#333' }}>—</span>}
                      </td>
                      <td style={{ color: '#888', fontSize: 13 }}>{m.plan_name}</td>
                      <td>
                        {activeTab === 'expiring'
                          ? <span className={cls}>{label}</span>
                          : <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#E8001D' }}>
                              {new Date(m.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                            </span>
                        }
                      </td>
                      <td>
                        {m.last_alerted_at ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MessageCircle size={13} color="#25D366" />
                            <span style={{ fontSize: 12, color: '#888', fontFamily: '"JetBrains Mono", monospace' }}>{formatDate(m.last_alerted_at)}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#333' }}>— Never sent</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          {/* Mark Renewed */}
                          <button
                            onClick={() => handleRenew(m.user_id)}
                            disabled={renewingIds[m.user_id]}
                            style={{
                              padding: '5px 14px', fontSize: 11, minHeight: 32,
                              background: 'transparent', color: '#22C55E',
                              border: '1px solid #104A20', borderRadius: 3,
                              cursor: renewingIds[m.user_id] ? 'not-allowed' : 'pointer',
                              fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5
                            }}
                          >
                            <RefreshCw size={11} />
                            {renewingIds[m.user_id] ? '...' : 'RENEW'}
                          </button>

                          {/* WhatsApp */}
                          {waState === 'sending' ? (
                            <span style={{ color: '#888', fontSize: 12, fontFamily: '"JetBrains Mono", monospace', width: 110, textAlign: 'center' }}>SENDING...</span>
                          ) : waState === 'sent' ? (
                            <span style={{ color: '#25D366', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, width: 110, justifyContent: 'center' }}><CheckCircle2 size={14} /> SENT</span>
                          ) : waState === 'failed' ? (
                            <span style={{ color: '#E8001D', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, width: 110, justifyContent: 'center' }}><AlertCircle size={14} /> FAILED</span>
                          ) : (
                            <button
                              onClick={() => handleWhatsapp(m.user_id)}
                              style={{
                                padding: '5px 14px', fontSize: 11, minHeight: 32, width: 110, justifyContent: 'center',
                                background: '#0A1F0F', color: '#25D366',
                                border: '1px solid #0A3A1A', borderRadius: 3,
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                                fontWeight: 600, transition: 'all 150ms ease'
                              }}
                            >
                              <MessageCircle size={11} /> SEND WA
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="show-mobile" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {members.map((m, i) => {
                const { label, cls } = urgencyLabel(m.days_remaining)
                const waState = whatsappIds[m.user_id]
                return (
                  <div key={m.user_id} style={{
                    padding: '1rem',
                    borderBottom: i < members.length - 1 ? '1px solid #1A1A1A' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#F0F0F0' }}>{m.full_name}</div>
                        <div style={{ fontSize: 11, color: '#666', fontFamily: '"JetBrains Mono", monospace', marginTop: 2 }}>{m.phone || m.email}</div>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className={cls}>{label}</span>
                          <span style={{ fontSize: 11, color: '#555' }}>{m.plan_name}</span>
                        </div>
                        {m.last_alerted_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                            <MessageCircle size={11} color="#25D366" />
                            <span style={{ fontSize: 11, color: '#555', fontFamily: '"JetBrains Mono", monospace' }}>{formatDate(m.last_alerted_at)}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        {/* Renew */}
                        <button
                          onClick={() => handleRenew(m.user_id)}
                          disabled={renewingIds[m.user_id]}
                          style={{
                            padding: '4px 10px', fontSize: 10, minHeight: 28,
                            background: 'transparent', color: '#22C55E',
                            border: '1px solid #104A20', borderRadius: 3,
                            cursor: renewingIds[m.user_id] ? 'not-allowed' : 'pointer',
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <RefreshCw size={9} />
                          {renewingIds[m.user_id] ? '...' : 'RENEW'}
                        </button>

                        {/* WhatsApp */}
                        {waState === 'sending' ? (
                          <span style={{ fontSize: 10, color: '#888', minHeight: 28, display: 'flex', alignItems: 'center' }}>...</span>
                        ) : waState === 'sent' ? (
                          <div style={{ minHeight: 28, display: 'flex', alignItems: 'center' }}><CheckCircle2 size={18} color="#25D366" /></div>
                        ) : waState === 'failed' ? (
                          <div style={{ minHeight: 28, display: 'flex', alignItems: 'center' }}><AlertCircle size={18} color="#E8001D" /></div>
                        ) : (
                          <button
                            onClick={() => handleWhatsapp(m.user_id)}
                            style={{ padding: '4px 10px', fontSize: 10, minHeight: 28, background: '#0A1F0F', color: '#25D366', border: '1px solid #0A3A1A', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                          >
                            <MessageCircle size={10} /> WA
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Alert History */}
      <div style={{ marginTop: '2.5rem' }}>
        <button
          onClick={() => setShowLogs(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#F0F0F0', padding: 0, width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            ALERT HISTORY
          </span>
          {showLogs ? <ChevronUp size={18} color="#555" /> : <ChevronDown size={18} color="#555" />}
        </button>

        {showLogs && (
          <div className="card" style={{ padding: 0, marginTop: '1rem' }}>
            {logsLoading ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#444' }}>Loading logs...</p>
            ) : logs.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#444' }}>No alert history yet.</p>
            ) : (
              <table className="table-grid" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>MEMBER</th>
                    <th className="hide-mobile">PHONE</th>
                    <th className="hide-mobile">REASON</th>
                    <th>SENT AT</th>
                    <th style={{ textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 500 }}>{l.user_name}</td>
                      <td className="hide-mobile" style={{ color: '#555', fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>{l.recipient_phone}</td>
                      <td className="hide-mobile" style={{ color: '#888', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}>{l.trigger_reason?.replace(/_/g, ' ')}</td>
                      <td style={{ color: '#888', fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>{formatDate(l.sent_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={l.status === 'sent' ? 'badge badge-active' : 'badge badge-expired'}>
                          {l.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
