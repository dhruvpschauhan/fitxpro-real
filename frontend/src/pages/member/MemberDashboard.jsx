import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { getMyMembership } from '../../api/admin'
import client from '../../api/client'

const ACT_MULT = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
function calcGoal(fp, w) {
  const wt = w || fp?.weight_kg || 70, h = fp?.height_cm || 170, a = fp?.age || 25
  const bmr = (fp?.gender === 'female') ? 10*wt + 6.25*h - 5*a - 161 : 10*wt + 6.25*h - 5*a + 5
  const tdee = Math.round(bmr * (ACT_MULT[fp?.activity_level] || 1.55))
  const g = fp?.goal_type || 'maintenance'
  let cal = g === 'weight_loss' ? tdee - 500 : g === 'weight_gain' ? tdee + 400 : g === 'lean_bulk' ? tdee + 250 : tdee
  return { cal: Math.max(cal, 1200), goalType: g }
}

const BODY_METRICS = [
  { label: 'WEIGHT',      value: '74 KG',  change: '-1.2 KG', positive: true },
  { label: 'BODY FAT',    value: '18%',    change: '-0.8%',   positive: true },
  { label: 'MUSCLE MASS', value: '56 KG',  change: '+0.5 KG', positive: true },
]

export default function MemberDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [membership, setMembership] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [fitnessProfile, setFitnessProfile] = useState(null)
  const [latestWeight, setLatestWeight] = useState(null)
  const [todayWorkout, setTodayWorkout] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getMyMembership().catch(() => null),
      client.get('/announcements/').then(r => r.data).catch(() => []),
      client.get('/user/fitness-profile').then(r => r.data).catch(() => null),
      client.get('/admin/finances/body-metrics').then(r => r.data).catch(() => []),
      client.get('/user/workout/today').then(r => r.data).catch(() => null),
    ]).then(([m, a, fp, bm, tw]) => {
      setMembership(m)
      setAnnouncements(a)
      setFitnessProfile(fp)
      if (bm?.length) setLatestWeight(parseFloat(bm[bm.length - 1].body_weight_kg))
      setTodayWorkout(tw)
    }).finally(() => setLoading(false))
  }, [])

  // Calculate calories consumed from localStorage
  const d = new Date()
  const todayKey = `fitxpro_nutrition_${user?.username}_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`
  const loggedFood = JSON.parse(localStorage.getItem(todayKey) || '[]')
  const DIRECT_ITEMS = [
    'Whole Egg (1 large)', 'Whey Protein (1 scoop)', 'Banana (medium)', 'Dal Makhani (1 bowl)',
    'Greek Yogurt (200g)', 'Roti / Chapati (1 medium)', 'Toor Dal Cooked (1 bowl)',
    'Paratha Plain (1 medium)', 'Idli (2 pieces)', 'Sambar (1 bowl)', 'Samosa (1 medium)',
    'Moong Dal Chilla (1 medium)', 'Chole / Chickpea Curry (1 bowl)', 'Aloo Gobbi (1 bowl)',
    'Palak Paneer (1 bowl)', 'Chicken Tikka (6 pieces)', 'Egg Bhurji (2 eggs)',
    'Fish Curry Rohu (1 bowl)', 'Mutton Curry (1 bowl)', 'Masala Chai with Milk & Sugar (1 cup)',
    'Filter Coffee with Sugar (1 cup)', 'Buttermilk / Masala Chaas (1 glass)', 'Ghee (1 tbsp)',
    'White Bread - Grocery Style (2 slices)', 'Brown Bread - Grocery Style (2 slices)', 
    'Atta Whole Wheat Bread (2 slices)', 'Marie Gold Biscuits (3 biscuits)', 
    'Parle-G Biscuits (4 biscuits)', 'Good Day Butter Biscuits (2 biscuits)',
    'Low Fat Milk / Toned Milk (1 glass/250ml)', 'Double Toned Milk / Skimmed (1 glass/250ml)',
    'Amul Butter (1 tbsp/14g)', 'Bhindi Masala / Sabzi (1 bowl)', 'Shahi Paneer (1 bowl)',
    'Jeera Aloo (1 bowl)', 'Mix Veg Sabzi (1 bowl)', 'Baingan Bharta (1 bowl)',
    'Rajma / Kidney Curry (1 bowl)', 'Lauki / Ghiya Sabzi (1 bowl)'
  ]
  const calConsumed = Math.round(loggedFood.reduce((sum, entry) => {
    const isDirect = DIRECT_ITEMS.includes(entry.food.name)
    const cal = isDirect ? entry.food.cal * entry.qty : (entry.food.cal * entry.qty) / 100
    return sum + cal
  }, 0))

  const goals = calcGoal(fitnessProfile, latestWeight)
  const calRemaining = Math.max(goals.cal - calConsumed, 0)
  const pctCalories = Math.min((calConsumed / goals.cal) * 100, 100)

  const daysLeft  = membership?.days_left ?? 0
  const totalDays = membership ? Math.max(Math.round((new Date(membership.end_date) - new Date(membership.start_date)) / 86400000), 1) : 30
  const pctLeft   = Math.round((daysLeft / totalDays) * 100)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* Hero Greeting */}
      <div style={{ marginTop: '2.5rem', marginBottom: '2rem', position: 'relative' }}>
        <p style={{
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800,
          fontSize: 'clamp(36px, 6vw, 64px)',
          textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1, color: '#F0F0F0',
        }}>
          WELCOME BACK,
        </p>
        <p style={{
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800,
          fontSize: 'clamp(36px, 6vw, 64px)',
          textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1, color: '#E8001D',
          marginTop: 4,
        }}>
          {user?.username?.toUpperCase()}
        </p>
        <p style={{ color: '#444', fontSize: 13, marginTop: 12, fontFamily: '"Inter", sans-serif' }}>
          Your fitness overview for today.
        </p>
      </div>

      {/* Membership Card - styled like a physical gym card */}
      <div style={{
        background: '#111', border: '1px solid #1E1E1E', borderRadius: 4,
        padding: '1.5rem 2rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden',
      }}>
        {/* Red accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#E8001D' }} />

        {loading ? (
          <p style={{ color: '#444', fontSize: 13 }}>Loading membership...</p>
        ) : membership ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
              <div>
                <p className="text-label-sm" style={{ marginBottom: 4 }}>MEMBER</p>
                <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 20, textTransform: 'uppercase' }}>
                  {user?.username?.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-label-sm" style={{ marginBottom: 4 }}>PLAN</p>
                <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 20, textTransform: 'uppercase' }}>
                  {membership.plan_name}
                </p>
              </div>
              <div>
                <p className="text-label-sm" style={{ marginBottom: 4 }}>EXPIRES</p>
                <p style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 16, color: '#F0F0F0' }}>
                  {membership.end_date}
                </p>
              </div>
              <div>
                <p className="text-label-sm" style={{ marginBottom: 4 }}>DAYS LEFT</p>
                <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 28, color: daysLeft < 10 ? '#E8001D' : '#22C55E' }}>
                  {daysLeft}
                </p>
              </div>
            </div>
            <div style={{ width: 120 }}>
              <div className="progress-track" style={{ height: 3 }}>
                <div className={`progress-fill${pctLeft > 50 ? '' : pctLeft > 20 ? '-warning' : ''}`} style={{ width: `${pctLeft}%` }} />
              </div>
              <p style={{ fontSize: 11, color: '#444', marginTop: 4, textAlign: 'right', fontFamily: '"JetBrains Mono", monospace' }}>
                {pctLeft}% LEFT
              </p>
            </div>
          </div>
        ) : (
          <p style={{ color: '#444', fontSize: 14 }}>No active membership. Contact the gym.</p>
        )}
      </div>

      <div className="grid-2col">
        {/* Today's Workout */}
        <div style={{
          background: '#111', border: '1px solid #1E1E1E', borderRadius: 4,
          padding: '1.5rem 2rem',
        }}>
          <p className="text-label" style={{ marginBottom: 12 }}>TODAY'S WORKOUT</p>
          {todayWorkout?.status === 'ok' ? (
            <>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 32, textTransform: 'uppercase', color: '#F0F0F0', marginBottom: 4 }}>
                {todayWorkout.day_label}
              </p>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
                {todayWorkout.program_name} {todayWorkout.focus && `• ${todayWorkout.focus}`}
              </p>
              <button className="btn-primary" onClick={() => navigate('/app/workouts/today')} style={{ padding: '10px 24px' }}>VIEW WORKOUT</button>
            </>
          ) : (
            <>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 32, textTransform: 'uppercase', color: '#F0F0F0', marginBottom: 16 }}>
                REST DAY
              </p>
              <button className="btn-primary" onClick={() => navigate('/app/workouts/programs')} style={{ padding: '10px 24px' }}>FIND A PROGRAM</button>
            </>
          )}
        </div>

        {/* Body Metrics */}
        <div style={{
          background: '#111', border: '1px solid #1E1E1E', borderRadius: 4,
          padding: '1.5rem 2rem',
        }}>
          <p className="text-label" style={{ marginBottom: 16 }}>BODY METRICS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {BODY_METRICS.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: 13 }}>{m.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 15 }}>{m.value}</span>
                  <span style={{
                    marginLeft: 8, fontSize: 12, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace',
                    color: m.positive ? '#22C55E' : '#E8001D',
                  }}>{m.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2col" style={{ marginTop: '1.5rem' }}>
        {/* Today's Calories */}
        <div className="card" style={{ padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="text-section" style={{ fontSize: 14 }}>TODAY'S CALORIES</h3>
            <button className="btn-ghost" onClick={() => navigate('/app/nutrition')} style={{ fontSize: 11, padding: '4px 8px' }}>LOG FOOD</button>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <div>
                <p className="text-label" style={{ marginBottom: 8 }}>CONSUMED</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <p className="text-hero-number" style={{ fontSize: 42, color: '#F0F0F0', lineHeight: 1 }}>{calConsumed}</p>
                  <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#444' }}>/ {goals.cal} KCAL</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 16, color: '#E8001D', fontWeight: 500 }}>
                  {calRemaining}
                </p>
                <p className="text-label" style={{ fontSize: 10 }}>REMAINING</p>
              </div>
            </div>
            <div className="progress-track" style={{ height: 6 }}>
              <div className="progress-fill" style={{ width: `${pctCalories}%`, background: '#E8001D' }} />
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1E1E1E' }}>
            <h3 className="text-section" style={{ fontSize: 14 }}>ANNOUNCEMENTS</h3>
          </div>
          {announcements.length > 0 ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {announcements.map(a => (
                <div key={a.id} style={{ borderLeft: '2px solid #E8001D', paddingLeft: 12 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#F0F0F0' }}>{a.title}</p>
                  <p style={{ color: '#888', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                    {a.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#444', fontSize: 13 }}>
              No recent announcements.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
