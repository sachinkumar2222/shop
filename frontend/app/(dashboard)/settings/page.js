'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [upiAccounts, setUpiAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [newUpiId, setNewUpiId] = useState('');
  const [newName, setNewName] = useState('');

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/v1/upi', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setUpiAccounts(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/v1/upi', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ upiId: newUpiId, name: newName })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      
      setNewUpiId('');
      setNewName('');
      fetchAccounts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/v1/upi/${id}/toggle`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      
      fetchAccounts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this UPI Account?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/v1/upi/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      
      fetchAccounts();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading settings...</div>;

  return (
    <>
      <style>{`
        .settings-form {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          align-items: flex-end;
        }
        @media (max-width: 768px) {
          .settings-form {
            flex-direction: column;
            align-items: stretch;
          }
          .settings-form button {
            width: 100%;
          }
        }
      `}</style>
    <div style={{ maxWidth: 1100, margin: '0 auto' }} className="animate-fade-in">
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Store Settings</h2>
      
      {error && <div className="error-box">{error}</div>}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>Payment Methods - UPI</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Add multiple UPI accounts for your store. The active ones will appear on the cashier's checkout screen.
        </p>

        <form onSubmit={handleAdd} className="settings-form">
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>UPI ID</label>
            <input 
              type="text" 
              className="input-control" 
              placeholder="e.g. store@okhdfc" 
              value={newUpiId}
              onChange={e => setNewUpiId(e.target.value)}
              required 
            />
          </div>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Friendly Name</label>
            <input 
              type="text" 
              className="input-control" 
              placeholder="e.g. HDFC Current Account" 
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
            Add UPI ID
          </button>
        </form>

        <div className="table-responsive">
          <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Friendly Name</th>
                <th>UPI ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {upiAccounts.map(account => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{account.upiId}</td>
                  <td>
                    <span className={`badge ${account.isActive ? 'badge-success' : 'badge-warning'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleToggle(account.id, account.isActive)}
                      className={`btn btn-sm ${account.isActive ? 'btn-secondary' : 'btn-success'}`}
                    >
                      {account.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button 
                      onClick={() => handleDelete(account.id)}
                      className="btn btn-sm btn-danger"
                      style={{ background: '#fff0f0', color: '#a72e3e', border: '1px solid #f3c9ce' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {upiAccounts.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No UPI accounts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </>
  );
}
