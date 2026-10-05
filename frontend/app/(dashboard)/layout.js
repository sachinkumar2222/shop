'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  Tags,
  FileText,
  BarChart3,
  Users,
  UserCheck,
  LogOut,
  ShoppingBag,
  Settings,
  Menu,
  X,
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading Shree Pooja Ghar Dashboard...</p>
      </div>
    );
  }

  const navItems = [
    { label: 'POS Billing', href: '/pos', icon: ShoppingCart },
    { label: 'Cart & Order', href: '/cart', icon: ShoppingBag },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'Categories', href: '/categories', icon: Tags },
    { label: 'Invoices', href: '/invoices', icon: FileText },
    { label: 'Reports', href: '/reports', icon: BarChart3, role: 'ADMIN' },
    { label: 'Customers', href: '/customers', icon: Users, role: 'ADMIN' },
    { label: 'Staff', href: '/users', icon: UserCheck, role: 'ADMIN' },
    { label: 'Settings', href: '/settings', icon: Settings, role: 'ADMIN' },
  ];

  const visibleNavItems = navItems.filter(item => !item.role || user?.role === item.role);
  const bottomNavItems = visibleNavItems.slice(0, 4); // first 4 in bottom nav

  return (
    <>
      <style>{`
        /* ──── Layout ──── */
        .app-layout {
          display: flex;
          min-height: 100vh;
          width: 100%;
          background: var(--bg-primary);
          position: relative;
        }

        /* ──── Desktop Sidebar ──── */
        .desktop-sidebar {
          width: 256px;
          min-width: 256px;
          max-width: 256px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 1.4rem 1.1rem 1rem;
          border-right: 1px solid var(--border-color);
          z-index: 10;
          flex-shrink: 0;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 8px 0 28px rgba(31, 42, 46, 0.025);
        }

        /* ──── Main Content ──── */
        .dashboard-main {
          flex: 1;
          min-width: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .main-content {
          flex: 1;
          min-width: 0;
          height: 100%;
          padding: 1.75rem clamp(1.25rem, 3vw, 3rem);
          overflow-x: hidden;
          overflow-y: auto;
        }

        /* ──── Mobile Header ──── */
        .mobile-header {
          display: none;
        }

        /* ──── Mobile Drawer Overlay ──── */
        .mobile-drawer-overlay {
          display: none;
        }
        .mobile-drawer {
          display: none;
        }

        /* ──── Mobile Bottom Nav ──── */
        .mobile-bottom-nav {
          display: none;
        }

        /* ──── RESPONSIVE ──── */
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }

          .main-content {
            padding: 1rem 0.85rem 84px !important;
            min-height: 0;
          }

          .dashboard-main {
            height: 100dvh;
          }

          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.65rem 0.9rem;
            background: rgba(255,255,255,0.96);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 30;
            gap: 0.5rem;
          }

          .mobile-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            min-height: 66px;
            background: var(--bg-card);
            border-top: 1px solid var(--border-color);
            z-index: 50;
            align-items: center;
            justify-content: space-around;
            padding: 0.4rem 0.5rem env(safe-area-inset-bottom, 0px);
          }

          /* When drawer is open, show overlay */
          .mobile-drawer-overlay.open {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 40;
          }

          /* Slide-in drawer */
          .mobile-drawer {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 256px;
            background: var(--bg-card);
            border-right: 1px solid var(--border-color);
            z-index: 50;
            padding: 1.25rem 1rem;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          .mobile-drawer.open {
            transform: translateX(0);
          }
        }
      `}</style>

      {/* ─── Mobile Drawer ─── */}
      <div className={`mobile-drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <nav className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img src="/logo.png" alt="श्री पूजा घर Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>श्री पूजा घर</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#536168', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) }}
            >
              <Icon size={18} color={isActive ? '#b95117' : '#758188'} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={styles.avatar}>{user?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user?.name}</div>
              <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>{user?.role}</span>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', color: '#f43f5e' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </nav>

      <div className="app-layout">
        {/* ─── Desktop Sidebar ─── */}
        <aside className="desktop-sidebar">
          <div style={styles.brand}>
            <img src="/logo.png" alt="श्री पूजा घर Logo" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain' }} />
            <div>
              <h2 style={styles.brandTitle}>श्री पूजा घर</h2>
              <span style={styles.brandSubtitle}>Ajmer POS & Analytics</span>
            </div>
          </div>

          <nav style={styles.nav}>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) }}>
                  <Icon size={18} color={isActive ? '#b95117' : '#758188'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div style={styles.userFooter}>
            <div style={{ ...styles.userInfo, cursor: 'pointer' }} onClick={() => setProfileModalOpen(true)} title="Click to view profile">
              <div style={styles.avatar}>{user?.name?.[0]?.toUpperCase() || 'U'}</div>
              <div>
                <div style={styles.userName}>{user?.name || 'User'}</div>
                <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{user?.role}</span>
              </div>
            </div>
            <button onClick={logout} className="btn btn-secondary btn-icon" title="Logout">
              <LogOut size={16} color="#f43f5e" />
            </button>
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <div className="dashboard-main">
          {/* Mobile header inline (because CSS display:none overrides the outer) */}
          <header className="mobile-header">
            <button
              onClick={() => setDrawerOpen(true)}
              style={{ background: 'none', border: 'none', color: '#b95117', cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              <Menu size={24} />
            </button>
            <img src="/logo.png" alt="Logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', flex: 1, textAlign: 'center' }}>
              श्री पूजा घर
            </h2>
            <button
              onClick={() => setProfileModalOpen(true)}
              title="Click to view profile"
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg,#e17a32,#ca5b20)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </button>
          </header>

          <main className="main-content">{children}</main>
        </div>

        {/* ─── Mobile Bottom Nav ─── */}
        <nav className="mobile-bottom-nav">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  color: isActive ? '#a84918' : '#536168', textDecoration: 'none',
                  padding: '6px 10px', borderRadius: 10,
                  background: isActive ? '#fdf0e7' : 'transparent',
                  minWidth: 52,
                }}
              >
                <Icon size={20} color={isActive ? '#b95117' : '#536168'} />
                <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
              </Link>
            );
          })}
          {/* More button opens drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: '#536168', background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 10px', borderRadius: 10, minWidth: 52,
            }}
          >
            <Menu size={20} color="#536168" />
            <span style={{ fontSize: '0.6rem' }}>More</span>
          </button>
        </nav>

        {/* ─── User Profile Modal ─── */}
        {profileModalOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)', zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
            onClick={() => setProfileModalOpen(false)}
          >
            <div
              className="glass-panel animate-fade-in"
              style={{
                width: '100%', maxWidth: 360, padding: '1.75rem',
                borderRadius: 20, background: 'var(--bg-card)', border: '1px solid rgba(249,115,22,0.3)',
                boxShadow: '0 20px 48px rgba(31,42,46,0.18)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>User Profile</h3>
                <button
                  onClick={() => setProfileModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#536168', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#e17a32,#ca5b20)',
                  color: '#fff', fontSize: '1.8rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(249,115,22,0.4)'
                }}>
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{user?.name || 'Store User'}</h4>
                  <span className="badge badge-warning" style={{ marginTop: '0.25rem' }}>{user?.role}</span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#647179' }}>Store Name:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>श्री पूजा घर (Ajmer)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#647179' }}>Role:</span>
                  <strong style={{ color: '#a84918' }}>{user?.role}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {user?.role === 'ADMIN' && (
                  <Link
                    href="/settings"
                    onClick={() => setProfileModalOpen(false)}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', width: '100%' }}
                  >
                    <Settings size={16} /> Store Settings
                  </Link>
                )}
                <button
                  onClick={() => {
                    setProfileModalOpen(false);
                    logout();
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', background: 'linear-gradient(135deg,#f43f5e,#e11d48)', justifyContent: 'center' }}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  brand: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    paddingBottom: '1.3rem', borderBottom: '1px solid var(--border-color)',
  },
  logoIcon: {
    width: 40, height: 40, borderRadius: 10,
    background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandTitle: { fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  brandSubtitle: { fontSize: '0.7rem', color: '#64748b', display: 'block' },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: '1.2rem 0', flex: 1, overflowY: 'auto', minHeight: 0 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    padding: '0.7rem 0.85rem', borderRadius: 11,
    color: '#536168', fontSize: '0.89rem', fontWeight: 600,
    textDecoration: 'none', transition: 'all 0.15s ease',
  },
  navItemActive: {
    background: '#fdf0e7', color: '#a84918',
    border: '1px solid #f2d2bb', fontWeight: 700,
  },
  userFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: '1rem', marginTop: 'auto', borderTop: '1px solid var(--border-color)', flexShrink: 0,
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg,#e17a32,#ca5b20)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
  },
  userName: { fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' },
  loadingContainer: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#536168',
  },
  spinner: {
    width: 40, height: 40, border: '3px solid rgba(249,115,22,0.2)',
    borderTop: '3px solid #f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
};
