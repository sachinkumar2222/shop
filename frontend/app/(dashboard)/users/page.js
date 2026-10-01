'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api.js';
import { UserCheck, Plus, Trash2, Mail, Lock, User, Shield } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CASHIER');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });

      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create staff account');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, userName) => {
    if (!confirm(`Are you sure you want to delete staff account: ${userName}?`)) return;

    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('CASHIER');
    setError('');
  };

  return (
    <>
      <style>{`
        .users-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .users-modal {
          width: 420px;
          border-radius: 20px;
          padding: 2rem;
          max-height: 100vh;
          overflow-y: auto;
        }
        @media (max-width: 768px) {
          .users-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .users-header button {
            width: 100%;
          }
          .users-modal {
            width: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    <div style={styles.container}>
      <div className="users-header">
        <div>
          <h1 style={styles.title}>Staff & Cashier Management</h1>
          <p style={styles.subtitle}>Create & manage cashier accounts and system permissions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} /> Add New Cashier / Staff
        </button>
      </div>

      {/* Users Table */}
      <div className="table-container table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Email Address</th>
              <th>System Role</th>
              <th>Created On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong style={{ fontSize: '0.95rem' }}>{u.name}</strong>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#536168' }}>
                    <Mail size={14} />
                    <span>{u.email}</span>
                  </div>
                </td>
                <td>
                  <span
                    className={`badge ${
                      u.role === 'ADMIN' ? 'badge-warning' : 'badge-info'
                    }`}
                  >
                    {u.role === 'ADMIN' ? '👑 ADMIN' : '🛒 CASHIER'}
                  </span>
                </td>
                <td>
                  {new Date(u.createdAt).toLocaleDateString('en-IN', {
                    dateStyle: 'medium',
                  })}
                </td>
                <td>
                  <button
                    onClick={() => handleDeleteUser(u.id, u.name)}
                    className="btn btn-sm btn-secondary"
                    title="Delete Account"
                  >
                    <Trash2 size={14} color="#f43f5e" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Cashier Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="users-modal glass-panel animate-fade-in">
            <h2>Add New Cashier / Staff</h2>
            <p style={{ fontSize: '0.88rem', color: '#536168', marginBottom: '1rem' }}>
              Create login credentials for your store salesperson
            </p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleCreateUser} style={styles.modalForm}>
              <div className="input-group">
                <label>Full Name</label>
                <div style={styles.inputWrapper}>
                  <User size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    className="input-control"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Email Address (Username)</label>
                <div style={styles.inputWrapper}>
                  <Mail size={16} style={styles.inputIcon} />
                  <input
                    type="email"
                    className="input-control"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="e.g. ramesh@shreepooja.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Password (Min 6 chars)</label>
                <div style={styles.inputWrapper}>
                  <Lock size={16} style={styles.inputIcon} />
                  <input
                    type="password"
                    className="input-control"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Role & Access Level</label>
                <div style={styles.inputWrapper}>
                  <Shield size={16} style={styles.inputIcon} />
                  <select
                    className="input-control"
                    style={{ paddingLeft: '2.4rem' }}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="CASHIER">🛒 CASHIER (POS Billing Only)</option>
                    <option value="ADMIN">👑 ADMIN (Full Access + Reports)</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#536168',
  },
  tableContainer: {
    borderRadius: '18px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.9rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    width: '420px',
    borderRadius: '20px',
    padding: '2rem',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    marginTop: '0.5rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.8rem',
    color: '#64748b',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.25rem',
  },
  errorBox: {
    background: '#fff0f0',
    color: '#a72e3e',
    padding: '0.5rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
  },
};
