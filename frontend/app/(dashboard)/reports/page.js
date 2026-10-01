'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api.js';
import { TrendingUp, DollarSign, PieChart, ShoppingBag, AlertTriangle, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dailySummary, setDailySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchDailySummary(selectedDate);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await apiFetch('/reports/dashboard');
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async (dateStr) => {
    try {
      const res = await apiFetch(`/reports/daily?date=${dateStr}`);
      setDailySummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setSelectedDate(val);
    fetchDailySummary(val);
  };

  if (loading) return <div>Loading reports...</div>;

  const today = dashboard?.today || {};

  return (
    <>
      <style>{`
        .report-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        @media (max-width: 768px) {
          .report-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .report-section-header input {
            width: 100% !important;
          }
        }
      `}</style>
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Profit & Sales Analytics</h1>
          <p style={styles.subtitle}>Historical FIFO profit breakdown & performance metrics</p>
        </div>
      </div>

      {/* Today KPI Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard} className="card animate-fade-in">
          <div style={styles.kpiMeta}>
            <span>Today Sales Revenue</span>
            <DollarSign size={20} color="#b95117" />
          </div>
          <div style={styles.kpiValue}>₹{today.totalSales?.toFixed(2) || '0.00'}</div>
          <span style={styles.kpiSub}>Across {today.invoiceCount || 0} invoices</span>
        </div>

        <div style={styles.kpiCard} className="card animate-fade-in">
          <div style={styles.kpiMeta}>
            <span>Net Profit Earned</span>
            <TrendingUp size={20} color="#187653" />
          </div>
          <div style={{ ...styles.kpiValue, color: '#187653' }}>
            ₹{today.totalProfit?.toFixed(2) || '0.00'}
          </div>
          <span style={styles.kpiSub}>FIFO Cost Deducted</span>
        </div>

        <div style={styles.kpiCard} className="card animate-fade-in">
          <div style={styles.kpiMeta}>
            <span>Overall Margin %</span>
            <PieChart size={20} color="#a66b12" />
          </div>
          <div style={{ ...styles.kpiValue, color: '#a66b12' }}>
            {today.marginPercentage?.toFixed(1) || '0'}%
          </div>
          <span style={styles.kpiSub}>Profitability Margin</span>
        </div>
      </div>

      {/* Section: Historical Daily Summary Picker */}
      <div style={styles.section} className="glass-panel">
        <div className="report-section-header">
          <h3><Calendar size={18} /> Daily Summary Lookup</h3>
          <input
            type="date"
            className="input-control"
            style={{ width: '180px' }}
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>

        {dailySummary && (
          <div style={styles.dailyGrid}>
            <div style={styles.dailyItem}>
              <span>Date</span>
              <strong>{dailySummary.date}</strong>
            </div>
            <div style={styles.dailyItem}>
              <span>Sales</span>
              <strong style={{ color: '#b95117' }}>₹{dailySummary.totalSales}</strong>
            </div>
            <div style={styles.dailyItem}>
              <span>Net Profit</span>
              <strong style={{ color: '#187653' }}>₹{dailySummary.totalProfit}</strong>
            </div>
            <div style={styles.dailyItem}>
              <span>Margin</span>
              <strong style={{ color: '#a66b12' }}>{dailySummary.marginPercentage}%</strong>
            </div>
            <div style={styles.dailyItem}>
              <span>Invoices</span>
              <strong>{dailySummary.invoiceCount}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Widgets: Top Sellers & Low Stock */}
      <div style={styles.widgetGrid}>
        {/* Top Sellers */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={18} color="#f97316" /> Top Selling Items
          </h3>
          <div style={styles.widgetList}>
            {dashboard?.topSellers?.map((item) => (
              <div key={item.productId} style={styles.widgetRow}>
                <span>{item.productName}</span>
                <span className="badge badge-info">{item.totalQtySold} units sold</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Warnings */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} color="#f43f5e" /> Low Stock Alerts
          </h3>
          <div style={styles.widgetList}>
            {dashboard?.lowStock?.map((p) => (
              <div key={p.id} style={styles.widgetRow}>
                <div>
                  <div style={{ fontWeight: '700' }}>{p.nameEn}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.category}</div>
                </div>
                <span className="badge badge-danger">
                  {p.totalStock} units remaining
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.25rem',
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  kpiMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: '#536168',
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1f2a2e',
  },
  kpiSub: {
    fontSize: '0.78rem',
    color: '#64748b',
  },
  section: {
    padding: '1.25rem',
    borderRadius: '18px',
  },
  dailyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
    background: '#f6f6f2',
    padding: '1rem',
    borderRadius: '12px',
  },
  dailyItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    fontSize: '0.85rem',
  },
  widgetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.25rem',
  },
  widgetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  widgetRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 0.8rem',
    background: '#f8f8f5',
    borderRadius: '8px',
    fontSize: '0.88rem',
  },
};
