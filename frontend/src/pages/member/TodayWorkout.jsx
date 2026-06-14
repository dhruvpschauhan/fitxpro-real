import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import client from '../../api/client'

export default function TodayWorkout() {
  const [today, setToday] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/user/workout/today')
      setToday(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: '2rem', color: '#444' }}>Loading...</div>

  if (!today || today.status === 'no_program') {
    return (
      <div style={{ padding: '2rem', maxWidth: 700, margin: '0 auto' }}>
        <h1 className="text-page-title" style={{ marginBottom: '2rem' }}>TODAY'S WORKOUT</h1>
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#555', fontSize: 14, marginBottom: '1.25rem' }}>No program selected.</p>
          <Link to="/app/workouts/programs" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            CHOOSE A PROGRAM
          </Link>
        </div>
      </div>
    )
  }

  const exercises = [...(today.exercises || [])].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div style={{ padding: '2rem', maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#555', marginBottom: 6, textTransform: 'uppercase' }}>
          {today.program_name}
        </p>
        <h1 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 6vw, 44px)', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 6 }}>
          {today.day_label}
        </h1>
        {today.focus && (
          <p style={{ fontSize: 15, color: '#888', marginBottom: 4 }}>{today.focus}</p>
        )}
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#444' }}>
          DAY {today.day_number} OF {today.total_days}
        </p>
      </div>

      {/* Exercise List */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, overflow: 'hidden', marginBottom: '1.5rem' }}>
        {exercises.length === 0 ? (
          <p style={{ padding: '2rem', color: '#444', textAlign: 'center' }}>No exercises for this day.</p>
        ) : (
          exercises.map((ex, i) => (
            <div key={ex.id} style={{
              padding: '1rem 1.25rem',
              borderBottom: i < exercises.length - 1 ? '1px solid #141414' : 'none',
              borderLeft: '3px solid transparent',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#F0F0F0', marginBottom: ex.notes ? 5 : 0 }}>{ex.name}</p>
                  {ex.notes && (
                    <p style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>{ex.notes}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 15, color: '#E8001D', fontWeight: 600 }}>
                    {ex.sets} x {ex.reps}
                  </p>
                  {ex.rest_seconds && (
                    <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#444', marginTop: 2 }}>
                      REST {ex.rest_seconds}s
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Full Program link */}
      {today.program_id && (
        <Link to={`/app/workouts/programs/${today.program_id}`}
          style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 600, color: '#888', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          VIEW FULL PROGRAM
        </Link>
      )}
    </div>
  )
}
