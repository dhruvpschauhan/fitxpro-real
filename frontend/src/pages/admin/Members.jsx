import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, ChevronRight } from 'lucide-react'
import {
  getUsers, createUser, updateUser, getMembershipPlans,
  assignMembership, getUserMemberships
} from '../../api/admin'

const today = new Date().toISOString().split('T')[0]

export default function Members() {
  const [members,      setMembers]      = useState([])
  const [plans,        setPlans]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [searchTerm,   setSearchTerm]   = useState('')

  // Add-member modal
  const [isAddOpen,    setIsAddOpen]    = useState(false)
  const [formData,     setFormData]     = useState({ username: '', password: '', full_name: '', email: '', phone: '', profile_photo: '' })
  const [addError,     setAddError]     = useState('')
  const [addBusy,      setAddBusy]      = useState(false)

  // Edit-member modal
  const [isEditOpen,    setIsEditOpen]    = useState(false)
  const [editData,      setEditData]      = useState({ full_name: '', email: '', phone: '', password: '', profile_photo: '' })
  const [editError,     setEditError]     = useState('')
  const [editBusy,      setEditBusy]      = useState(false)

  // Member detail drawer
  const [selected,     setSelected]     = useState(null)
  const [memberships,  setMemberships]  = useState([])
  const [drawerLoading, setDrawerLoading] = useState(false)

  // Assign plan modal
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [assignForm,   setAssignForm]   = useState({ plan_id: '', start_date: today, amount_paid: '', payment_mode: 'cash', notes: '' })
  const [assignError,  setAssignError]  = useState('')
  const [assignBusy,   setAssignBusy]   = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const data = await getUsers()
      setMembers(data.filter(u => u.role === 'member'))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchMembers()
    getMembershipPlans().then(setPlans).catch(console.error)
  }, [fetchMembers])

  const openDrawer = async (member) => {
    setSelected(member)
    setDrawerLoading(true)
    try { setMemberships(await getUserMemberships(member.id)) }
    catch { setMemberships([]) }
    finally { setDrawerLoading(false) }
  }

  const closeDrawer = () => { setSelected(null); setMemberships([]) }

  const handleAddMember = async (e) => {
    e.preventDefault()
    setAddError('')
    setAddBusy(true)
    try {
      await createUser({ ...formData, role: 'member' })
      setIsAddOpen(false)
      setFormData({ username: '', password: '', full_name: '', email: '', phone: '', profile_photo: '' })
      await fetchMembers()
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Failed to create member.')
    } finally { setAddBusy(false) }
  }

  const handleEditMember = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditBusy(true)
    try {
      const payload = { ...editData }
      if (!payload.password) delete payload.password
      const updatedUser = await updateUser(selected.id, payload)
      setIsEditOpen(false)
      await fetchMembers()
      setSelected(updatedUser)
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update member.')
    } finally { setEditBusy(false) }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    setAssignError('')
    setAssignBusy(true)
    try {
      const selectedPlan = plans.find(p => p.id === assignForm.plan_id)
      await assignMembership({
        user_id: selected.id, plan_id: assignForm.plan_id,
        start_date: assignForm.start_date,
        amount_paid: parseFloat(assignForm.amount_paid || selectedPlan?.price || 0),
        payment_mode: assignForm.payment_mode, notes: assignForm.notes || null,
      })
      setIsAssignOpen(false)
      setAssignForm({ plan_id: '', start_date: today, amount_paid: '', payment_mode: 'cash', notes: '' })
      setMemberships(await getUserMemberships(selected.id))
    } catch (err) {
      setAssignError(err.response?.data?.detail || 'Failed to assign plan.')
    } finally { setAssignBusy(false) }
  }

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPlanName = (planId) => plans.find(p => p.id === planId)?.name ?? planId

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-page-title">MEMBERS</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>{members.length} registered</p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="btn-primary">
          <Plus size={16} strokeWidth={2.5} /> ADD MEMBER
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
          <input
            type="text" placeholder="Search name or email..."
            className="input" style={{ width: '100%', paddingLeft: 36 }}
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="card hide-mobile" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p>
        ) : (
          <table className="table-grid">
            <thead>
              <tr>
                <th>NAME</th>
                <th>CONTACT</th>
                <th>STATUS</th>
                <th>JOINED</th>
                <th style={{ textAlign: 'right', width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => openDrawer(m)}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {m.profile_photo ? (
                        <img src={m.profile_photo} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1A1A1A', border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#E8001D' }}>
                          {m.full_name[0].toUpperCase()}
                        </div>
                      )}
                      {m.full_name}
                    </div>
                  </td>
                  <td>
                    <div style={{ color: '#F0F0F0' }}>{m.email}</div>
                    <div style={{ fontSize: 12, color: '#444', fontFamily: '"JetBrains Mono", monospace' }}>{m.phone || '--'}</div>
                  </td>
                  <td>
                    <span className={m.is_active ? 'badge badge-active' : 'badge badge-expired'}>
                      {m.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ color: '#888', fontFamily: '"JetBrains Mono", monospace', fontSize: 13 }}>
                    {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <ChevronRight size={16} style={{ color: '#444' }} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>No members found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Card List */}
      <div className="show-mobile">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>No members found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {filtered.map(m => (
              <div
                key={m.id}
                onClick={() => openDrawer(m)}
                style={{
                  background: '#111', border: '1px solid #1E1E1E', borderRadius: 4,
                  padding: '0.875rem 1rem', display: 'flex', alignItems: 'center',
                  gap: 12, cursor: 'pointer', transition: 'border-color 120ms ease'
                }}
              >
                {m.profile_photo ? (
                  <img src={m.profile_photo} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1A1A1A', border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#E8001D', flexShrink: 0 }}>
                    {m.full_name[0].toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#F0F0F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name}</div>
                  <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span className={m.is_active ? 'badge badge-active' : 'badge badge-expired'}>
                    {m.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <ChevronRight size={14} style={{ color: '#444' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member Detail Drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' }} onClick={closeDrawer} />
          <div style={{
            position: 'relative', width: '100%', maxWidth: 'min(420px, 100vw)', background: '#111',
            height: '100%', display: 'flex', flexDirection: 'column',
            borderLeft: '1px solid #1E1E1E', zIndex: 50,
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #1E1E1E' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {selected.profile_photo ? (
                  <img src={selected.profile_photo} alt="" style={{ width: 40, height: 40, borderRadius: 2, objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: 2, background: '#1A1A1A', border: '1px solid #2A2A2A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18, color: '#E8001D',
                  }}>{selected.full_name[0].toUpperCase()}</div>
                )}
                <div>
                  <h2 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>{selected.full_name}</h2>
                  <p style={{ fontSize: 12, color: '#444' }}>@{selected.username}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => {
                  setEditData({ full_name: selected.full_name, email: selected.email, phone: selected.phone || '', password: '', profile_photo: selected.profile_photo || '' })
                  setIsEditOpen(true)
                }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>EDIT</button>
                <button onClick={closeDrawer} className="btn-ghost">CLOSE</button>
              </div>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
                {[
                  ['EMAIL', selected.email],
                  ['PHONE', selected.phone || '--'],
                  ['ROLE', selected.role?.toUpperCase()],
                  ['JOINED', new Date(selected.created_at).toLocaleDateString('en-IN').toUpperCase()],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: '#1A1A1A', border: '1px solid #242424', borderRadius: 2, padding: '0.75rem 1rem' }}>
                    <p className="text-label-sm" style={{ marginBottom: 4 }}>{l}</p>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Membership History */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="text-section" style={{ fontSize: 14 }}>MEMBERSHIP HISTORY</h3>
                <button onClick={() => setIsAssignOpen(true)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  ASSIGN PLAN
                </button>
              </div>

              {drawerLoading ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#444' }}>Loading...</p>
              ) : memberships.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed #242424', borderRadius: 2, color: '#444' }}>
                  <p style={{ fontSize: 13 }}>No memberships assigned.</p>
                  <button onClick={() => setIsAssignOpen(true)} style={{
                    marginTop: 8, background: 'none', border: 'none', color: '#E8001D',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>+ ASSIGN A PLAN</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {memberships.map(m => (
                    <div key={m.id} style={{ background: '#1A1A1A', border: '1px solid #242424', borderRadius: 2, padding: '0.75rem 1rem', borderLeft: `3px solid ${m.status === 'active' ? '#22C55E' : m.status === 'expired' ? '#E8001D' : '#444'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{getPlanName(m.plan_id)}</p>
                        <span className={`badge ${m.status === 'active' ? 'badge-active' : m.status === 'expired' ? 'badge-expired' : 'badge-neutral'}`}>
                          {m.status?.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 4, fontFamily: '"JetBrains Mono", monospace' }}>
                        {m.start_date} → {m.end_date}
                      </p>
                      {m.amount_paid && (
                        <p style={{ fontSize: 12, color: '#888', marginTop: 2, fontFamily: '"JetBrains Mono", monospace' }}>
                          ₹{parseFloat(m.amount_paid).toLocaleString()} / {m.payment_mode?.toUpperCase()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>ADD NEW MEMBER</h2>
            </div>
            <div className="modal-body">
              {addError && <div className="error-box" style={{ marginBottom: 16 }}>{addError}</div>}
              <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">PROFILE PHOTO</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {formData.profile_photo && <img src={formData.profile_photo} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />}
                    <input type="file" accept="image/*" className="input" style={{ width: '100%' }}
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setFormData({ ...formData, profile_photo: reader.result });
                          reader.readAsDataURL(file);
                        }
                      }} />
                  </div>
                </div>
                {[
                  { label: 'FULL NAME', key: 'full_name', type: 'text', required: true },
                  { label: 'EMAIL', key: 'email', type: 'email', required: true },
                  { label: 'PHONE', key: 'phone', type: 'text', required: false },
                  { label: 'USERNAME', key: 'username', type: 'text', required: true },
                  { label: 'PASSWORD', key: 'password', type: 'password', required: true },
                ].map(f => (
                  <div key={f.key}>
                    <label className="input-label">{f.label}{f.required ? ' *' : ''}</label>
                    <input type={f.type} className="input" style={{ width: '100%' }} required={f.required}
                      value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => setIsAddOpen(false)} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={addBusy} className="btn-primary">
                    {addBusy ? 'SAVING...' : 'SAVE MEMBER'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {isEditOpen && selected && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>EDIT MEMBER</h2>
            </div>
            <div className="modal-body">
              {editError && <div className="error-box" style={{ marginBottom: 16 }}>{editError}</div>}
              <form onSubmit={handleEditMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">PROFILE PHOTO</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {editData.profile_photo && <img src={editData.profile_photo} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />}
                    <input type="file" accept="image/*" className="input" style={{ width: '100%' }}
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setEditData({ ...editData, profile_photo: reader.result });
                          reader.readAsDataURL(file);
                        }
                      }} />
                  </div>
                </div>
                {[
                  { label: 'FULL NAME', key: 'full_name', type: 'text', required: true },
                  { label: 'EMAIL', key: 'email', type: 'email', required: true },
                  { label: 'PHONE', key: 'phone', type: 'text', required: false },
                  { label: 'NEW PASSWORD (leave blank to keep current)', key: 'password', type: 'password', required: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="input-label">{f.label}{f.required ? ' *' : ''}</label>
                    <input type={f.type} className="input" style={{ width: '100%' }} required={f.required}
                      value={editData[f.key]} onChange={e => setEditData({ ...editData, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => setIsEditOpen(false)} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={editBusy} className="btn-primary">
                    {editBusy ? 'SAVING...' : 'SAVE CHANGES'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {isAssignOpen && selected && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>ASSIGN MEMBERSHIP</h2>
              <p style={{ fontSize: 12, color: '#444', marginTop: 2 }}>TO {selected.full_name.toUpperCase()}</p>
            </div>
            <div className="modal-body">
              {assignError && <div className="error-box" style={{ marginBottom: 16 }}>{assignError}</div>}
              <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">PLAN *</label>
                  <select className="input" style={{ width: '100%' }} required value={assignForm.plan_id}
                    onChange={e => {
                      const plan = plans.find(p => p.id === e.target.value)
                      setAssignForm({ ...assignForm, plan_id: e.target.value, amount_paid: plan?.price?.toString() || '' })
                    }}>
                    <option value="">Select a plan</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} -- ₹{parseFloat(p.price).toLocaleString()} / {p.duration_days}d</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">START DATE *</label>
                  <input type="date" className="input" style={{ width: '100%' }} required
                    value={assignForm.start_date} onChange={e => setAssignForm({ ...assignForm, start_date: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="input-label">AMOUNT (₹) *</label>
                    <input type="number" className="input" style={{ width: '100%' }} step="0.01" required
                      value={assignForm.amount_paid} onChange={e => setAssignForm({ ...assignForm, amount_paid: e.target.value })} />
                  </div>
                  <div>
                    <label className="input-label">MODE</label>
                    <select className="input" style={{ width: '100%' }} value={assignForm.payment_mode}
                      onChange={e => setAssignForm({ ...assignForm, payment_mode: e.target.value })}>
                      <option value="cash">CASH</option>
                      <option value="upi">UPI</option>
                      <option value="card">CARD</option>
                      <option value="bank_transfer">BANK TRANSFER</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="input-label">NOTES</label>
                  <textarea className="input" style={{ width: '100%' }} rows={2}
                    value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} />
                </div>
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" onClick={() => setIsAssignOpen(false)} className="btn-ghost">CANCEL</button>
                  <button type="submit" disabled={assignBusy} className="btn-primary">
                    {assignBusy ? 'ASSIGNING...' : 'ASSIGN PLAN'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
