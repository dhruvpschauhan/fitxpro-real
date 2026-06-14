import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit2, Eye, EyeOff } from 'lucide-react'
import client from '../../api/client'

const GOAL_LABELS = {
  strength: 'STRENGTH', fat_loss: 'FAT LOSS', endurance: 'ENDURANCE',
  hypertrophy: 'HYPERTROPHY', general_fitness: 'GENERAL FITNESS',
}
const DIFF_COLORS = {
  beginner: '#22C55E', intermediate: '#F59E0B', advanced: '#E8001D',
}

export default function WorkoutPrograms() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', difficulty: 'beginner', goal_tag: 'general_fitness' })
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/admin/workout-programs')
      setPrograms(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const { data } = await client.post('/admin/workout-programs', form)
      setShowCreate(false)
      setForm({ name: '', description: '', difficulty: 'beginner', goal_tag: 'general_fitness' })
      navigate(`/admin/workouts/${data.id}`)
    } catch (err) { console.error(err) }
    finally { setCreating(false) }
  }

  const handleTogglePublish = async (id, e) => {
    e.stopPropagation()
    try {
      const { data } = await client.patch(`/admin/workout-programs/${id}/publish`)
      setPrograms(prev => prev.map(p => p.id === id ? { ...p, is_published: data.is_published } : p))
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id, name, e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await client.delete(`/admin/workout-programs/${id}`)
      setPrograms(prev => prev.filter(p => p.id !== id))
    } catch (err) { console.error(err) }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-page-title">WORKOUT PROGRAMS</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Build and publish training programs for members</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} strokeWidth={2.5} /> CREATE PROGRAM
        </button>
      </div>

      {/* Program List */}
      {loading ? (
        <p style={{ color: '#444', padding: '3rem 0', textAlign: 'center' }}>Loading programs...</p>
      ) : programs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: 4 }}>
          <p style={{ color: '#333', fontSize: 14 }}>No programs yet. Create your first one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {programs.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/admin/workouts/${p.id}`)}
              style={{
                background: '#111', border: '1px solid #1E1E1E',
                borderLeft: `3px solid ${p.is_published ? '#E8001D' : '#333'}`,
                borderRadius: 4, padding: '1.25rem 1.5rem',
                cursor: 'pointer', transition: 'background 80ms ease',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '1rem',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#1A1A1A'}
              onMouseOut={e => e.currentTarget.style.background = '#111'}
            >
              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h3 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>
                    {p.name}
                  </h3>
                  <span className={p.is_published ? 'badge badge-active' : 'badge badge-neutral'}>
                    {p.is_published ? 'PUBLISHED' : 'DRAFT'}
                  </span>
                </div>
                {p.description && (
                  <p style={{ fontSize: 13, color: '#555', marginBottom: 8, maxWidth: 500 }}>{p.description}</p>
                )}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: DIFF_COLORS[p.difficulty] || '#888', fontFamily: '"JetBrains Mono", monospace', fontWeight: 500 }}>
                    {p.difficulty?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: '#888', fontFamily: '"JetBrains Mono", monospace' }}>
                    {GOAL_LABELS[p.goal_tag] || p.goal_tag}
                  </span>
                  <span style={{ fontSize: 11, color: '#555', fontFamily: '"JetBrains Mono", monospace' }}>
                    {p.day_count} DAYS / {p.exercise_count} EXERCISES
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <button
                  className="btn-ghost"
                  title={p.is_published ? 'Unpublish' : 'Publish'}
                  onClick={(e) => handleTogglePublish(p.id, e)}
                  style={{ padding: '8px', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {p.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/admin/workouts/${p.id}`)}
                  style={{ padding: '8px 14px', fontSize: 12 }}
                >
                  <Edit2 size={13} /> EDIT
                </button>
                <button
                  className="btn-danger"
                  onClick={(e) => handleDelete(p.id, p.name, e)}
                  style={{ padding: '8px 14px', fontSize: 12 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-header"><h2>CREATE PROGRAM</h2></div>
            <div className="modal-body">
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">PROGRAM NAME *</label>
                  <input className="input" style={{ width: '100%' }} required
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Push Pull Legs Split"
                  />
                </div>
                <div>
                  <label className="input-label">SHORT DESCRIPTION</label>
                  <textarea className="input" style={{ width: '100%', minHeight: 60 }}
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief overview..."
                  />
                </div>
                <div className="grid-2col">
                  <div>
                    <label className="input-label">DIFFICULTY</label>
                    <select className="input" style={{ width: '100%' }}
                      value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">GOAL</label>
                    <select className="input" style={{ width: '100%' }}
                      value={form.goal_tag} onChange={e => setForm({ ...form, goal_tag: e.target.value })}>
                      <option value="general_fitness">General Fitness</option>
                      <option value="strength">Strength</option>
                      <option value="hypertrophy">Hypertrophy</option>
                      <option value="fat_loss">Fat Loss</option>
                      <option value="endurance">Endurance</option>
                    </select>
                  </div>
                </div>
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 8 }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>CANCEL</button>
                  <button type="submit" className="btn-primary" disabled={creating}>
                    {creating ? 'CREATING...' : 'CREATE & EDIT'}
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
