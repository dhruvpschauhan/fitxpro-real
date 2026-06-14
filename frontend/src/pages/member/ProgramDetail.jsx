import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import client from '../../api/client'

const GOAL_LABELS = {
  strength: 'STRENGTH', fat_loss: 'FAT LOSS', endurance: 'ENDURANCE',
  hypertrophy: 'HYPERTROPHY', general_fitness: 'GENERAL FITNESS',
}
const DIFF_COLORS = { beginner: '#22C55E', intermediate: '#F59E0B', advanced: '#E8001D' }

export default function ProgramDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [program, setProgram] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const load = useCallback(async () => {
    try {
      const [progRes, myRes] = await Promise.all([
        client.get(`/user/workout/programs/${id}`),
        client.get('/user/workout/my-program'),
      ])
      setProgram(progRes.data)
      setActiveId(myRes.data?.id || null)
    } catch (e) {
      console.error(e)
      navigate('/app/workouts/programs')
    } finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  const handleSelect = async () => {
    if (activeId && activeId !== id) {
      setShowConfirm(true)
      return
    }
    await doSelect()
  }

  const doSelect = async () => {
    setSelecting(true)
    setShowConfirm(false)
    try {
      await client.post('/user/workout/my-program', { program_id: id })
      setActiveId(id)
      navigate('/app/workouts')
    } catch (e) { 
      console.error(e)
      alert("Failed to select program. If this persists, please ensure your backend is up to date!")
    }
    finally { setSelecting(false) }
  }

  const isActive = activeId === id
  const days = program ? [...program.days].sort((a, b) => a.sort_order - b.sort_order) : []

  if (loading) return <div style={{ padding: '2rem', color: '#444' }}>Loading...</div>
  if (!program) return null

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => navigate('/app/workouts/programs')} className="btn-ghost"
        style={{ marginBottom: '1.5rem', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> ALL PROGRAMS
      </button>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 500, color: DIFF_COLORS[program.difficulty] }}>
            {program.difficulty?.toUpperCase()}
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#888' }}>
            {GOAL_LABELS[program.goal_tag]}
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#555' }}>
            {days.length} DAYS
          </span>
        </div>
        <h1 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 5vw, 40px)', textTransform: 'uppercase', marginBottom: 8 }}>
          {program.name}
        </h1>
        {program.description && (
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, maxWidth: 600 }}>{program.description}</p>
        )}
      </div>

      {/* Select Button */}
      <div style={{ marginBottom: '2rem' }}>
        {isActive ? (
          <button disabled className="btn-ghost" style={{ width: '100%', maxWidth: 400, fontSize: 13, cursor: 'not-allowed', opacity: 0.5 }}>
            CURRENTLY ACTIVE PROGRAM
          </button>
        ) : (
          <button className="btn-primary" onClick={handleSelect} disabled={selecting}
            style={{ width: '100%', maxWidth: 400, fontSize: 13 }}>
            {selecting ? 'SELECTING...' : 'SELECT THIS PROGRAM'}
          </button>
        )}
      </div>

      {/* Day-by-Day Breakdown */}
      <h2 className="text-section" style={{ fontSize: 14, marginBottom: '1rem' }}>FULL PROGRAM</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {days.map((day, i) => {
          const exercises = [...(day.exercises || [])].sort((a, b) => a.sort_order - b.sort_order)
          return (
            <div key={day.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, overflow: 'hidden' }}>
              {/* Day Header */}
              <div style={{ padding: '1rem 1.25rem', background: '#131313', borderBottom: '1px solid #1E1E1E', display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#E8001D', fontWeight: 500 }}>DAY {i + 1}</span>
                <h3 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 17, textTransform: 'uppercase' }}>
                  {day.day_label}
                </h3>
                {day.focus && (
                  <span style={{ fontSize: 13, color: '#666' }}>{day.focus}</span>
                )}
              </div>

              {/* Exercises */}
              {exercises.length === 0 ? (
                <p style={{ padding: '1rem 1.25rem', color: '#333', fontSize: 13 }}>No exercises defined.</p>
              ) : (
                exercises.map((ex) => (
                  <div key={ex.id} style={{
                    padding: '0.875rem 1.25rem',
                    borderBottom: '1px solid #141414',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#F0F0F0', marginBottom: ex.notes ? 4 : 0 }}>{ex.name}</p>
                      {ex.notes && (
                        <p style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>{ex.notes}</p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                      <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#E8001D', fontWeight: 600 }}>
                        {ex.sets} x {ex.reps}
                      </p>
                      {ex.rest_seconds && (
                        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#444', marginTop: 2 }}>
                          {ex.rest_seconds}s rest
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      {/* Confirm Switch Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h2>SWITCH PROGRAM?</h2></div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#888', marginBottom: '1.5rem' }}>
                Your current program will be replaced with <strong style={{ color: '#F0F0F0' }}>{program.name}</strong>.
              </p>
              <div className="modal-actions" style={{ padding: 0, border: 'none' }}>
                <button className="btn-ghost" onClick={() => setShowConfirm(false)}>CANCEL</button>
                <button className="btn-primary" onClick={doSelect} disabled={selecting}>
                  {selecting ? 'SWITCHING...' : 'CONFIRM'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
