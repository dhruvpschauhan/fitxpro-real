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
  const [nutritionLog, setNutritionLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getMyMembership().catch(() => null),
      client.get('/announcements/').then(r => r.data).catch(() => []),
      client.get('/user/fitness-profile').then(r => r.data).catch(() => null),
      client.get('/admin/finances/body-metrics').then(r => r.data).catch(() => []),
      client.get('/user/workout/today').then(r => r.data).catch(() => null),
      client.get('/user/nutrition-log/today').then(r => r.data).catch(() => null),
    ]).then(([m, a, fp, bm, tw, nutLog]) => {
      setMembership(m)
      setAnnouncements(a)
      setFitnessProfile(fp)
      if (bm?.length) setLatestWeight(parseFloat(bm[bm.length - 1].body_weight_kg))
      setTodayWorkout(tw)
      if (nutLog) setNutritionLog(nutLog.logged_food || [])
    }).finally(() => setLoading(false))
  }, [])

  // Calculate calories consumed from cloud log
  const loggedFood = nutritionLog
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

      {/* Hero Greeting - Premium Glow Typography */}
      <div style={{ marginTop: '2.5rem', marginBottom: '2.5rem', position: 'relative' }}>
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
          textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1, 
          color: '#E8001D', textShadow: '0 0 20px rgba(232,0,29,0.4)',
          marginTop: 4,
          background: '-webkit-linear-gradient(0deg, #E8001D, #FF4B4B)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          {user?.username?.toUpperCase()}
        </p>
        <p style={{ color: '#888', fontSize: 14, marginTop: 16, fontFamily: '"Inter", sans-serif', letterSpacing: '0.01em' }}>
          Your fitness overview for today.
        </p>
      </div>

      <div className="grid-2col" style={{ gap: '2rem' }}>
        {/* Today's Workout - Premium Card */}
        <div style={{ 
          background: todayWorkout?.status === 'ok' ? 'radial-gradient(circle at bottom right, rgba(232, 0, 29, 0.08), #111 60%)' : '#111', 
          border: '1px solid #1E1E1E', borderRadius: 8, padding: '2rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden'
        }}>
          {todayWorkout?.status === 'ok' && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', background: '#E8001D', boxShadow: '0 0 15px #E8001D' }} />}
          
          <p className="text-label" style={{ marginBottom: 16, color: '#888', letterSpacing: '0.1em' }}>TODAY'S WORKOUT</p>
          {todayWorkout?.status === 'ok' ? (
            <>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 40, textTransform: 'uppercase', color: '#F0F0F0', marginBottom: 8, lineHeight: 1.1, textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
                {todayWorkout.day_label}
              </p>
              <p style={{ color: '#E8001D', fontSize: 14, marginBottom: 24, fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                {todayWorkout.program_name?.toUpperCase()} {todayWorkout.focus && <span style={{ color: '#666' }}>• {todayWorkout.focus?.toUpperCase()}</span>}
              </p>
              <button className="btn-primary" onClick={() => navigate('/app/workouts/today')} style={{ padding: '12px 28px', fontSize: 13, letterSpacing: '0.05em' }}>VIEW WORKOUT</button>
            </>
          ) : (
            <>
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: 40, textTransform: 'uppercase', color: '#555', marginBottom: 24, lineHeight: 1.1 }}>
                REST DAY
              </p>
              <button className="btn-primary" onClick={() => navigate('/app/workouts/programs')} style={{ padding: '12px 28px', fontSize: 13, letterSpacing: '0.05em' }}>FIND A PROGRAM</button>
            </>
          )}
        </div>

        {/* Body Metrics - Sleek Dashboard List */}
        <div style={{ 
          background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: '2rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          <p className="text-label" style={{ marginBottom: 20, color: '#888', letterSpacing: '0.1em' }}>BODY METRICS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {BODY_METRICS.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.25rem', borderBottom: i < BODY_METRICS.length - 1 ? '1px solid #1A1A1A' : 'none' }}>
                <span style={{ color: '#F0F0F0', fontSize: 14, fontWeight: 500 }}>{m.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: 16, color: '#F0F0F0' }}>{m.value}</span>
                  <span style={{
                    marginLeft: 12, fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace',
                    color: m.positive ? '#22C55E' : '#E8001D', textShadow: `0 0 10px ${m.positive ? 'rgba(34,197,94,0.3)' : 'rgba(232,0,29,0.3)'}`
                  }}>{m.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2col" style={{ marginTop: '2rem', gap: '2rem' }}>
        {/* Today's Calories - Premium Glow */}
        <div style={{ 
          background: 'radial-gradient(circle at top right, rgba(34, 197, 94, 0.08), #111 70%)',
          border: '1px solid #1E1E1E', borderRadius: 8, padding: '2rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 className="text-section" style={{ fontSize: 14, color: '#888', letterSpacing: '0.1em' }}>TODAY'S CALORIES</h3>
            <button className="btn-secondary" onClick={() => navigate('/app/nutrition')} style={{ fontSize: 12, minHeight: '32px', padding: '6px 16px', borderColor: '#E8001D', color: '#E8001D' }}>LOG FOOD</button>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <div>
                <p className="text-label" style={{ marginBottom: 8, color: '#E8001D' }}>CONSUMED</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <p className="text-hero-number" style={{ fontSize: 48, color: '#E8001D', lineHeight: 1, textShadow: '0 0 20px rgba(232,0,29,0.2)' }}>{calConsumed}</p>
                  <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#666' }}>/ {goals.cal} KCAL</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 20, color: '#F0F0F0', fontWeight: 600 }}>
                  {calRemaining}
                </p>
                <p className="text-label" style={{ fontSize: 11, color: '#888' }}>REMAINING</p>
              </div>
            </div>
            <div className="progress-track" style={{ height: 6, background: '#1A1A1A', borderRadius: 3 }}>
              <div className="progress-fill" style={{ width: `${pctCalories}%`, background: 'linear-gradient(90deg, #7A0010, #E8001D)', boxShadow: '0 0 10px rgba(232,0,29,0.5)', borderRadius: 3 }} />
            </div>
          </div>
        </div>

        {/* Announcements - Glass Notifications */}
        <div style={{ 
          background: '#111', border: '1px solid #1E1E1E', borderRadius: 8, padding: 0,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #1A1A1A', background: 'rgba(255,255,255,0.02)' }}>
            <h3 className="text-section" style={{ fontSize: 14, color: '#888', letterSpacing: '0.1em' }}>ANNOUNCEMENTS</h3>
          </div>
          {announcements.length > 0 ? (
            <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {announcements.map((a, idx) => (
                <div key={a.id} style={{ 
                  borderLeft: '3px solid #E8001D', paddingLeft: 16, 
                  paddingBottom: idx < announcements.length - 1 ? '1.5rem' : 0,
                  borderBottom: idx < announcements.length - 1 ? '1px solid #1A1A1A' : 'none'
                }}>
                  <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18, color: '#F0F0F0', letterSpacing: '0.02em' }}>{a.title}</p>
                  <p style={{ color: '#888', fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
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
