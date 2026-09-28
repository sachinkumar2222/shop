'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api.js';
import { Package, Plus, AlertTriangle, Layers, Tag, DollarSign, Search } from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // New Product Form
  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('pack');
  const [barcode, setBarcode] = useState('');
  const [minAlertQty, setMinAlertQty] = useState(5);

  // New Batch Form
  const [purchaseCost, setPurchaseCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [initialStock, setInitialStock] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      if (res.data?.length > 0) setCategoryId(res.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  // Add New Product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          nameEn,
          nameHi,
          categoryId,
          unit,
          barcode: barcode.trim() || undefined,
          minAlertQty: parseInt(minAlertQty) || 5,
        }),
      });

      setShowProductModal(false);
      resetProductForm();
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  // Add Batch Stock
  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setError('');
    setLoading(true);

    try {
      await apiFetch('/batches', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          purchaseCost: parseFloat(purchaseCost),
          sellingPrice: parseFloat(sellingPrice),
          initialStock: parseInt(initialStock),
        }),
      });

      setShowBatchModal(false);
      resetBatchForm();
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to add batch stock');
    } finally {
      setLoading(false);
    }
  };

  const resetProductForm = () => {
    setNameEn('');
    setNameHi('');
    setBarcode('');
    setMinAlertQty(5);
  };

  const resetBatchForm = () => {
    setPurchaseCost('');
    setSellingPrice('');
    setInitialStock('');
    setSelectedProduct(null);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.nameHi?.includes(search) ||
      p.barcode?.includes(search)
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Inventory Management</h1>
          <p style={styles.subtitle}>Track batch stocks, prices, and low-stock alerts</p>
        </div>
        <button
          onClick={() => setShowProductModal(true)}
          className="btn btn-primary"
        >
          <Plus size={18} /> Add New Product
        </button>
      </div>

      {/* Controls */}
      <div style={styles.controls} className="glass-panel">
        <div style={styles.searchWrapper}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Filter by product name, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Product Table */}
      <div style={styles.tableContainer} className="glass-panel">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Barcode</th>
              <th>Total Available Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const isOutOfStock = p.totalAvailableStock <= 0;
              const isLowStock = p.totalAvailableStock <= p.minAlertQty;

              return (
                <tr key={p.id}>
                  <td>
                    <div style={styles.prodName}>{p.nameEn}</div>
                    <div style={styles.prodHindi}>{p.nameHi}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{p.category?.nameEn}</span>
                  </td>
                  <td>
                    <code style={styles.code}>{p.barcode || 'N/A'}</code>
                  </td>
                  <td>
                    <strong style={{ fontSize: '1.05rem' }}>{p.totalAvailableStock}</strong>{' '}
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.unit}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        isOutOfStock
                          ? 'badge-danger'
                          : isLowStock
                          ? 'badge-warning'
                          : 'badge-success'
                      }`}
                    >
                      {isOutOfStock
                        ? 'Out of Stock'
                        : isLowStock
                        ? 'Low Stock Warning'
                        : 'In Stock'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedProduct(p);
                        const lastBatch = p.batches?.[0];
                        if (lastBatch) {
                          setPurchaseCost(lastBatch.purchaseCost?.toString() || '');
                          setSellingPrice(lastBatch.sellingPrice?.toString() || '');
                        } else {
                          setPurchaseCost('');
                          setSellingPrice('');
                        }
                        setInitialStock('');
                        setError('');
                        setShowBatchModal(true);
                      }}
                      className="btn btn-sm btn-secondary"
                    >
                      <Plus size={14} /> Add Stock Batch
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showProductModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} className="glass-panel animate-fade-in">
            <h2>Add New Product</h2>
            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleAddProduct} style={styles.modalForm}>
              <div className="input-group">
                <label>English Name</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. Premium Camphor (Kapoor)"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Hindi Name</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. प्रीमियम कपूर"
                  value={nameHi}
                  onChange={(e) => setNameHi(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Category</label>
                <select
                  className="input-control"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn} ({c.nameHi})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Unit (pack/pcs/kg)</label>
                  <input
                    type="text"
                    className="input-control"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Min Alert Qty</label>
                  <input
                    type="number"
                    className="input-control"
                    value={minAlertQty}
                    onChange={(e) => setMinAlertQty(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Barcode (Optional)</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Scan or type barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Batch Modal */}
      {showBatchModal && selectedProduct && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} className="glass-panel animate-fade-in">
            <h2>Add Batch Stock</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Product: <strong>{selectedProduct.nameEn}</strong> (Current Stock: <strong style={{ color: '#f97316' }}>{selectedProduct.totalAvailableStock}</strong> units)
            </p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleAddBatch} style={styles.modalForm}>
              <div className="input-group">
                <label>Stock Quantity (Units)</label>
                <input
                  type="number"
                  className="input-control"
                  placeholder="e.g. 50"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Purchase Cost / Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-control"
                    placeholder="e.g. 80.00"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Selling Price / Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-control"
                    placeholder="e.g. 120.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Adding Stock...' : 'Save Stock Batch'}
                </button>
              </div>
            </form>
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
  controls: {
    padding: '0.75rem 1rem',
    borderRadius: '16px',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    outline: 'none',
    fontSize: '0.95rem',
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
  prodName: {
    fontWeight: '700',
    color: '#f8fafc',
  },
  prodHindi: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
  code: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    color: '#eab308',
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
    width: '440px',
    borderRadius: '20px',
    padding: '2rem',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    marginTop: '1rem',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.25rem',
  },
  errorBox: {
    background: 'rgba(244, 63, 94, 0.15)',
    color: '#f43f5e',
    padding: '0.5rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
  },
};
