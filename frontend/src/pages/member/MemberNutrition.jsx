import { useState, useEffect } from 'react'
import { Plus, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import client from '../../api/client'

const FOOD_DB = [
  { id: 1, name: 'Chicken Breast (100g)', cal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 2, name: 'Brown Rice (100g)', cal: 216, protein: 5, carbs: 45, fat: 1.8 },
  { id: 3, name: 'Whole Egg (1 large)', cal: 72, protein: 6, carbs: 0.4, fat: 5 },
  { id: 4, name: 'Oats (100g)', cal: 389, protein: 17, carbs: 66, fat: 7 },
  { id: 5, name: 'Banana (medium)', cal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { id: 6, name: 'Paneer (100g)', cal: 265, protein: 18, carbs: 3, fat: 21 },
  { id: 7, name: 'Dal Makhani (1 bowl)', cal: 280, protein: 12, carbs: 35, fat: 10 },
  { id: 8, name: 'Whey Protein (1 scoop)', cal: 120, protein: 25, carbs: 3, fat: 2 },
  { id: 9, name: 'Almonds (30g)', cal: 174, protein: 6, carbs: 6, fat: 15 },
  { id: 10, name: 'Greek Yogurt (200g)', cal: 130, protein: 22, carbs: 9, fat: 0.4 },
  // --- INDIAN STAPLES & BREADS ---
  { id: 11, name: 'Roti / Chapati (1 medium)', cal: 85, protein: 3, carbs: 18, fat: 0.5 },
  { id: 12, name: 'White Rice Cooked (100g)', cal: 130, protein: 2.4, carbs: 28, fat: 0.2 },
  { id: 13, name: 'Toor Dal Cooked (1 bowl)', cal: 150, protein: 8, carbs: 24, fat: 1 },
  { id: 14, name: 'Paratha Plain (1 medium)', cal: 258, protein: 5, carbs: 36, fat: 10 },
  // --- BREAKFAST & SNACKS ---
  { id: 15, name: 'Idli (2 pieces)', cal: 120, protein: 4, carbs: 25, fat: 0.5 },
  { id: 16, name: 'Sambar (1 bowl)', cal: 95, protein: 3.5, carbs: 14, fat: 2.5 },
  { id: 17, name: 'Poha (100g)', cal: 180, protein: 3, carbs: 35, fat: 3 },
  { id: 18, name: 'Upma (100g)', cal: 210, protein: 4.5, carbs: 38, fat: 4.2 },
  { id: 19, name: 'Samosa (1 medium)', cal: 260, protein: 4, carbs: 32, fat: 13 },
  { id: 20, name: 'Moong Dal Chilla (1 medium)', cal: 125, protein: 7, carbs: 18, fat: 3 },
  // --- VEGETARIAN CURRIES & DAIRY ---
  { id: 21, name: 'Chole / Chickpea Curry (1 bowl)', cal: 250, protein: 9, carbs: 34, fat: 8 },
  { id: 22, name: 'Aloo Gobbi (1 bowl)', cal: 140, protein: 3, carbs: 16, fat: 7 },
  { id: 23, name: 'Palak Paneer (1 bowl)', cal: 290, protein: 14, carbs: 10, fat: 22 },
  { id: 24, name: 'Curd / Dahi Whole Milk (100g)', cal: 61, protein: 3.2, carbs: 4.7, fat: 3.3 },
  { id: 25, name: 'Soya Chunks Cooked (100g)', cal: 105, protein: 18, carbs: 8, fat: 0.5 },
  { id: 26, name: 'Tofu (100g)', cal: 144, protein: 14, carbs: 2.5, fat: 8.5 },
  // --- NON-VEGETARIAN (INDIAN STYLE) ---
  { id: 27, name: 'Chicken Tikka (6 pieces)', cal: 270, protein: 34, carbs: 4, fat: 12 },
  { id: 28, name: 'Egg Bhurji (2 eggs)', cal: 195, protein: 13, carbs: 3, fat: 14 },
  { id: 29, name: 'Fish Curry Rohu (1 bowl)', cal: 220, protein: 22, carbs: 5, fat: 12 },
  { id: 30, name: 'Mutton Curry (1 bowl)', cal: 340, protein: 26, carbs: 6, fat: 23 },
  // --- BEVERAGES & MISC ---
  { id: 31, name: 'Masala Chai with Milk & Sugar (1 cup)', cal: 90, protein: 2, carbs: 14, fat: 3 },
  { id: 32, name: 'Filter Coffee with Sugar (1 cup)', cal: 110, protein: 3, carbs: 16, fat: 3.5 },
  { id: 33, name: 'Buttermilk / Masala Chaas (1 glass)', cal: 45, protein: 2, carbs: 4, fat: 1.5 },
  { id: 34, name: 'Ghee (1 tbsp)', cal: 123, protein: 0, carbs: 0, fat: 14 },
  // --- BREADS & BAKERY ---
  { id: 35, name: 'White Bread - Grocery Style (2 slices)', cal: 130, protein: 4, carbs: 24, fat: 1.5 },
  { id: 36, name: 'Brown Bread - Grocery Style (2 slices)', cal: 120, protein: 4.5, carbs: 22, fat: 1.2 },
  { id: 37, name: 'Atta Whole Wheat Bread (2 slices)', cal: 115, protein: 5, carbs: 21, fat: 1 },
  { id: 38, name: 'Marie Gold Biscuits (3 biscuits)', cal: 84, protein: 1.5, carbs: 15, fat: 2 },
  { id: 39, name: 'Parle-G Biscuits (4 biscuits)', cal: 110, protein: 1.6, carbs: 19, fat: 3.2 },
  { id: 40, name: 'Good Day Butter Biscuits (2 biscuits)', cal: 124, protein: 1.4, carbs: 16, fat: 6.1 },
  // --- DAILY DAIRY UPDATES ---
  { id: 41, name: 'Low Fat Milk / Toned Milk (1 glass/250ml)', cal: 120, protein: 8, carbs: 12, fat: 3.8 },
  { id: 42, name: 'Double Toned Milk / Skimmed (1 glass/250ml)', cal: 90, protein: 8.2, carbs: 12.5, fat: 1.2 },
  { id: 43, name: 'Amul Butter (1 tbsp/14g)', cal: 100, protein: 0.1, carbs: 0, fat: 11 },
  // --- SABZIS & CURRIES ---
  { id: 44, name: 'Bhindi Masala / Sabzi (1 bowl)', cal: 110, protein: 2.5, carbs: 12, fat: 6 },
  { id: 45, name: 'Shahi Paneer (1 bowl)', cal: 320, protein: 13, carbs: 11, fat: 25 },
  { id: 46, name: 'Jeera Aloo (1 bowl)', cal: 160, protein: 2.5, carbs: 22, fat: 7 },
  { id: 47, name: 'Mix Veg Sabzi (1 bowl)', cal: 135, protein: 3, carbs: 14, fat: 8 },
  { id: 48, name: 'Baingan Bharta (1 bowl)', cal: 115, protein: 2, carbs: 11, fat: 7.5 },
  { id: 49, name: 'Rajma / Kidney Bean Curry (1 bowl)', cal: 180, protein: 9, carbs: 26, fat: 4.5 },
  { id: 50, name: 'Lauki / Ghiya Sabzi (1 bowl)', cal: 75, protein: 1.5, carbs: 8, fat: 4 }
]
const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS']
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
  'Rajma / Kidney Bean Curry (1 bowl)', 'Lauki / Ghiya Sabzi (1 bowl)'
]
const ACT_MULT = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
const GOAL_LABELS = { weight_loss: 'WEIGHT LOSS', maintenance: 'MAINTENANCE', weight_gain: 'WEIGHT GAIN', lean_bulk: 'LEAN BULK' }

function computeGoals(profile, latestWeight) {
  const w = latestWeight || profile?.weight_kg || 70
  const h = profile?.height_cm || 170
  const a = profile?.age || 25
  const g = profile?.gender || 'male'
  const act = profile?.activity_level || 'moderate'
  const goal = profile?.goal_type || 'maintenance'
  // Mifflin-St Jeor
  const bmr = g === 'female' ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5
  const tdee = Math.round(bmr * (ACT_MULT[act] || 1.55))
  let cal = tdee
  if (goal === 'weight_loss') cal = tdee - 500
  else if (goal === 'weight_gain') cal = tdee + 400
  else if (goal === 'lean_bulk') cal = tdee + 250
  cal = Math.max(cal, 1200)
  // Macro split based on goal
  let pPct = 0.30, cPct = 0.40, fPct = 0.30
  if (goal === 'weight_loss') { pPct = 0.35; cPct = 0.35; fPct = 0.30 }
  else if (goal === 'weight_gain' || goal === 'lean_bulk') { pPct = 0.25; cPct = 0.45; fPct = 0.30 }
  return {
    cal, protein: Math.round((cal * pPct) / 4), carbs: Math.round((cal * cPct) / 4), fat: Math.round((cal * fPct) / 9),
    tdee, bmr: Math.round(bmr), weight: w, goalType: goal,
  }
}

import useAuthStore from '../../store/authStore'

export default function MemberNutrition() {
  const [profile, setProfile] = useState(null)
  const [latestWeight, setLatestWeight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [setupForm, setSetupForm] = useState({ age: 25, height_cm: 170, gender: 'male', activity_level: 'moderate', goal_type: 'maintenance' })
  const [saving, setSaving] = useState(false)

  const [logged, setLogged] = useState([])
  const [search, setSearch] = useState('')
  const [selectedMeal, setSelectedMeal] = useState('BREAKFAST')
  const [selectedFoods, setSelectedFoods] = useState([])
  const [waterGlasses, setWaterGlasses] = useState(0)

  // Remote save flag
  const [hasChanges, setHasChanges] = useState(false)

  const [showPanel, setShowPanel] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState('BREAKFAST')

  useEffect(() => {
    Promise.all([
      client.get('/user/fitness-profile').then(r => r.data).catch(() => null),
      client.get('/admin/finances/body-metrics').then(r => r.data).catch(() => []),
      client.get('/user/nutrition-log/today').then(r => r.data).catch(() => null)
    ]).then(([fp, bm, nutLog]) => {
      setProfile(fp)
      if (fp) setSetupForm({ age: fp.age || 25, height_cm: fp.height_cm || 170, gender: fp.gender || 'male', activity_level: fp.activity_level || 'moderate', goal_type: fp.goal_type || 'maintenance' })
      if (bm?.length) setLatestWeight(parseFloat(bm[bm.length - 1].body_weight_kg))
      if (!fp?.goal_type) setShowSetup(true)
      
      if (nutLog) {
        setLogged(nutLog.logged_food || [])
        setWaterGlasses(nutLog.water_glasses || 0)
      }
    }).finally(() => setLoading(false))
  }, [])

  // Background auto-save to cloud
  useEffect(() => {
    if (!hasChanges) return
    const timeout = setTimeout(() => {
      client.put('/user/nutrition-log/today', {
        logged_food: logged,
        water_glasses: waterGlasses
      }).catch(console.error)
      setHasChanges(false)
    }, 1000)
    return () => clearTimeout(timeout)
  }, [logged, waterGlasses, hasChanges])

  const goals = computeGoals(profile, latestWeight)
  const scale = (food, nutrient, quantity) => DIRECT_ITEMS.includes(food.name) ? food[nutrient] * quantity : (food[nutrient] * quantity) / 100
  const totals = logged.reduce((a, e) => ({ cal: a.cal + scale(e.food, 'cal', e.qty), protein: a.protein + scale(e.food, 'protein', e.qty), carbs: a.carbs + scale(e.food, 'carbs', e.qty), fat: a.fat + scale(e.food, 'fat', e.qty) }), { cal: 0, protein: 0, carbs: 0, fat: 0 })
  const handleAdd = () => { if (selectedFoods.length === 0) return; setLogged([...logged, ...selectedFoods.map(sf => ({ food: sf.food, meal: selectedMeal, qty: sf.qty }))]); setHasChanges(true); setSelectedFoods([]); setSearch(''); setShowPanel(false) }
  const handleRemove = (idx) => { setLogged(logged.filter((_, i) => i !== idx)); setHasChanges(true) }
  const handleSetWater = (val) => { setWaterGlasses(val); setHasChanges(true) }
  const filteredFoods = FOOD_DB.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await client.put('/user/fitness-profile', setupForm)
      setProfile(res.data); setShowSetup(false)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const macros = [
    { label: 'PROTEIN', val: totals.protein, goal: goals.protein, unit: 'G', color: '#E8001D' },
    { label: 'CARBS', val: totals.carbs, goal: goals.carbs, unit: 'G', color: '#F59E0B' },
    { label: 'FAT', val: totals.fat, goal: goals.fat, unit: 'G', color: '#3B82F6' },
  ]

  if (loading) return <div style={{ padding: '2rem', color: '#444' }}>Loading...</div>

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="text-page-title">NUTRITION</h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Calorie targets based on your body metrics and goal</p>
        </div>
        <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-start' }} className="header-actions">
          <button onClick={() => setShowSetup(true)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', borderColor: '#3B82F6', color: '#3B82F6' }}><Settings size={14} /> GOAL</button>
          <button onClick={() => setShowPanel(true)} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Plus size={16} strokeWidth={2.5} /> LOG FOOD</button>
        </div>
      </div>

      {/* Goal Banner */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid #E8001D', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div className="goal-banner">
          <div><p className="text-label-sm">GOAL</p><p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18, color: '#E8001D', whiteSpace: 'nowrap' }}>{GOAL_LABELS[goals.goalType] || 'MAINTENANCE'}</p></div>
          <div><p className="text-label-sm">WEIGHT</p><p style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 16 }}>{goals.weight} KG</p></div>
          <div><p className="text-label-sm">TDEE</p><p style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 16 }}>{goals.tdee} KCAL</p></div>
          <div><p className="text-label-sm">TARGET</p><p style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, fontSize: 16, color: goals.goalType === 'weight_loss' ? '#22C55E' : goals.goalType === 'maintenance' ? '#F0F0F0' : '#F59E0B' }}>{goals.cal} KCAL</p></div>
        </div>
        <p style={{ fontSize: 11, color: '#444', width: '100%', textAlign: 'right' }} className="hide-mobile">{goals.goalType === 'weight_loss' ? '-500 DEFICIT' : goals.goalType === 'weight_gain' ? '+400 SURPLUS' : goals.goalType === 'lean_bulk' ? '+250 SURPLUS' : 'AT MAINTENANCE'}</p>
      </div>

      {/* Calorie + Macro Row */}
      <div className="nutrition-grid">
        <div className="card-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderLeft: '3px solid #22C55E', padding: '2rem 1rem' }}>
          <p className="text-label" style={{ marginBottom: 8, color: '#22C55E' }}>CALORIES</p>
          <p className="text-hero-number" style={{ fontSize: 48, color: '#22C55E' }}>{Math.round(totals.cal)}</p>
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#444', marginTop: 4 }}>/ {goals.cal} KCAL</p>
          <div className="progress-track" style={{ width: '100%', maxWidth: 200, marginTop: 16 }}>
            <div className="progress-fill" style={{ width: `${Math.min((totals.cal / goals.cal) * 100, 100)}%`, background: '#22C55E' }} />
          </div>
          <p style={{ fontSize: 12, color: '#666', marginTop: 8, fontFamily: '"JetBrains Mono", monospace' }}>{Math.max(0, Math.round(goals.cal - totals.cal))} REMAINING</p>
        </div>
        <div className="card macro-grid">
          {macros.map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <p className="text-label" style={{ marginBottom: 10, color: m.color }}>{m.label}</p>
              <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 26, fontWeight: 500, color: m.color, lineHeight: 1 }}>{Math.round(m.val)}</p>
              <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#555', marginTop: 4 }}>/ {m.goal}{m.unit}</p>
              <div className="progress-track" style={{ marginTop: 12 }}>
                <div style={{ height: '100%', borderRadius: 2, background: m.color, transition: 'width 300ms ease', width: `${Math.min((m.val / m.goal) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Water */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-section" style={{ fontSize: 14 }}>WATER INTAKE</h3>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#888' }}>{waterGlasses} / 8</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <button key={i} type="button" onClick={() => setWaterGlasses(i < waterGlasses ? i : i + 1)}
              style={{ flex: 1, height: 36, borderRadius: 2, border: 'none', cursor: 'pointer', transition: 'all 100ms ease', background: i < waterGlasses ? 'rgba(96,165,250,0.2)' : '#1A1A1A', borderBottom: i < waterGlasses ? '2px solid #60A5FA' : '2px solid transparent' }} />
          ))}
        </div>
      </div>

      {/* Meal Sections */}
      {MEALS.map(meal => {
        const items = logged.filter(e => e.meal === meal)
        const cals = items.reduce((s, e) => s + scale(e.food, 'cal', e.qty), 0)
        const open = expandedMeal === meal
        return (
          <div key={meal} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: 4, marginBottom: '0.5rem', overflow: 'hidden' }}>
            <button type="button" onClick={() => setExpandedMeal(open ? null : meal)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#F0F0F0' }}
              onMouseOver={e => e.currentTarget.style.background = '#1A1A1A'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 15 }}>{meal}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#888' }}>{Math.round(cals)} KCAL</span>
                {open ? <ChevronUp size={16} style={{ color: '#444' }} /> : <ChevronDown size={16} style={{ color: '#444' }} />}
              </div>
            </button>
            {open && items.length > 0 && <div style={{ borderTop: '1px solid #1E1E1E' }}>
              {items.map((entry, idx) => {
                const gi = logged.indexOf(entry)
                return (
                  <div key={idx} style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '1px solid #141414', gap: '0.5rem' }}
                    onMouseOver={e => e.currentTarget.style.background = '#1A1A1A'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.food.name}</p>
                      <p style={{ fontSize: 12, color: '#666', fontFamily: '"JetBrains Mono", monospace', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.qty}{DIRECT_ITEMS.includes(entry.food.name) ? ' SRV' : 'G'} | P:{Math.round(scale(entry.food, 'protein', entry.qty))} C:{Math.round(scale(entry.food, 'carbs', entry.qty))} F:{Math.round(scale(entry.food, 'fat', entry.qty))}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '0 0 auto' }}>
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 15, fontWeight: 600, color: '#E8001D', whiteSpace: 'nowrap' }}>{Math.round(scale(entry.food, 'cal', entry.qty))} KCAL</span>
                      <button type="button" onClick={() => handleRemove(gi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 18, padding: '0 4px', flexShrink: 0 }}
                        onMouseOver={e => e.currentTarget.style.color = '#E8001D'} onMouseOut={e => e.currentTarget.style.color = '#555'}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>}
            {open && items.length === 0 && <div style={{ padding: '1.5rem', textAlign: 'center', color: '#333', borderTop: '1px solid #1E1E1E', fontSize: 13 }}>Nothing logged for {meal.toLowerCase()}.</div>}
          </div>
        )
      })}

      {/* Goal Setup Modal */}
      {showSetup && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-header"><h2>FITNESS GOAL</h2></div>
            <div className="modal-body">
              <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Set your body data to auto-calculate daily calorie and macro targets using the Mifflin-St Jeor formula.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label className="input-label">AGE</label><input type="number" className="input" style={{ width: '100%' }} value={setupForm.age} onChange={e => setSetupForm({ ...setupForm, age: +e.target.value })} /></div>
                  <div><label className="input-label">HEIGHT (CM)</label><input type="number" className="input" style={{ width: '100%' }} value={setupForm.height_cm} onChange={e => setSetupForm({ ...setupForm, height_cm: +e.target.value })} /></div>
                </div>
                <div><label className="input-label">GENDER</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['male', 'female'].map(g => (
                      <button key={g} type="button" onClick={() => setSetupForm({ ...setupForm, gender: g })}
                        style={{ flex: 1, padding: '8px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', background: setupForm.gender === g ? '#E8001D' : '#1A1A1A', color: setupForm.gender === g ? '#fff' : '#888' }}>{g}</button>
                    ))}
                  </div>
                </div>
                <div><label className="input-label">ACTIVITY LEVEL</label>
                  <select className="input" style={{ width: '100%' }} value={setupForm.activity_level} onChange={e => setSetupForm({ ...setupForm, activity_level: e.target.value })}>
                    <option value="sedentary">Sedentary (desk job)</option>
                    <option value="light">Light (1-3 days/week)</option>
                    <option value="moderate">Moderate (3-5 days/week)</option>
                    <option value="active">Active (6-7 days/week)</option>
                    <option value="very_active">Very Active (2x/day)</option>
                  </select>
                </div>
                <div><label className="input-label">GOAL</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                    {Object.entries(GOAL_LABELS).map(([k, v]) => (
                      <button key={k} type="button" onClick={() => setSetupForm({ ...setupForm, goal_type: k })}
                        style={{ padding: '10px 4px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: setupForm.goal_type === k ? '#E8001D' : '#1A1A1A', color: setupForm.goal_type === k ? '#fff' : '#888', transition: 'all 100ms ease' }}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: 16 }}>
                <button type="button" onClick={() => setShowSetup(false)} className="btn-ghost">CANCEL</button>
                <button type="button" onClick={handleSaveProfile} disabled={saving} className="btn-primary">{saving ? 'SAVING...' : 'SAVE GOAL'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Food Panel */}
      {showPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowPanel(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: '#111', height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #1E1E1E', zIndex: 51, marginLeft: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1E1E1E' }}>
              <h2 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18 }}>LOG FOOD</h2>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                {MEALS.map(m => (
                  <button key={m} type="button" onClick={() => setSelectedMeal(m)}
                    style={{ padding: '8px 4px', borderRadius: 2, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', textTransform: 'uppercase', background: selectedMeal === m ? '#E8001D' : '#1A1A1A', color: selectedMeal === m ? '#fff' : '#888' }}>{m}</button>
                ))}
              </div>
              <input type="text" placeholder="Search food..." className="input" style={{ width: '100%' }} value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filteredFoods.map(f => {
                  const isSelected = selectedFoods.some(sf => sf.food.id === f.id);
                  const selectedItem = selectedFoods.find(sf => sf.food.id === f.id);
                  return (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem 0.75rem', borderRadius: 2, border: isSelected ? '1px solid #E8001D' : '1px solid transparent', background: isSelected ? 'rgba(232,0,29,0.08)' : '#1A1A1A', color: '#F0F0F0' }}>
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => isSelected ? setSelectedFoods(selectedFoods.filter(sf => sf.food.id !== f.id)) : setSelectedFoods([...selectedFoods, { food: f, qty: 100 }])}>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</p>
                        <p style={{ fontSize: 11, color: '#444', fontFamily: '"JetBrains Mono", monospace', marginTop: 1 }}>{f.cal} KCAL / P:{f.protein} C:{f.carbs} F:{f.fat}</p>
                      </div>
                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="number" min={1} value={selectedItem.qty} onChange={e => setSelectedFoods(selectedFoods.map(sf => sf.food.id === f.id ? { ...sf, qty: Number(e.target.value) } : sf))} className="input" style={{ width: 60, padding: '4px 8px', height: 'auto', fontSize: 12 }} />
                          <span style={{ fontSize: 11, color: '#888', minWidth: 25 }}>{DIRECT_ITEMS.includes(f.name) ? 'SRV' : 'G'}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1E1E1E' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowPanel(false)} className="btn-ghost" style={{ flex: 1 }}>CANCEL</button>
                <button type="button" onClick={handleAdd} disabled={selectedFoods.length === 0} className="btn-primary" style={{ flex: 2 }}>ADD TO {selectedMeal}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
