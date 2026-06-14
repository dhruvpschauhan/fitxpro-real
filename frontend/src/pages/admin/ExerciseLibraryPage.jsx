import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import client from '../../api/client'

const CATEGORIES = ['Push', 'Pull', 'Legs', 'Core', 'Cardio', 'Full Body', 'Olympic', 'Stretching']
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Full Body']

const CATEGORY_COLORS = {
  Push: '#E8001D', Pull: '#3B82F6', Legs: '#F59E0B', Core: '#8B5CF6',
  Cardio: '#EC4899', 'Full Body': '#10B981', Olympic: '#F97316', Stretching: '#6B7280',
}

function CategoryBadge({ cat }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 2,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
      background: `${CATEGORY_COLORS[cat] || '#333'}22`,
      color: CATEGORY_COLORS[cat] || '#888',
      border: `1px solid ${CATEGORY_COLORS[cat] || '#333'}44`,
      fontFamily: '"Barlow Condensed", sans-serif',
    }}>
      {cat}
    </span>
  )
}

function EditableRow({ row, onSave, onCancel }) {
  const [form, setForm] = useState({ name: row.name, category: row.category, muscle_group: row.muscle_group })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true); setError('')
    try {
      if (row._new) { await client.post('/admin/exercise-library', form) }
      else { await client.patch(`/admin/exercise-library/${row.id}`, form) }
      onSave()
    } catch (e) { setError(e.response?.data?.detail || 'An error occurred') }
    finally { setSaving(false) }
  }

  return (
    <tr style={{ background: '#1A1A1A' }}>
      <td style={{ padding: '8px 12px', borderBottom: '1px solid #1A1A1A' }}>
        <input className="input" style={{ fontSize: 13, width: '100%' }}
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Exercise name" autoFocus />
        {error && <div style={{ fontSize: 11, color: '#E8001D', marginTop: 4 }}>{error}</div>}
      </td>
      <td style={{ padding: '8px 12px', borderBottom: '1px solid #1A1A1A' }}>
        <select className="input" style={{ fontSize: 13, width: '100%' }}
          value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td style={{ padding: '8px 12px', borderBottom: '1px solid #1A1A1A' }}>
        <select className="input" style={{ fontSize: 13, width: '100%' }}
          value={form.muscle_group} onChange={e => setForm(f => ({ ...f, muscle_group: e.target.value }))}>
          {MUSCLE_GROUPS.map(m => <option key={m}>{m}</option>)}
        </select>
      </td>
      <td style={{ padding: '8px 12px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-primary" style={{ fontSize: 11, padding: '5px 12px', minHeight: 32 }} onClick={handleSave} disabled={saving}>
            <Check size={12} /> {saving ? 'SAVING...' : 'SAVE'}
          </button>
          <button className="btn-ghost" style={{ fontSize: 11 }} onClick={onCancel}><X size={12} /></button>
        </div>
      </td>
    </tr>
  )
}

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterMuscle, setFilterMuscle] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (filterCat) params.set('category', filterCat)
      if (filterMuscle) params.set('muscle_group', filterMuscle)
      const { data } = await client.get(`/admin/exercise-library?${params}`)
      setExercises(data)
    } finally { setLoading(false) }
  }, [q, filterCat, filterMuscle])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const handleDelete = async (id) => {
    try {
      await client.delete(`/admin/exercise-library/${id}`)
      setConfirmDelete(null)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not delete.')
      setConfirmDelete(null)
    }
  }

  const cellHead = {
    padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left',
    borderBottom: '1px solid #1E1E1E', fontFamily: '"Barlow Condensed", sans-serif',
    whiteSpace: 'nowrap',
  }
  const cellStyle = { padding: '12px 12px', borderBottom: '1px solid #141414', verticalAlign: 'middle' }

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-page-title">EXERCISE LIBRARY</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>{exercises.length} exercises</p>
        </div>
        <button className="btn-primary" onClick={() => { setAddingNew(true); setEditingId(null) }}>
          <Plus size={14} /> ADD EXERCISE
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
          <input className="input" style={{ paddingLeft: 32, fontSize: 13, width: '100%' }} placeholder="Search exercises..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="input" style={{ fontSize: 13, minWidth: 130 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input" style={{ fontSize: 13, minWidth: 150 }} value={filterMuscle} onChange={e => setFilterMuscle(e.target.value)}>
          <option value="">All Muscles</option>
          {MUSCLE_GROUPS.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      {/* Desktop Table — 4 columns only */}
      <div className="card hide-mobile" style={{ padding: 0 }}>
        <table className="table-grid">
          <thead>
            <tr>
              <th>NAME</th>
              <th>CATEGORY</th>
              <th>MUSCLE GROUP</th>
              <th style={{ textAlign: 'right' }}>EDIT</th>
            </tr>
          </thead>
          <tbody>
            {addingNew && (
              <EditableRow
                row={{ _new: true, name: '', category: 'Push', muscle_group: 'Chest' }}
                onSave={() => { setAddingNew(false); load() }}
                onCancel={() => setAddingNew(false)}
              />
            )}
            {loading && !exercises.length ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#444', padding: '3rem' }}>Loading...</td></tr>
            ) : exercises.length === 0 && !addingNew ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#333', padding: '3rem' }}>No exercises found.</td></tr>
            ) : exercises.map(ex => {
              if (editingId === ex.id) {
                return <EditableRow key={ex.id} row={ex} onSave={() => { setEditingId(null); load() }} onCancel={() => setEditingId(null)} />
              }
              return (
                <tr key={ex.id}
                  onMouseOver={e => e.currentTarget.style.background = '#151515'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ fontWeight: 500, fontSize: 14 }}>{ex.name}</td>
                  <td><CategoryBadge cat={ex.category} /></td>
                  <td style={{ color: '#888', fontSize: 13 }}>{ex.muscle_group}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}
                      onClick={() => { setEditingId(ex.id); setAddingNew(false) }}>
                      <Edit2 size={12} /> EDIT
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="show-mobile">
        {loading && !exercises.length ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>Loading...</p>
        ) : exercises.length === 0 && !addingNew ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>No exercises found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {addingNew && (
              <div style={{ background: '#1A1A1A', border: '1px solid #E8001D', borderRadius: 4, padding: '1rem' }}>
                <EditableRow
                  row={{ _new: true, name: '', category: 'Push', muscle_group: 'Chest' }}
                  onSave={() => { setAddingNew(false); load() }}
                  onCancel={() => setAddingNew(false)}
                />
              </div>
            )}
            {exercises.map(ex => {
              if (editingId === ex.id) {
                return (
                  <div key={ex.id} style={{ background: '#1A1A1A', border: '1px solid #E8001D', borderRadius: 4, padding: '0.5rem' }}>
                    <EditableRow row={ex} onSave={() => { setEditingId(null); load() }} onCancel={() => setEditingId(null)} />
                  </div>
                )
              }
              return (
                <div key={ex.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#F0F0F0', marginBottom: 6 }}>{ex.name}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <CategoryBadge cat={ex.category} />
                      <span style={{ fontSize: 12, color: '#555' }}>{ex.muscle_group}</span>
                    </div>
                  </div>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 10px', flexShrink: 0 }}
                    onClick={() => { setEditingId(ex.id); setAddingNew(false) }}>
                    <Edit2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
