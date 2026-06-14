import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const WORKOUT_PLANS = [{
  id: 1, name: 'PUSH/PULL/LEGS', assignedBy: 'Admin', status: 'active',
  days: [
    {
      id: 11, label: 'DAY 1 -- PUSH', completed: true,
      exercises: [
        { name: 'Barbell Bench Press', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Overhead Press', sets: 3, reps: '8-12', rest: '90s' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Tricep Pushdowns', sets: 3, reps: '12-15', rest: '60s' },
      ]
    },
    {
      id: 12, label: 'DAY 2 -- PULL', completed: false,
      exercises: [
        { name: 'Deadlift', sets: 4, reps: '5', rest: '180s' },
        { name: 'Barbell Row', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Face Pulls', sets: 3, reps: '15-20', rest: '60s' },
      ]
    },
    {
      id: 13, label: 'DAY 3 -- LEGS', completed: false,
      exercises: [
        { name: 'Back Squat', sets: 4, reps: '6-8', rest: '180s' },
        { name: 'Romanian Deadlift', sets: 3, reps: '10-12', rest: '90s' },
        { name: 'Leg Press', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: '60s' },
      ]
    },
  ]
}]

export default function MemberWorkouts() {
  const [plans, setPlans] = useState(WORKOUT_PLANS)
  const [expandedDay, setExpandedDay] = useState(12)
  const [activeSession, setActiveSession] = useState(null)
  const [loggedSets, setLoggedSets] = useState({})

  const toggleDay = (dayId) => setExpandedDay(expandedDay === dayId ? null : dayId)
  const toggleSet = (dayId, exIdx, setIdx) => {
    const key = `${dayId}-${exIdx}-${setIdx}`
    setLoggedSets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleFinishSession = (dayId) => {
    setPlans(prev => prev.map(p => ({
      ...p,
      days: p.days.map(d => d.id === dayId ? { ...d, completed: true } : d)
    })))
    setActiveSession(null)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-page-title">MY WORKOUTS</h1>
        <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Assigned plans and session tracking</p>
      </div>

      {plans.map(plan => (
        <div key={plan.id}>
          {/* Plan Header */}
          <div style={{
            background: '#111', border: '1px solid #1E1E1E', borderRadius: 4,
            borderLeft: '3px solid #E8001D', padding: '1.25rem 1.5rem', marginBottom: '1rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 20, textTransform: 'uppercase' }}>{plan.name}</h2>
                <span className="badge badge-active">ACTIVE</span>
              </div>
              <p style={{ fontSize: 12, color: '#444', marginTop: 2 }}>Assigned by {plan.assignedBy}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, color: '#888' }}>
                {plan.days.filter(d => d.completed).length} / {plan.days.length} DAYS DONE
              </p>
              <div className="progress-track" style={{ width: 120, marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${(plan.days.filter(d => d.completed).length / plan.days.length) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Day Accordion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {plan.days.map(day => (
              <div key={day.id} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, overflow: 'hidden' }}>
                {/* Day Row */}
                <button type="button" onClick={() => toggleDay(day.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.875rem 1.25rem', background: 'transparent', border: 'none', cursor: 'pointer',
                    transition: 'background 80ms ease', color: '#F0F0F0',
                    borderLeft: day.completed ? '3px solid #22C55E' : '3px solid transparent',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#1A1A1A'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: day.completed ? '#888' : '#F0F0F0' }}>
                      {day.label}
                    </p>
                    <p style={{ fontSize: 12, color: '#444' }}>{day.exercises.length} exercises</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {!day.completed && (
                      <button type="button" className="btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}
                        onClick={e => { e.stopPropagation(); setActiveSession(day.id) }}>
                        START SESSION
                      </button>
                    )}
                    {day.completed && <span className="badge badge-active">DONE</span>}
                    {expandedDay === day.id ? <ChevronUp size={16} style={{ color: '#444' }} /> : <ChevronDown size={16} style={{ color: '#444' }} />}
                  </div>
                </button>

                {/* Exercises */}
                {expandedDay === day.id && (
                  <div style={{ borderTop: '1px solid #1E1E1E' }}>
                    {day.exercises.map((ex, exIdx) => (
                      <div key={exIdx} style={{
                        display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1.25rem', borderBottom: '1px solid #141414',
                        borderLeft: loggedSets[`${day.id}-${exIdx}-0`] ? '3px solid #22C55E' : '3px solid transparent',
                      }}>
                        <div>
                          <p style={{ fontWeight: 500, fontSize: 14, color: loggedSets[`${day.id}-${exIdx}-0`] ? '#888' : '#F0F0F0' }}>{ex.name}</p>
                          {ex.rest && <p style={{ fontSize: 11, color: '#333', marginTop: 2 }}>REST: {ex.rest}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#E8001D', fontWeight: 500 }}>
                            {ex.sets} x {ex.reps}
                          </span>
                          {activeSession === day.id && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              {Array.from({ length: ex.sets }).map((_, sIdx) => {
                                const key = `${day.id}-${exIdx}-${sIdx}`
                                return (
                                  <button key={sIdx} type="button" onClick={() => toggleSet(day.id, exIdx, sIdx)}
                                    style={{
                                      width: 24, height: 24, borderRadius: 2, fontSize: 11, fontWeight: 700,
                                      cursor: 'pointer', transition: 'all 100ms ease', border: 'none',
                                      background: loggedSets[key] ? '#22C55E' : '#1A1A1A',
                                      color: loggedSets[key] ? '#080808' : '#888',
                                      fontFamily: '"JetBrains Mono", monospace',
                                    }}>{sIdx + 1}</button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {activeSession === day.id && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 1.25rem', borderTop: '1px solid #1E1E1E', gap: '0.75rem' }}>
                        <button type="button" onClick={() => setActiveSession(null)} className="btn-ghost">CANCEL</button>
                        <button type="button" onClick={() => handleFinishSession(day.id)} className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>FINISH SESSION</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
