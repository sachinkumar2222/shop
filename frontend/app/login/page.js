'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { ShoppingBag, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@shreepooja.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="glass-panel animate-fade-in">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <ShoppingBag size={28} color="#f97316" />
          </div>
          <h1 style={styles.title}>श्री पूजा घर</h1>
          <p style={styles.subtitle}>POS, Inventory & WhatsApp Automation System</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={styles.errorBox} className="animate-fade-in">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="input-group">
            <label>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                className="input-control"
                style={{ paddingLeft: '2.5rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shreepooja.com"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                className="input-control"
                style={{ paddingLeft: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In to POS'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Footer / Demo hint */}
        <div style={styles.demoFooter}>
          <Sparkles size={14} color="#eab308" />
          <span>Demo Credentials: <code>admin@shreepooja.com</code> / <code>admin123</code></span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'radial-gradient(circle at 50% 20%, rgba(249, 115, 22, 0.12) 0%, transparent 60%), #0f1117',
    padding: '1.5rem',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    borderRadius: '24px',
    padding: '2.5rem 2rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoBadge: {
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    background: 'rgba(249, 115, 22, 0.15)',
    border: '1px solid rgba(249, 115, 22, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem auto',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #ffffff 0%, #f97316 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.3rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  errorBox: {
    background: 'rgba(244, 63, 94, 0.15)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    color: '#f43f5e',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.9rem',
    color: '#64748b',
  },
  submitBtn: {
    width: '100%',
    padding: '0.85rem',
    marginTop: '0.5rem',
  },
  demoFooter: {
    marginTop: '2rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    textAlign: 'center',
    fontSize: '0.78rem',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  },
};
