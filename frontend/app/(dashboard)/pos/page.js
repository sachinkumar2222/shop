'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api.js';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  ShoppingBag,
  Sparkles,
  CreditCard,
  QrCode,
  Banknote,
  BookOpen,
} from 'lucide-react';
import QRCode from '../../../components/QRCode.js';

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  
  // Checkout Form
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [upiId, setUpiId] = useState('7877496745@axl');
  const [cashGiven, setCashGiven] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedInvoice, setCompletedInvoice] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await apiFetch('/products');
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiFetch('/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Add item to cart
  const addToCart = (product) => {
    if (product.totalAvailableStock <= 0) {
      alert('This product is out of stock!');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.qty + 1 > product.totalAvailableStock) {
          alert(`Only ${product.totalAvailableStock} items available in stock!`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      // Default sale price from latest batch or selling price
      const defaultPrice = product.batches?.[0]?.sellingPrice || 100;
      return [
        ...prev,
        {
          productId: product.id,
          nameEn: product.nameEn,
          nameHi: product.nameHi,
          salePrice: Number(defaultPrice),
          qty: 1,
          maxStock: product.totalAvailableStock,
        },
      ];
    });
  };

  // Adjust cart qty
  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.qty + delta;
            if (newQty > item.maxStock) {
              alert(`Max available stock is ${item.maxStock}`);
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.salePrice * item.qty, 0);

  // Handle POS Checkout
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Cart is empty!');

    setError('');
    setLoading(true);

    try {
      const payload = {
        customerName: customerName.trim() || 'Guest Customer',
        phone: phone.trim() || '9829012345',
        paymentMode,
        items: cart.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          salePrice: item.salePrice,
        })),
      };

      console.log('[POS] Sending checkout payload:', payload);

      const res = await apiFetch('/pos/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log('[POS] Checkout response:', res);

      if (!res.invoiceNo) {
        throw new Error('Invalid response from server — no invoice number received');
      }

      const invoiceData = {
        invoiceNo: res.invoiceNo,
        total: res.total ?? subtotal,
        profit: res.profit ?? 0,
        waStatus: res.waStatus ?? 'N/A',
        items: [...cart],
        customerName: payload.customerName,
        phone: payload.phone,
        paymentMode,
      };

      // Clear cart FIRST, then show success modal
      setCart([]);
      setCustomerName('');
      setPhone('');
      setCashGiven('');
      fetchProducts(); // Refresh stock

      setCompletedInvoice(invoiceData);
    } catch (err) {
      console.error('[POS] Checkout error:', err);
      setError(err.message || 'Checkout failed. Check browser console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.nameHi?.includes(search) ||
      p.barcode?.includes(search);
    const matchesCategory =
      selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={styles.posContainer}>
      {/* Left: Product Selector */}
      <div style={styles.leftPanel}>
        {/* Search Header */}
        <div style={styles.searchBox} className="glass-panel">
          <div style={styles.searchInputWrapper}>
            <Search size={20} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search product name or scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
              autoFocus
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={styles.categoryPills}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`btn btn-sm ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`btn btn-sm ${selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {c.nameEn} ({c.nameHi})
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div style={styles.productGrid}>
          {filteredProducts.map((product) => {
            const isOutOfStock = product.totalAvailableStock <= 0;
            const isLowStock = product.totalAvailableStock <= product.minAlertQty;

            return (
              <div
                key={product.id}
                style={{
                  ...styles.productCard,
                  ...(isOutOfStock ? styles.outOfStockCard : {}),
                }}
                className="card animate-fade-in"
                onClick={() => !isOutOfStock && addToCart(product)}
              >
                <div style={styles.productMeta}>
                  <span className={`badge ${isOutOfStock ? 'badge-danger' : isLowStock ? 'badge-warning' : 'badge-success'}`}>
                    {isOutOfStock ? 'Out of Stock' : `${product.totalAvailableStock} left`}
                  </span>
                  <span style={styles.unitBadge}>{product.unit}</span>
                </div>

                <h3 style={styles.productTitle}>{product.nameEn}</h3>
                <div style={styles.hindiName}>{product.nameHi}</div>

                <div style={styles.productFooter}>
                  <div style={styles.priceTag}>
                    ₹{product.batches?.[0]?.sellingPrice || '0.00'}
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={isOutOfStock}
                    style={{ padding: '0.3rem 0.6rem' }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Shopping Cart & Checkout */}
      <div style={styles.rightPanel} className="glass-panel">
        <div style={styles.cartHeader}>
          <ShoppingBag size={20} color="#f97316" />
          <h2 style={styles.cartTitle}>Current Order</h2>
          <span className="badge badge-info">{cart.length} items</span>
        </div>

        {/* Cart Item List */}
        <div style={styles.cartList}>
          {cart.length === 0 ? (
            <div style={styles.emptyCart}>
              <Sparkles size={36} color="#64748b" />
              <p>Scan barcode or click items to add to cart</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} style={styles.cartItem}>
                <div>
                  <div style={styles.cartItemName}>{item.nameEn}</div>
                  <div style={styles.cartItemHindi}>{item.nameHi}</div>
                  <div style={styles.cartItemPrice}>₹{item.salePrice} / unit</div>
                </div>

                <div style={styles.qtyControls}>
                  <button
                    onClick={() => updateQty(item.productId, -1)}
                    style={styles.qtyBtn}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={styles.qtyValue}>{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.productId, 1)}
                    style={styles.qtyBtn}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={14} color="#f43f5e" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Form */}
        <form onSubmit={handleCheckout} style={styles.checkoutSection}>
          {error && (
            <div style={styles.errorBox}>
              <span>⚠️ {error}</span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}>✕</button>
            </div>
          )}

          <div className="input-group" style={{ marginBottom: '0.6rem' }}>
            <label>Customer Name</label>
            <input
              type="text"
              className="input-control"
              placeholder="Ramesh Sharma (or Guest)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '0.6rem' }}>
            <label>Phone Number (WhatsApp Receipt)</label>
            <input
              type="text"
              className="input-control"
              placeholder="9829012345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Payment Mode Selector */}
          <div className="input-group" style={{ marginBottom: '0.8rem' }}>
            <label>Payment Method</label>
            <div style={styles.paymentGrid}>
              {[
                { id: 'UPI', label: 'UPI QR', icon: QrCode },
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'KHATA', label: 'Khata', icon: BookOpen },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    style={{
                      ...styles.paymentBtn,
                      ...(isSelected ? styles.paymentBtnActive : {}),
                    }}
                    onClick={() => setPaymentMode(mode.id)}
                  >
                    <Icon size={16} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* UPI Dynamic QR Code Box with 1-TAP confirm */}
          {paymentMode === 'UPI' && subtotal > 0 && (
            <div style={styles.upiBox} className="animate-fade-in">
              {/* Header */}
              <div style={styles.upiMetaHeader}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Scan &amp; Pay via UPI</span>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                  {upiId}
                </span>
              </div>

              {/* QR Code */}
              <div style={{ margin: '0.6rem 0', display: 'flex', justifyContent: 'center' }}>
                <QRCode
                  value={`upi://pay?pa=${upiId}&pn=Shree%20Pooja%20Ghr&am=${subtotal.toFixed(2)}&cu=INR&tn=Bill%20Shree%20Pooja%20Ghr`}
                  size={150}
                />
              </div>

              {/* Amount display */}
              <div style={styles.upiAmountRow}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Amount to collect:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f97316' }}>₹{subtotal.toFixed(2)}</span>
              </div>

              <div style={styles.upiAppsHint}>
                <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
              </div>

              {/* Divider */}
              <div style={styles.upiDivider}>
                <span style={styles.upiDividerText}>Customer ne pay kiya? Tap karo 👇</span>
              </div>

              {/* ✅ ONE-TAP Complete Button */}
              <button
                type="submit"
                style={{
                  ...styles.upiConfirmBtn,
                  ...(loading ? styles.upiConfirmBtnLoading : {}),
                }}
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span style={styles.spinner}></span>
                    Processing...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.2rem' }}>✅</span>
                    UPI Payment Received — Complete Sale
                  </span>
                )}
              </button>
            </div>
          )}


          {/* Cash Received Calculator */}
          {paymentMode === 'CASH' && (
            <div style={styles.cashBox} className="animate-fade-in">
              <div className="input-group" style={{ marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem' }}>Cash Received (₹)</label>
                <input
                  type="number"
                  className="input-control"
                  placeholder="e.g. 500"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                />
              </div>

              {cashGiven && parseFloat(cashGiven) >= subtotal && (
                <div style={styles.changeReturnRow}>
                  <span>Change to Return:</span>
                  <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                    ₹{(parseFloat(cashGiven) - subtotal).toFixed(2)}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* Khata Ledger Notice */}
          {paymentMode === 'KHATA' && (
            <div style={styles.khataNotice} className="animate-fade-in">
              📖 Invoice will be marked as Due / Khata balance under customer account.
            </div>
          )}

          {/* Total Summary */}
          <div style={styles.totalRow}>
            <span>Grand Total</span>
            <span style={styles.totalAmount}>₹{subtotal.toFixed(2)}</span>
          </div>

          {/* Bottom Complete Sale — hidden for UPI (UPI has its own button inside QR card) */}
          {paymentMode !== 'UPI' && (
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem' }}
              disabled={cart.length === 0 || loading}
            >
              {loading ? 'Processing Checkout...' : `Complete Sale (₹${subtotal.toFixed(2)})`}
            </button>
          )}

          {/* UPI with empty cart notice */}
          {paymentMode === 'UPI' && cart.length > 0 && subtotal === 0 && (
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem' }}
              disabled={loading}
            >
              Complete Sale
            </button>
          )}
        </form>
      </div>

      {/* Completed Invoice Modal / Printable Receipt */}
      {completedInvoice && (
        <div style={styles.modalOverlay}>
          <div style={styles.receiptModal} className="glass-panel animate-fade-in">
            <div style={styles.receiptHeader}>
              <CheckCircle2 size={48} color="#10b981" />
              <h2 style={{ marginTop: '0.5rem' }}>Sale Successful!</h2>
              <span className="badge badge-success">
                Invoice: {completedInvoice.invoiceNo}
              </span>
            </div>

            <div style={styles.receiptBody}>
              <div style={styles.receiptRow}>
                <span>Customer:</span>
                <strong>{completedInvoice.customerName}</strong>
              </div>
              <div style={styles.receiptRow}>
                <span>Total Amount:</span>
                <strong>₹{completedInvoice.total.toFixed(2)}</strong>
              </div>
              <div style={styles.receiptRow}>
                <span>Profit Locked:</span>
                <strong style={{ color: '#10b981' }}>₹{completedInvoice.profit.toFixed(2)}</strong>
              </div>
              <div style={styles.receiptRow}>
                <span>WhatsApp Receipt:</span>
                <span className="badge badge-info">{completedInvoice.waStatus}</span>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => window.print()}
                className="btn btn-secondary"
              >
                <Printer size={16} /> Print Bill
              </button>
              <button
                onClick={() => setCompletedInvoice(null)}
                className="btn btn-primary"
              >
                Next Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  posContainer: {
    display: 'flex',
    gap: '1.5rem',
    height: 'calc(100vh - 3rem)',
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
  },
  searchBox: {
    padding: '0.75rem 1rem',
    borderRadius: '16px',
  },
  searchInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  categoryPills: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
  },
  productCard: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  outOfStockCard: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  productMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  unitBadge: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  productTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#f8fafc',
  },
  hindiName: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    marginBottom: '0.8rem',
  },
  productFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTag: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#f97316',
  },
  rightPanel: {
    width: '380px',
    borderRadius: '20px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  cartTitle: {
    fontSize: '1.1rem',
    flex: 1,
  },
  cartList: {
    flex: 1,
    overflowY: 'auto',
    margin: '1rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  emptyCart: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b',
    fontSize: '0.85rem',
  },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255, 255, 255, 0.03)',
    padding: '0.75rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  cartItemName: {
    fontSize: '0.88rem',
    fontWeight: '700',
  },
  cartItemHindi: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  cartItemPrice: {
    fontSize: '0.8rem',
    color: '#f97316',
    fontWeight: '600',
  },
  qtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  qtyBtn: {
    background: '#334155',
    border: 'none',
    color: '#fff',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: '0.9rem',
    fontWeight: '700',
    width: '20px',
    textAlign: 'center',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    marginLeft: '0.3rem',
  },
  checkoutSection: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '1rem',
  },
  paymentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
  },
  paymentBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.5rem',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'var(--bg-card)',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.82rem',
  },
  paymentBtnActive: {
    background: 'rgba(249, 115, 22, 0.15)',
    border: '1px solid #f97316',
    color: '#f97316',
    fontWeight: '700',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '1rem 0',
    fontSize: '1.05rem',
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: '1.4rem',
    color: '#f97316',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  receiptModal: {
    width: '360px',
    borderRadius: '20px',
    padding: '2rem 1.5rem',
    textAlign: 'center',
  },
  receiptHeader: {
    marginBottom: '1.5rem',
  },
  receiptBody: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    padding: '1rem',
    margin: '1rem 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    fontSize: '0.9rem',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  errorBox: {
    background: 'rgba(244, 63, 94, 0.2)',
    color: '#f43f5e',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '0.75rem',
    border: '1px solid rgba(244, 63, 94, 0.4)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: '600',
  },
  upiBox: {
    background: 'rgba(249, 115, 22, 0.08)',
    border: '1px solid rgba(249, 115, 22, 0.25)',
    borderRadius: '12px',
    padding: '0.75rem',
    margin: '0.6rem 0',
  },
  upiMetaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upiAppsHint: {
    textAlign: 'center',
    fontSize: '0.72rem',
    color: '#94a3b8',
    marginTop: '0.4rem',
  },
  cashBox: {
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: '12px',
    padding: '0.75rem',
    margin: '0.6rem 0',
  },
  changeReturnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.88rem',
    marginTop: '0.4rem',
  },
  khataNotice: {
    background: 'rgba(99, 102, 241, 0.12)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    borderRadius: '10px',
    padding: '0.6rem',
    margin: '0.6rem 0',
    fontSize: '0.78rem',
    color: '#a5b4fc',
    textAlign: 'center',
  },
  upiAmountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.3rem 0',
    marginBottom: '0.2rem',
  },
  upiDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    margin: '0.7rem 0 0.5rem',
    textAlign: 'center',
  },
  upiDividerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },
  upiConfirmBtn: {
    width: '100%',
    padding: '0.9rem 1rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '800',
    cursor: 'pointer',
    letterSpacing: '0.02em',
    boxShadow: '0 0 20px rgba(16, 185, 129, 0.4), 0 4px 15px rgba(16, 185, 129, 0.3)',
    animation: 'upiPulse 2s ease-in-out infinite',
    transition: 'all 0.2s ease',
  },
  upiConfirmBtnLoading: {
    background: 'linear-gradient(135deg, #374151, #1f2937)',
    boxShadow: 'none',
    animation: 'none',
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  },
};

