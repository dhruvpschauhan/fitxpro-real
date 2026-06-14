import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Users, CreditCard, LayoutDashboard, Dumbbell, Wrench, Tag, Target, Megaphone, LogOut, Library, Bell, Menu } from 'lucide-react'
import useAuthStore from '../../store/authStore'

const NAV = [
  { name: 'DASHBOARD',       path: '/admin',                    icon: LayoutDashboard },
  { name: 'MEMBERS',         path: '/admin/members',            icon: Users           },
  { name: 'PLANS',           path: '/admin/plans',              icon: Tag             },
  { name: 'LEADS',           path: '/admin/leads',              icon: Target          },
  { name: 'FINANCES',        path: '/admin/finances',           icon: CreditCard      },
  { name: 'ALERTS',          path: '/admin/alerts',             icon: Bell            },
  { name: 'WORKOUTS',        path: '/admin/workouts',           icon: Dumbbell,       exact: true },
  { name: 'EXERCISE LIBRARY',path: '/admin/exercise-library',   icon: Library,        sub: true   },
  { name: 'EQUIPMENT',       path: '/admin/equipment',          icon: Wrench          },
  { name: 'ANNOUNCEMENTS',   path: '/admin/announcements',      icon: Megaphone       },
]

// Bottom nav shows only 5 most-used items on mobile
const BOTTOM_NAV = [
  { name: 'HOME',    path: '/admin',             icon: LayoutDashboard },
  { name: 'MEMBERS', path: '/admin/members',     icon: Users           },
  { name: 'PLANS',   path: '/admin/plans',       icon: Tag             },
  { name: 'FINANCE', path: '/admin/finances',    icon: CreditCard      },
  { name: 'MORE',    action: 'open_more',        icon: Menu            },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const isActive = (path, exact) => {
    if (path === '/admin' || exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const currentPage = NAV.find(n => isActive(n.path))?.name || 'ADMIN'

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#080808', color: '#F0F0F0' }}>

      {/* ── Sidebar (tablet + desktop) ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">FITX PRO</span>
          {/* Tablet icon-only: show initials */}
          <span style={{ display: 'none' }} className="sidebar-logo-icon">FX</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <Link
              key={item.name}
              to={item.path}
              data-label={item.name}
              className={`nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
              style={item.sub ? { paddingLeft: '2rem', fontSize: 12 } : {}}
            >
              <item.icon size={item.sub ? 15 : 18} strokeWidth={1.8} />
              <span className="nav-label">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-text" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.5rem 0' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 2, background: '#1A1A1A',
              border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 14, color: '#E8001D',
              flexShrink: 0,
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#F0F0F0' }}>{user?.username}</p>
              <p style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ADMIN</p>
            </div>
          </div>
          {/* Tablet: just avatar centered */}
          <div className="sidebar-avatar" style={{ marginBottom: '0.5rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 2, background: '#1A1A1A',
              border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 14, color: '#E8001D',
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-label="LOGOUT"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
              padding: '0.6rem 0.5rem', background: 'transparent', border: 'none',
              color: '#444', cursor: 'pointer', fontSize: 13, fontFamily: '"Inter", sans-serif',
              transition: 'color 100ms ease', minHeight: 44,
            }}
            onMouseOver={e => e.currentTarget.style.color = '#E8001D'}
            onMouseOut={e => e.currentTarget.style.color = '#444'}
          >
            <LogOut size={16} strokeWidth={1.8} />
            <span className="nav-label"> LOGOUT</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="mobile-header">
        <span className="mobile-header-title">FITX PRO</span>
        <button className="mobile-avatar-btn" onClick={() => setProfileSheetOpen(true)}>
          {user?.username?.[0]?.toUpperCase()}
        </button>
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom Nav (mobile only) ── */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(item => (
          item.action === 'open_more' ? (
            <button
              key={item.name}
              onClick={() => setMoreSheetOpen(true)}
              className={`bottom-nav-item ${moreSheetOpen ? 'active' : ''}`}
            >
              <item.icon size={20} strokeWidth={1.8} />
              {item.name}
            </button>
          ) : (
            <Link
              key={item.name}
              to={item.path}
              className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <item.icon size={20} strokeWidth={1.8} />
              {item.name}
            </Link>
          )
        ))}
      </nav>

      {/* ── Mobile Profile Sheet ── */}
      {profileSheetOpen && (
        <div className="profile-sheet-overlay" onClick={() => setProfileSheetOpen(false)}>
          <div className="profile-sheet" onClick={e => e.stopPropagation()}>
            <div className="profile-sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 2, background: '#1A1A1A',
                border: '1px solid #E8001D', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18, color: '#E8001D',
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 15 }}>{user?.username}</p>
                <p style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ADMIN</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '14px 16px', background: 'transparent',
                border: '1px solid #3A0010', borderRadius: 2, color: '#E8001D',
                fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700,
                fontSize: 14, textTransform: 'uppercase', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <LogOut size={16} /> LOGOUT
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile More Menu Sheet ── */}
      {moreSheetOpen && (
        <div className="profile-sheet-overlay" onClick={() => setMoreSheetOpen(false)}>
          <div className="profile-sheet" onClick={e => e.stopPropagation()}>
            <div className="profile-sheet-handle" />
            <h3 style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 18, color: '#F0F0F0', marginBottom: '1rem', textTransform: 'uppercase' }}>More Options</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              {NAV.filter(n => !['DASHBOARD', 'MEMBERS', 'PLANS', 'FINANCES'].includes(n.name)).map(item => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMoreSheetOpen(false)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    background: '#1A1A1A', padding: '1rem 0.5rem', borderRadius: 4, textDecoration: 'none', color: '#F0F0F0',
                    border: isActive(item.path, item.exact) ? '1px solid #E8001D' : '1px solid #2A2A2A',
                    textAlign: 'center'
                  }}
                >
                  <item.icon size={22} color={isActive(item.path, item.exact) ? '#E8001D' : '#888'} />
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: '"Inter", sans-serif', textTransform: 'uppercase' }}>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
