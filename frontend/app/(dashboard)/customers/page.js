'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api.js';
import { Users, Download, Sparkles, Phone, Award } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [segment, setSegment] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch('/customers');
      setCustomers(res.data?.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/exports/wsm?segment=${segment}&token=${token}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `spg_customers_${segment}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message || 'Failed to download CSV');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Customers & Marketing</h1>
          <p style={styles.subtitle}>Customer lifetime value (LTV) & WhatsApp CSV marketing exports</p>
        </div>
      </div>

      {/* WhatsApp Export Card */}
      <div style={styles.exportCard} className="glass-panel animate-fade-in">
        <div style={styles.exportHeader}>
          <div style={styles.iconBox}>
            <Sparkles size={24} color="#eab308" />
          </div>
          <div>
            <h3>WhatsApp Marketing CSV Export</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Download customer segments formatted for bulk WhatsApp campaign software.
            </p>
          </div>
        </div>

        <div style={styles.exportControls}>
          <select
            className="input-control"
            style={{ width: '220px' }}
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
          >
            <option value="all">All Customers</option>
            <option value="high_value">High Value (LTV &gt; ₹1,000)</option>
            <option value="recent">Active Buyers (Last 30 Days)</option>
          </select>

          <button onClick={handleDownloadCSV} className="btn btn-primary">
            <Download size={18} /> Export Segment CSV
          </button>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div style={styles.tableContainer} className="glass-panel">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone Number</th>
              <th>Total Orders</th>
              <th>Lifetime Spend (LTV)</th>
              <th>Last Purchase</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong style={{ fontSize: '0.95rem' }}>{c.name}</strong>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} color="#64748b" />
                    <span>{c.phone}</span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-info">{c.totalOrders} orders</span>
                </td>
                <td>
                  <strong style={{ fontSize: '1.05rem', color: '#10b981' }}>
                    ₹{Number(c.lifetimeSpend).toFixed(2)}
                  </strong>
                </td>
                <td>
                  {c.lastPurchase
                    ? new Date(c.lastPurchase).toLocaleDateString('en-IN')
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
    color: '#94a3b8',
  },
  exportCard: {
    padding: '1.5rem',
    borderRadius: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(249, 115, 22, 0.05) 100%)',
    border: '1px solid rgba(234, 179, 8, 0.2)',
  },
  exportHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'rgba(234, 179, 8, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportControls: {
    display: 'flex',
    gap: '0.8rem',
    alignItems: 'center',
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
};
