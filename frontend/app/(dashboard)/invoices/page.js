'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api.js';
import { FileText, Eye, Printer, MessageSquare, CheckCircle, Clock } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await apiFetch('/invoices');
      setInvoices(res.data?.invoices || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (invoiceNo) => {
    try {
      const res = await apiFetch(`/invoices/${invoiceNo}`);
      setSelectedInvoice(res.data);
    } catch (err) {
      alert(err.message || 'Failed to fetch invoice details');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sales Invoices</h1>
          <p style={styles.subtitle}>Historical transactions, locked profits & WhatsApp status</p>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableContainer} className="glass-panel">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Customer</th>
              <th>Date & Time</th>
              <th>Payment Mode</th>
              <th>Total Amount</th>
              <th>Profit Locked</th>
              <th>WhatsApp Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <code style={styles.code}>{inv.invoiceNo}</code>
                </td>
                <td>
                  <div style={{ fontWeight: '700' }}>{inv.customerName || 'Guest'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{inv.customerPhone}</div>
                </td>
                <td>
                  {new Date(inv.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </td>
                <td>
                  <span className="badge badge-info">{inv.paymentMode}</span>
                </td>
                <td>
                  <strong style={{ fontSize: '1.05rem', color: '#f97316' }}>
                    ₹{Number(inv.totalAmount).toFixed(2)}
                  </strong>
                </td>
                <td>
                  <strong style={{ color: '#10b981' }}>
                    ₹{Number(inv.totalProfit).toFixed(2)}
                  </strong>
                </td>
                <td>
                  <span
                    className={`badge ${
                      inv.waStatus === 'SENT'
                        ? 'badge-success'
                        : inv.waStatus === 'QUEUED'
                        ? 'badge-warning'
                        : 'badge-danger'
                    }`}
                  >
                    {inv.waStatus}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => viewDetails(inv.invoiceNo)}
                    className="btn btn-sm btn-secondary"
                  >
                    <Eye size={14} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} className="glass-panel animate-fade-in">
            <div style={styles.modalHeader}>
              <h2>Invoice {selectedInvoice.invoiceNo}</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.metaBox}>
              <div>Customer: <strong>{selectedInvoice.customerName}</strong></div>
              <div>Phone: <strong>{selectedInvoice.customerPhone}</strong></div>
              <div>Payment: <strong>{selectedInvoice.paymentMode}</strong></div>
            </div>

            <h4>Items Purchased</h4>
            <div style={styles.itemList}>
              {selectedInvoice.items?.map((item) => (
                <div key={item.id} style={styles.itemRow}>
                  <div>
                    <div style={{ fontWeight: '700' }}>{item.productName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Unit Cost: ₹{Number(item.unitCost).toFixed(2)} | Sale: ₹{Number(item.unitSalePrice).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    x{item.quantity} = <strong>₹{(Number(item.unitSalePrice) * item.quantity).toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.summaryBox}>
              <div style={styles.sumRow}>
                <span>Total Amount:</span>
                <span style={{ fontSize: '1.2rem', color: '#f97316', fontWeight: '800' }}>
                  ₹{Number(selectedInvoice.totalAmount).toFixed(2)}
                </span>
              </div>
              <div style={styles.sumRow}>
                <span>Profit Earned:</span>
                <span style={{ color: '#10b981', fontWeight: '800' }}>
                  ₹{Number(selectedInvoice.totalProfit).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => window.print()} className="btn btn-secondary">
                <Printer size={16} /> Print
              </button>
              <button onClick={() => setSelectedInvoice(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
  code: {
    background: 'rgba(249, 115, 22, 0.15)',
    color: '#f97316',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontWeight: '700',
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
    width: '460px',
    borderRadius: '20px',
    padding: '2rem',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  metaBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    fontSize: '0.85rem',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    margin: '0.8rem 0',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '0.6rem 0.8rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
  },
  summaryBox: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '0.8rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  sumRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.25rem',
  },
};
