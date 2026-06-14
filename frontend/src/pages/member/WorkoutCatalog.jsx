import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'

const GOAL_LABELS = {
  strength: 'STRENGTH', fat_loss: 'FAT LOSS', endurance: 'ENDURANCE',
  hypertrophy: 'HYPERTROPHY', general_fitness: 'GENERAL FITNESS',
}
const DIFF_COLORS = { beginner: '#22C55E', intermediate: '#F59E0B', advanced: '#E8001D' }

export default function WorkoutCatalog() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [catalogRes, myRes] = await Promise.all([
        client.get('/user/workout/programs'),
        client.get('/user/workout/my-program'),
      ])
      setPrograms(catalogRes.data)
      setActiveId(myRes.data?.id || null)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: '2rem', color: '#444' }}>Loading programs...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="text-page-title">PROGRAMS</h1>
        <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Browse all available training programs and select one as active</p>
      </div>

      {programs.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '4rem', textAlign: 'center', color: '#444' }}>
          No programs available yet.
        </div>
      ) : (
        <div className="grid-3col">
          {programs.map(p => {
            const isActive = p.id === activeId
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/app/workouts/programs/${p.id}`)}
                style={{
                  background: '#111',
                  border: '1px solid #1E1E1E',
                  borderLeft: isActive ? '3px solid #E8001D' : '3px solid transparent',
                  borderRadius: 4, padding: '1.25rem',
                  cursor: 'pointer', transition: 'background 80ms ease',
                }}
                onMouseOver={e => e.currentTarget.style.background = '#1A1A1A'}
                onMouseOut={e => e.currentTarget.style.background = '#111'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    {isActive && (
                      <span className="badge badge-active" style={{ marginBottom: 6, display: 'inline-block' }}>ACTIVE</span>
                    )}
                    <h3 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase', lineHeight: 1.2 }}>
                      {p.name}
                    </h3>
                  </div>
                </div>
                {p.description && (
                  <p style={{ fontSize: 12, color: '#555', marginBottom: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                  <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, color: DIFF_COLORS[p.difficulty] || '#888' }}>
                    {p.difficulty?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: '#888' }}>
                    {GOAL_LABELS[p.goal_tag] || p.goal_tag}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: '#555' }}>
                    {p.day_count}D / {p.exercise_count}EX
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
