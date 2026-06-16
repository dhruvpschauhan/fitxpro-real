import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Eye, EyeOff, Search } from 'lucide-react'
import client from '../../api/client'

const GOAL_OPTIONS = [
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'endurance', label: 'Endurance' },
]
const DIFF_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]
const DIFF_COLORS = { beginner: '#22C55E', intermediate: '#F59E0B', advanced: '#E8001D' }

// ── Exercise Name Autocomplete ────────────────────────────────────────────
function ExerciseAutocomplete({ value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const { data } = await client.get(`/admin/exercise-library?q=${encodeURIComponent(q)}`)
      setResults(data)
      setOpen(true)
    } finally { setLoading(false) }
  }, [])

  const handleInput = (e) => {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 300)
  }

  const handleSelect = (item) => {
    setQuery(item.name)
    onChange(item.name)
    onSelect({ name: item.name, library_id: item.id, category: item.category, muscle_group: item.muscle_group })
    setOpen(false)
  }

  const handleAddNew = () => {
    onSelect({ name: query, library_id: null, category: 'Full Body', muscle_group: 'Full Body' })
    setOpen(false)
  }

  const exactMatch = results.some(r => r.name.toLowerCase() === query.toLowerCase())

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1 }}>
      <input
        className="input"
        style={{ fontSize: 13, width: '100%' }}
        placeholder="Search exercise..."
        value={query}
        onChange={handleInput}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        autoFocus
      />
      {loading && (
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#444' }}>...</span>
      )}

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 4,
          maxHeight: 240, overflowY: 'auto', marginTop: 2,
        }}>
          {results.map(item => (
            <div key={item.id}
              onMouseDown={() => handleSelect(item)}
              style={{
                padding: '10px 14px', cursor: 'pointer', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                transition: 'background 80ms',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#242424'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 14, color: '#F0F0F0', fontFamily: '"Inter", sans-serif' }}>{item.name}</span>
              <span style={{ fontSize: 12, color: '#555', fontFamily: '"Inter", sans-serif' }}>{item.muscle_group}</span>
            </div>
          ))}
          {query.length >= 2 && !exactMatch && (
            <div onMouseDown={handleAddNew}
              style={{
                padding: '10px 14px', cursor: 'pointer', borderTop: '1px solid #242424',
                color: '#E8001D', fontSize: 13, fontFamily: '"Inter", sans-serif',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#1E0007'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              Add "{query}" as new exercise
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Inline Exercise Row ───────────────────────────────────────────────────
function ExerciseRow({ ex, onSaved, onDelete }) {
  const [data, setData] = useState({
    name: ex.name, sets: ex.sets || '', reps: ex.reps || '',
    rest_seconds: ex.rest_seconds || '', notes: ex.notes || '',
  })
  const debounce = useRef(null)

  const save = useCallback(async (patch) => {
    try { await client.patch(`/admin/workout-programs/exercises/${ex.id}`, patch) }
    catch (e) { console.error(e) }
  }, [ex.id])

  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }))
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => save({ [field]: value }), 700)
  }

  const inputStyle = {
    background: 'transparent', border: 'none', borderBottom: '1px solid #222',
    color: '#F0F0F0', fontFamily: '"Inter", sans-serif', fontSize: 13,
    padding: '3px 2px', outline: 'none', width: '100%',
  }

  return (
    <div className="exercise-row"
      onMouseOver={e => e.currentTarget.style.background = '#1A1A1A'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      <div className="exercise-row-drag"><GripVertical size={14} style={{ color: '#333', cursor: 'grab' }} /></div>
      <div className="exercise-row-name">
        <input style={{ ...inputStyle, fontWeight: 500 }} value={data.name}
          onChange={e => handleChange('name', e.target.value)} placeholder="Exercise name" />
      </div>
      <div className="exercise-row-inputs">
        <input style={{ ...inputStyle, textAlign: 'center', fontFamily: '"JetBrains Mono", monospace', color: '#E8001D' }}
          value={data.sets} onChange={e => handleChange('sets', e.target.value)} placeholder="Sets" />
        <input style={{ ...inputStyle, textAlign: 'center', fontFamily: '"JetBrains Mono", monospace', color: '#E8001D' }}
          value={data.reps} onChange={e => handleChange('reps', e.target.value)} placeholder="Reps" />
        <input style={{ ...inputStyle, textAlign: 'center', fontFamily: '"JetBrains Mono", monospace', color: '#888' }}
          value={data.rest_seconds} onChange={e => handleChange('rest_seconds', e.target.value)} placeholder="Rest(s)" type="number" />
        <input style={{ ...inputStyle, fontSize: 12, color: '#555' }}
          value={data.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Notes" />
      </div>
      <div className="exercise-row-del">
        <button type="button" onClick={() => onDelete(ex.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', padding: 4 }}
          onMouseOver={e => e.currentTarget.style.color = '#E8001D'}
          onMouseOut={e => e.currentTarget.style.color = '#333'}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Add Exercise Form with Autocomplete ───────────────────────────────────
function AddExerciseForm({ dayId, onDone, onCancel }) {
  const [selected, setSelected] = useState(null) // { name, library_id, category, muscle_group }
  const [nameQuery, setNameQuery] = useState('')
  const [form, setForm] = useState({ sets: '3', reps: '10-12', rest_seconds: 60, notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSelect = (item) => { setSelected(item) }

  const handleSubmit = async () => {
    if (!selected && !nameQuery.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: selected?.name || nameQuery,
        library_id: selected?.library_id || null,
        category: selected?.category || 'Full Body',
        muscle_group: selected?.muscle_group || 'Full Body',
        sets: form.sets,
        reps: form.reps,
        rest_seconds: form.rest_seconds ? Number(form.rest_seconds) : null,
        notes: form.notes,
      }
      await client.post(`/admin/workout-programs/days/${dayId}/exercises`, payload)
      onDone()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const ready = !!(selected || nameQuery.trim())

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid #1A1A1A', background: '#0E0E0E' }}>
      <div className="exercise-row" style={{ padding: 0, border: 'none', marginBottom: 8 }}>
        <div className="exercise-row-name">
          <ExerciseAutocomplete
            value={nameQuery}
            onChange={setNameQuery}
            onSelect={handleSelect}
          />
        </div>
        <div className="exercise-row-inputs">
          <input className="input" style={{ fontSize: 13, textAlign: 'center' }} placeholder="Sets"
            value={form.sets} onChange={e => setForm(f => ({ ...f, sets: e.target.value }))} />
          <input className="input" style={{ fontSize: 13, textAlign: 'center' }} placeholder="Reps"
            value={form.reps} onChange={e => setForm(f => ({ ...f, reps: e.target.value }))} />
          <input className="input" style={{ fontSize: 13, textAlign: 'center' }} placeholder="Rest(s)"
            type="number" value={form.rest_seconds}
            onChange={e => setForm(f => ({ ...f, rest_seconds: e.target.value }))} />
          <input className="input" style={{ fontSize: 13 }} placeholder="Notes"
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>
      {selected && (
        <div style={{ fontSize: 11, color: '#555', marginBottom: 8, fontFamily: '"Inter", sans-serif' }}>
          {selected.category} — {selected.muscle_group}
          {!selected.library_id && <span style={{ color: '#E8001D', marginLeft: 8 }}>Will be added to library</span>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" style={{ fontSize: 12, padding: '6px 16px' }}
          onClick={handleSubmit} disabled={!ready || saving}>
          {saving ? 'SAVING...' : 'ADD'}
        </button>
        <button className="btn-ghost" style={{ fontSize: 12 }} onClick={onCancel}>CANCEL</button>
      </div>
    </div>
  )
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ── Day Card ──────────────────────────────────────────────────────────────
function DayCard({ day, index, onDeleteDay, onRefresh }) {
  const [label, setLabel] = useState(day.day_label)
  const [focus, setFocus] = useState(day.focus || '')
  const [weekDay, setWeekDay] = useState(day.week_day || '')
  const [collapsed, setCollapsed] = useState(false)
  const [addingEx, setAddingEx] = useState(false)
  const debounce = useRef(null)

  const saveDay = (patch) => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      await client.patch(`/admin/workout-programs/days/${day.id}`, patch)
    }, 700)
  }

  const handleDeleteExercise = async (exId) => {
    await client.delete(`/admin/workout-programs/exercises/${exId}`)
    onRefresh()
  }

  const exercises = [...(day.exercises || [])].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, overflow: 'hidden', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 10px', padding: '12px 16px', background: '#131313', borderBottom: '1px solid #1E1E1E' }}>
        <GripVertical size={16} style={{ color: '#333', cursor: 'grab', flexShrink: 0 }} />
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#555', flexShrink: 0 }}>DAY {index + 1}</span>
        <input value={label}
          onChange={e => { setLabel(e.target.value); saveDay({ day_label: e.target.value }) }}
          style={{ flex: '1 1 80px', background: 'transparent', border: 'none', color: '#F0F0F0', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', outline: 'none', minWidth: 80 }}
          placeholder="Day label..." />
        <span style={{ color: '#333', fontSize: 12 }} className="hide-mobile">|</span>
        <input value={focus}
          onChange={e => { setFocus(e.target.value); saveDay({ focus: e.target.value }) }}
          style={{ flex: 2, background: 'transparent', border: 'none', color: '#888', fontFamily: '"Inter", sans-serif', fontSize: 13, outline: 'none', minWidth: 100 }}
          placeholder="Focus (e.g. Chest & Triceps)..." />
        <select
          value={weekDay}
          onChange={e => { setWeekDay(e.target.value); saveDay({ week_day: e.target.value || null }) }}
          style={{
            background: '#0E0E0E', border: '1px solid #222', borderRadius: 2,
            color: weekDay ? '#E8001D' : '#444', fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 600, fontSize: 12, padding: '3px 6px', cursor: 'pointer',
            textTransform: 'uppercase', outline: 'none', flexShrink: 0,
          }}
        >
          <option value="">Any Day</option>
          {WEEK_DAYS.map(d => <option key={d} value={d}>{d.slice(0, 3).toUpperCase()}</option>)}
        </select>
        <button type="button" onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4, flexShrink: 0 }}>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <button type="button" onClick={() => onDeleteDay(day.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', padding: 4, flexShrink: 0 }}
          onMouseOver={e => e.currentTarget.style.color = '#E8001D'}
          onMouseOut={e => e.currentTarget.style.color = '#333'}>
          <Trash2 size={14} />
        </button>
      </div>

      {!collapsed && (
        <>
          {exercises.length > 0 && (
            <div className="hide-mobile" style={{ display: 'grid', gridTemplateColumns: '28px 1fr 70px 80px 60px 70px 28px', gap: 8, padding: '6px 12px', background: '#0E0E0E', borderBottom: '1px solid #1A1A1A' }}>
              {['', 'EXERCISE', 'SETS', 'REPS', 'REST', 'NOTES', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 500, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i >= 2 && i <= 4 ? 'center' : 'left' }}>{h}</span>
              ))}
            </div>
          )}

          {exercises.map(ex => (
            <ExerciseRow key={ex.id} ex={ex} onSaved={onRefresh} onDelete={handleDeleteExercise} />
          ))}

          {exercises.length === 0 && !addingEx && (
            <p style={{ padding: '1.25rem', color: '#333', fontSize: 13, textAlign: 'center' }}>
              No exercises yet. Add the first one below.
            </p>
          )}

          {addingEx ? (
            <AddExerciseForm
              dayId={day.id}
              onDone={() => { setAddingEx(false); onRefresh() }}
              onCancel={() => setAddingEx(false)}
            />
          ) : (
            <button type="button" onClick={() => setAddingEx(true)}
              style={{
                width: '100%', padding: '10px', background: 'transparent', border: 'none',
                borderTop: '1px solid #1A1A1A', color: '#444', cursor: 'pointer', fontSize: 12,
                fontFamily: '"Inter", sans-serif', fontWeight: 500, textTransform: 'uppercase',
                letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#E8001D'; e.currentTarget.style.background = '#0D0D0D' }}
              onMouseOut={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.background = 'transparent' }}
            >
              <Plus size={13} /> ADD EXERCISE
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Main Builder ──────────────────────────────────────────────────────────
export default function WorkoutBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const debounce = useRef(null)

  const load = useCallback(async () => {
    try {
      const { data } = await client.get(`/admin/workout-programs/${id}`)
      setProgram(data)
    } catch (e) {
      console.error(e)
      navigate('/admin/workouts')
    } finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  const patchProgram = (field, value) => {
    setProgram(prev => ({ ...prev, [field]: value }))
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSaving(true)
      try { await client.patch(`/admin/workout-programs/${id}`, { [field]: value }) }
      finally { setSaving(false) }
    }, 700)
  }

  const handleTogglePublish = async () => {
    const { data } = await client.patch(`/admin/workout-programs/${id}/publish`)
    setProgram(prev => ({ ...prev, is_published: data.is_published }))
  }

  const handleAddDay = async () => {
    const dayCount = program.days?.length || 0
    await client.post(`/admin/workout-programs/${id}/days`, { day_label: `Day ${dayCount + 1}`, focus: '', sort_order: dayCount })
    load()
  }

  const handleDeleteDay = async (dayId) => {
    if (!window.confirm('Delete this day and all its exercises?')) return
    await client.delete(`/admin/workout-programs/days/${dayId}`)
    load()
  }

  const days = [...(program?.days || [])].sort((a, b) => a.sort_order - b.sort_order)

  if (loading) return <div style={{ padding: '2rem', color: '#444' }}>Loading program...</div>
  if (!program) return null

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: 1000, margin: '0 auto' }}>
      <button onClick={() => navigate('/admin/workouts')} className="btn-ghost"
        style={{ marginBottom: '1.5rem', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> BACK TO PROGRAMS
      </button>

      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input value={program.name} onChange={e => patchProgram('name', e.target.value)}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #222', color: '#F0F0F0', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 28, textTransform: 'uppercase', outline: 'none', width: '100%' }}
              placeholder="PROGRAM NAME" />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {saving && <span style={{ fontSize: 11, color: '#444', fontFamily: '"JetBrains Mono", monospace' }}>SAVING...</span>}
            <span className={program.is_published ? 'badge badge-active' : 'badge badge-neutral'}>
              {program.is_published ? 'PUBLISHED' : 'DRAFT'}
            </span>
            <button className="btn-secondary" onClick={handleTogglePublish} style={{ fontSize: 12, padding: '8px 14px' }}>
              {program.is_published ? <><EyeOff size={13} /> UNPUBLISH</> : <><Eye size={13} /> PUBLISH</>}
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="input-label">DESCRIPTION</label>
            <textarea className="input" style={{ width: '100%', minHeight: 56, resize: 'vertical' }}
              value={program.description || ''} onChange={e => patchProgram('description', e.target.value)}
              placeholder="Brief description..." />
          </div>
          <div>
            <label className="input-label">DIFFICULTY</label>
            <select className="input" style={{ width: '100%' }} value={program.difficulty}
              onChange={e => patchProgram('difficulty', e.target.value)}>
              {DIFF_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div style={{ marginTop: 4, height: 2, background: DIFF_COLORS[program.difficulty] || '#333', borderRadius: 1 }} />
          </div>
          <div>
            <label className="input-label">GOAL TAG</label>
            <select className="input" style={{ width: '100%' }} value={program.goal_tag}
              onChange={e => patchProgram('goal_tag', e.target.value)}>
              {GOAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="text-section" style={{ fontSize: 16 }}>
          WORKOUT DAYS <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#444', marginLeft: 8 }}>{days.length}</span>
        </h2>
        <button className="btn-secondary" onClick={handleAddDay} style={{ fontSize: 12, padding: '8px 16px' }}>
          <Plus size={14} /> ADD DAY
        </button>
      </div>

      {days.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, color: '#333' }}>
          No days yet. Click "Add Day" to build the first day.
        </div>
      ) : (
        days.map((day, idx) => (
          <DayCard key={day.id} day={day} index={idx} onDeleteDay={handleDeleteDay} onRefresh={load} />
        ))
      )}

      {days.length > 0 && (
        <button className="btn-secondary" onClick={handleAddDay} style={{ width: '100%', marginTop: '0.5rem', fontSize: 12 }}>
          <Plus size={14} /> ADD ANOTHER DAY
        </button>
      )}
    </div>
  )
}
