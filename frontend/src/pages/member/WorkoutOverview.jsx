import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import client from '../../api/client'

const GOAL_LABELS = {
  strength: 'STRENGTH', fat_loss: 'FAT LOSS', endurance: 'ENDURANCE',
  hypertrophy: 'HYPERTROPHY', general_fitness: 'GENERAL FITNESS',
}
const DIFF_COLORS = { beginner: '#22C55E', intermediate: '#F59E0B', advanced: '#E8001D' }

export default function WorkoutOverview() {
  const navigate = useNavigate()
  const [today, setToday] = useState(null)
  const [activeProgram, setActiveProgram] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [todayRes, programRes] = await Promise.all([
        client.get('/user/workout/today'),
        client.get('/user/workout/my-program'),
      ])
      setToday(todayRes.data)
      setActiveProgram(programRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const days = activeProgram ? [...activeProgram.days].sort((a, b) => a.sort_order - b.sort_order) : []
  const todayDayIndex = today?.status === 'ok' ? (today.day_number - 1) : -1

  if (loading) return <div style={{ padding: '2rem', color: '#444' }}>Loading...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="text-page-title">MY WORKOUT</h1>
        <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Your current training program and today's session</p>
      </div>

      {/* ── Today's Session Card ── */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="text-section" style={{ fontSize: 14, marginBottom: '1rem' }}>TODAY'S SESSION</h2>
        {today?.status === 'no_program' ? (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '2rem', textAlign: 'center', borderLeft: '3px solid #333' }}>
            <p style={{ color: '#555', fontSize: 14, marginBottom: '1rem' }}>No program selected. Choose a program to get started.</p>
            <button className="btn-primary" onClick={() => navigate('/app/workouts/programs')}>BROWSE PROGRAMS</button>
          </div>
        ) : (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, borderLeft: '3px solid #E8001D', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1E1E1E', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#555', marginBottom: 4, textTransform: 'uppercase' }}>
                  {today?.program_name}
                </p>
                <h3 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 22, textTransform: 'uppercase' }}>
                  {today?.day_label}
                </h3>
                {today?.focus && <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{today.focus}</p>}
              </div>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#444', whiteSpace: 'nowrap' }}>
                DAY {today?.day_number} OF {today?.total_days}
              </span>
            </div>

            {/* First 3 exercises preview */}
            <div>
              {(today?.exercises || []).slice(0, 3).map((ex, i) => (
                <div key={ex.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1.5rem', borderBottom: '1px solid #141414',
                }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#F0F0F0' }}>{ex.name}</p>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#E8001D', fontWeight: 600 }}>
                    {ex.sets} x {ex.reps}
                  </span>
                </div>
              ))}
              {(today?.exercises?.length || 0) > 3 && (
                <p style={{ padding: '0.75rem 1.5rem', fontSize: 12, color: '#444', borderBottom: '1px solid #141414' }}>
                  + {today.exercises.length - 3} more exercises
                </p>
              )}
            </div>

            <div style={{ padding: '0.875rem 1.5rem' }}>
              <Link to="/app/workouts/today"
                style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 600, color: '#E8001D', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                VIEW FULL SESSION
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Active Program Overview ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="text-section" style={{ fontSize: 14 }}>ACTIVE PROGRAM</h2>
          <Link to="/app/workouts/programs"
            style={{ fontSize: 12, color: '#888', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
            CHANGE PROGRAM
          </Link>
        </div>

        {!activeProgram ? (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '2rem', textAlign: 'center', color: '#444' }}>
            No active program.
          </div>
        ) : (
          <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 20, textTransform: 'uppercase', marginBottom: 6 }}>
                  {activeProgram.name}
                </h3>
                {activeProgram.description && (
                  <p style={{ fontSize: 13, color: '#555', maxWidth: 500 }}>{activeProgram.description}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 500, color: DIFF_COLORS[activeProgram.difficulty] }}>
                  {activeProgram.difficulty?.toUpperCase()}
                </span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#888' }}>
                  {GOAL_LABELS[activeProgram.goal_tag]}
                </span>
              </div>
            </div>

            {/* Day Chips - horizontal scroll */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {days.map((day, i) => {
                const isToday = i === todayDayIndex
                return (
                  <div key={day.id} style={{
                    flexShrink: 0, background: isToday ? 'rgba(232,0,29,0.12)' : '#1A1A1A',
                    border: isToday ? '1px solid #E8001D' : '1px solid #222',
                    borderRadius: 3, padding: '8px 12px', minWidth: 90,
                  }}>
                    <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: isToday ? '#E8001D' : '#555', marginBottom: 3 }}>
                      DAY {i + 1}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 500, color: isToday ? '#F0F0F0' : '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                      {day.focus || day.day_label}
                    </p>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '1rem' }}>
              <Link to={`/app/workouts/programs/${activeProgram.id}`}
                style={{ fontSize: 12, color: '#888', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                VIEW FULL PROGRAM
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
