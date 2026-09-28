'use client';

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
  Store,
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading Shree Pooja Ghr Dashboard...</p>
      </div>
    );
  }

  const navItems = [
    { label: 'POS Billing', href: '/pos', icon: ShoppingCart },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'Categories', href: '/categories', icon: Tags },
    { label: 'Invoices', href: '/invoices', icon: FileText },
    { label: 'Reports & Profit', href: '/reports', icon: BarChart3, role: 'ADMIN' },
    { label: 'Customers', href: '/customers', icon: Users, role: 'ADMIN' },
    { label: 'Staff & Cashiers', href: '/users', icon: UserCheck, role: 'ADMIN' },
  ];

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar} className="glass-panel">
        <div style={styles.brand}>
          <div style={styles.logoIcon}>
            <ShoppingBag size={22} color="#f97316" />
          </div>
          <div>
            <h2 style={styles.brandTitle}>श्री पूजा घर</h2>
            <span style={styles.brandSubtitle}>Ajmer POS & Analytics</span>
          </div>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            if (item.role && user?.role !== item.role) return null;
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <Icon size={18} color={isActive ? '#f97316' : '#94a3b8'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div style={styles.userFooter}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div style={styles.userName}>{user?.name || 'User'}</div>
              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                {user?.role}
              </span>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary btn-icon" title="Logout">
            <LogOut size={16} color="#f43f5e" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>{children}</main>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0f1117',
  },
  sidebar: {
    width: '260px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '1.25rem',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '0',
    zIndex: 10,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    paddingBottom: '1.25rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  logoIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'rgba(249, 115, 22, 0.15)',
    border: '1px solid rgba(249, 115, 22, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: '#ffffff',
  },
  brandSubtitle: {
    fontSize: '0.72rem',
    color: '#64748b',
    display: 'block',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    margin: '1.5rem 0',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.7rem 1rem',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '0.9rem',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  navItemActive: {
    background: 'rgba(249, 115, 22, 0.15)',
    color: '#f97316',
    border: '1px solid rgba(249, 115, 22, 0.3)',
    fontWeight: '700',
  },
  userFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'var(--gradient-saffron)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#f8fafc',
  },
  mainContent: {
    flex: 1,
    padding: '1.5rem 2rem',
    overflowY: 'auto',
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    color: '#94a3b8',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(249, 115, 22, 0.2)',
    borderTop: '3px solid #f97316',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
