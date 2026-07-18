import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue, remove, update, set, get } from 'firebase/database';
import { uploadImageToCloudinary } from '../cloudinary';
import { CATEGORY_OPTIONS } from '../data/categories';

// ─────────────────────────────────────────────────────────────
// Admin Dashboard — matches reference UI design
// Auth: ProtectedAdminRoute + localStorage (sri_admin_session)
// Customer auth is completely separate and untouched.
// ─────────────────────────────────────────────────────────────

const OFFER_CATEGORIES = ['Announcement', 'Discount', 'Seasonal', 'Festival'];

const ORDER_STATUSES = ['Processing', 'Designing', 'Printing', 'Shipped', 'Delivered'];

const STATUS_STYLES = {
  Processing: { background: '#fff8e1', color: '#f57c00' },
  Designing: { background: '#e3f2fd', color: '#1565c0' },
  Printing: { background: '#f3e5f5', color: '#7b1fa2' },
  Shipped: { background: '#e8f5e9', color: '#2e7d32' },
  Delivered: { background: '#c8e6c9', color: '#1b5e20' },
};

const ORDERS_PER_PAGE = 10;

// ── Inject responsive CSS once ───────────────────────────────
if (!document.getElementById('admin-dash-style')) {
  const s = document.createElement('style');
  s.id = 'admin-dash-style';
  s.textContent = `
    .admin-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 768px) { .admin-two-col { grid-template-columns: 1fr; } }
    .admin-table-row:hover { background: #fafafa; }
    .admin-input:focus { border-color: #111; outline: none; }
    .admin-btn-full:hover:not(:disabled) { opacity: 0.88; }
    .admin-btn-secondary:hover { border-color: #888; }
    .admin-filter-btn:hover { border-color: #888; }
  `;
  document.head.appendChild(s);
}

// ── Main Component ────────────────────────────────────────────
const Admin = () => {
  const navigate = useNavigate();

  // Read admin session (set by AdminLogin.jsx)
  let adminSession = null;
  try {
    const raw = localStorage.getItem('sri_admin_session');
    if (raw) adminSession = JSON.parse(raw);
  } catch {
    localStorage.removeItem('sri_admin_session');
  }

  // ── Products ──────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PER_PAGE = 10;
  const productTotalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = products.slice(
    (productPage - 1) * PRODUCTS_PER_PAGE,
    productPage * PRODUCTS_PER_PAGE,
  );
  const [editingProductId, setEditingProductId] = useState(null);
  const [newProduct, setNewProduct] = useState({ title: '', price: '', category: '', description: '', inStock: 1 });
  const [productImageFile, setProductImageFile] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [productMsg, setProductMsg] = useState('');


  // ── Orders ────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [orderForm, setOrderForm] = useState({ orderId: '', status: 'Processing', message: '' });
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [orderMsg, setOrderMsg] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');

  // ── Offers ────────────────────────────────────────────────
  const [offers, setOffers] = useState([]);
  const [newOffer, setNewOffer] = useState({
    title: '', message: '', date: '', discount: '', category: 'Announcement',
  });
  const [offerImageFile, setOfferImageFile] = useState(null);
  const [addingOffer, setAddingOffer] = useState(false);
  const [offerMsg, setOfferMsg] = useState('');

  // ── Add Admin Modal ───────────────────────────────────────
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminModalMsg, setAdminModalMsg] = useState('');

  // ── Initial data load ─────────────────────────────────────
  useEffect(() => {
    fetchProducts();
    fetchOffers();

    // Real-time orders listener from Firebase RTDB
    const ordersRef = ref(db, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setOrders(list);
      } else {
        setOrders([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Admin Logout ──────────────────────────────────────────
  const handleAdminLogout = () => {
    localStorage.removeItem('sri_admin_session');
    navigate('/admin-login', { replace: true });
  };

  // ── Products Handlers ─────────────────────────────────────
  const fetchProducts = async () => {
    try {
      const snapshot = await get(ref(db, 'products'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data).map(p => ({
          ...p,
          id: p.id || p.title,
        })).sort((a, b) => String(b.id).localeCompare(String(a.id)));
        setProducts(list);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to fetch products from Firebase RTDB:", err);
    }
  };

  const handleProductRowClick = (product) => {
    setEditingProductId(product.id);
    setNewProduct({
      title: product.title || '',
      price: product.price || '',
      category: product.category || '',
      description: product.description || '',
      inStock: product.inStock ?? 1,
    });
    document.getElementById('add-product-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelProductEdit = () => {
    setEditingProductId(null);
    setNewProduct({ title: '', price: '', category: '', description: '', inStock: 1 });
    setProductImageFile(null);
    setProductMsg('');
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAddingProduct(true);
    setProductMsg('');
    try {
      let imageUrl = '';

      // If editing, keep original image unless a new file was chosen
      if (editingProductId) {
        const original = products.find(p => p.id === editingProductId);
        if (original && !productImageFile) imageUrl = original.image || '';
      }

      if (productImageFile) {
        setProductMsg('⏳ Uploading image...');
        const uploaded = await uploadImageToCloudinary(productImageFile);
        if (!uploaded) {
          setProductMsg('❌ Image upload failed. Please check your internet connection or try a different image.');
          setAddingProduct(false);
          return;
        }
        imageUrl = uploaded;
      }

      const prodId = editingProductId || `product_${Date.now()}`;

      const productPayload = {
        id: prodId,
        title: newProduct.title,
        price: Number(newProduct.price),
        category: newProduct.category,
        description: newProduct.description,
        inStock: Number(newProduct.inStock),
        image: imageUrl,
      };

      await set(ref(db, `products/${prodId}`), productPayload);

      setProductMsg(editingProductId ? '✅ Product updated successfully!' : '✅ Product added successfully!');
      setEditingProductId(null);
      setNewProduct({ title: '', price: '', category: '', description: '', inStock: 1 });
      setProductImageFile(null);
      await fetchProducts();
    } catch (err) {
      setProductMsg('❌ Failed: ' + err.message);
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      // 1. Delete from Firebase RTDB (Primary)
      await remove(ref(db, `products/${id}`));

      fetchProducts();
    } catch (err) {
      alert('Failed to delete product: ' + err.message);
    }
  };



  // ── Orders Handlers ───────────────────────────────────────
  const handleOrderRowClick = (order) => {
    setOrderForm({
      orderId: order.id,
      status: order.status || 'Processing',
      message: order.message || '',
    });
    document.getElementById('update-order-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleUpdateOrderStatus = async (e) => {
    e.preventDefault();
    if (!orderForm.orderId) return;
    setUpdatingOrder(true);
    setOrderMsg('');
    try {
      await update(ref(db, `orders/${orderForm.orderId}`), {
        status: orderForm.status,
        message: orderForm.message,
        updatedAt: new Date().toISOString(),
      });
      setOrderMsg('✅ Order updated successfully!');
      setOrderForm({ orderId: '', status: 'Processing', message: '' });
    } catch {
      setOrderMsg('❌ Failed to update order.');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Delete this order?')) return;
    try {
      await remove(ref(db, `orders/${orderId}`));
    } catch {
      alert('Failed to delete order.');
    }
  };

  // Filtered + paginated orders
  const filteredOrders = statusFilter === 'All'
    ? orders
    : orders.filter(o => o.status === statusFilter);
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (orderPage - 1) * ORDERS_PER_PAGE,
    orderPage * ORDERS_PER_PAGE,
  );

  // ── Offers Handlers ───────────────────────────────────────
  const fetchOffers = async () => {
    try {
      const snapshot = await get(ref(db, 'offers'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        })).sort((a, b) => new Date(b.date || b.offerDate || 0) - new Date(a.date || a.offerDate || 0));
        setOffers(list);
      } else {
        setOffers([]);
      }
    } catch (err) {
      console.error("Failed to fetch offers from Firebase RTDB:", err);
    }
  };

  const handleAddOffer = async (e) => {
    e.preventDefault();
    setAddingOffer(true);
    setOfferMsg('');
    try {
      let imageUrl = '';
      if (offerImageFile) {
        setOfferMsg('⏳ Uploading image...');
        const uploaded = await uploadImageToCloudinary(offerImageFile);
        if (!uploaded) {
          setOfferMsg('❌ Image upload failed. Please check your internet connection or try a different image.');
          setAddingOffer(false);
          return;
        }
        imageUrl = uploaded;
      }

      const offerId = `offer_${Date.now()}`;

      const offerData = {
        title: newOffer.title,
        message: newOffer.message,
        offerDate: newOffer.date || new Date().toISOString().split('T')[0],
        discount: Number(newOffer.discount) || 0,
        category: newOffer.category,
        image: imageUrl || '',
      };

      // 1. Write offer to Firebase RTDB (Primary)
      await set(ref(db, `offers/${offerId}`), offerData);

      setNewOffer({ title: '', message: '', date: '', discount: '', category: 'Announcement' });
      setOfferImageFile(null);
      setOfferMsg('✅ Offer created successfully!');
      await fetchOffers();
    } catch (err) {
      setOfferMsg('❌ Failed: ' + err.message);
    } finally {
      setAddingOffer(false);
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm('Delete this offer?')) return;
    try {
      // 1. Delete from Firebase RTDB (Primary)
      await remove(ref(db, `offers/${id}`));

      await fetchOffers();
    } catch (err) {
      alert('Failed to delete offer: ' + err.message);
    }
  };

  // ── Add New Admin Handlers ────────────────────────────────
  const handleAddNewAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.username || !newAdmin.password) {
      setAdminModalMsg('Please fill in all fields.');
      return;
    }
    setAddingAdmin(true);
    setAdminModalMsg('');
    try {
      const adminsRef = ref(db, 'admins');
      const snapshot = await get(adminsRef);
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;

      const adminKey = `admin_${Date.now()}`;
      await set(ref(db, `admins/${adminKey}`), {
        id: count + 1,
        username: newAdmin.username.trim(),
        password: newAdmin.password,
      });
      setAdminModalMsg('✅ Admin added successfully!');
      setNewAdmin({ username: '', password: '' });
    } catch (err) {
      setAdminModalMsg('❌ Failed: ' + err.message);
    } finally {
      setAddingAdmin(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* ════════════ ADMIN HEADER ════════════ */}
      <header style={S.header}>
        <h1 style={S.headerTitle}>SRI GIFTS Admin</h1>
        <div style={S.headerActions}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn-secondary"
            style={S.btnSecondary}
          >
            View Site
          </a>
          <button
            onClick={() => { setShowAdminModal(true); setAdminModalMsg(''); }}
            style={S.btnPrimary}
          >
            Add New Admin
          </button>
          <button
            onClick={handleAdminLogout}
            className="admin-btn-secondary"
            style={S.btnSecondary}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ════════════ MAIN CONTENT ════════════ */}
      <div style={S.content}>

        {/* ── ROW 1: Add Product + Update Order ── */}
        <div className="admin-two-col">

          {/* ── Add/Edit Product Card ── */}
          <div style={S.card} id="add-product-card">
            <h2 style={S.cardTitle}>
              {editingProductId ? 'Edit Product' : 'Add New Product'}
            </h2>

            <form onSubmit={handleAddProduct} style={S.form}>
              <Field label="Product Title">
                <input
                  type="text"
                  required
                  value={newProduct.title}
                  onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
                  className="admin-input"
                  style={S.input}
                />
              </Field>

              <Field label="Category">
                <select
                  required
                  value={newProduct.category}
                  onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="admin-input"
                  style={S.input}
                >
                  <option value="">Select Category</option>
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Price (₹)">
                <input
                  type="number"
                  required
                  min="0"
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="admin-input"
                  style={S.input}
                />
              </Field>

              <Field label="Product Image">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setProductImageFile(e.target.files[0])}
                  style={S.fileInput}
                />
              </Field>

              <Field label="Description">
                <textarea
                  required
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="admin-input"
                  style={{ ...S.input, minHeight: '90px', resize: 'vertical' }}
                />
              </Field>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600', color: '#444' }}>
                <input
                  type="checkbox"
                  checked={newProduct.inStock === 1}
                  onChange={e => setNewProduct({ ...newProduct, inStock: e.target.checked ? 1 : 0 })}
                  style={{ width: '16px', height: '16px', accentColor: '#111' }}
                />
                In Stock
              </label>

              {productMsg && (
                <p style={{ fontSize: '0.85rem', color: productMsg.startsWith('✅') ? '#2e7d32' : '#c62828', margin: 0 }}>
                  {productMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={addingProduct} className="admin-btn-full" style={{ ...S.btnFull, flex: 1 }}>
                  {addingProduct ? 'Processing...' : (editingProductId ? 'Update Product' : 'Add Product')}
                </button>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={handleCancelProductEdit}
                    className="admin-btn-secondary"
                    style={{ ...S.btnSecondary, borderRadius: '30px' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ── Update Order Tracking Card ── */}
          <div style={S.card} id="update-order-card">
            <h2 style={S.cardTitle}>Update Order Tracking</h2>

            <form onSubmit={handleUpdateOrderStatus} style={S.form}>
              <Field label="Order ID (e.g. SG-123456)">
                <input
                  type="text"
                  required
                  value={orderForm.orderId}
                  onChange={e => setOrderForm({ ...orderForm, orderId: e.target.value })}
                  className="admin-input"
                  style={S.input}
                />
              </Field>

              <Field label="Shipping Status">
                <select
                  required
                  value={orderForm.status}
                  onChange={e => setOrderForm({ ...orderForm, status: e.target.value })}
                  className="admin-input"
                  style={S.input}
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Tracking Message details">
                <textarea
                  value={orderForm.message}
                  onChange={e => setOrderForm({ ...orderForm, message: e.target.value })}
                  placeholder="Your premium gift is currently being meticulously crafted and hand-packed by our artisans. An email will be sent once it is dispatched."
                  className="admin-input"
                  style={{ ...S.input, minHeight: '110px', resize: 'vertical' }}
                />
              </Field>

              {orderMsg && (
                <p style={{ fontSize: '0.85rem', color: orderMsg.startsWith('✅') ? '#2e7d32' : '#c62828', margin: 0 }}>
                  {orderMsg}
                </p>
              )}

              <button type="submit" disabled={updatingOrder} className="admin-btn-full" style={S.btnFull}>
                {updatingOrder ? 'Updating...' : 'Update Order Info'}
              </button>
            </form>
          </div>
        </div>

        {/* ── ROW 2: Product Management Table ── */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={S.cardTitle}>Product Management</h2>
              <p style={{ ...S.cardSubtitle, margin: 0 }}>View and manage all existing products. Click on any product to edit it.</p>
            </div>

          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  {['ID', 'Image', 'Title', 'Category', 'Price', 'Stock', 'Description', 'Action'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#e67e22', fontSize: '0.9rem' }}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map(p => (
                    <tr
                      key={p.id}
                      className="admin-table-row"
                      onClick={() => handleProductRowClick(p)}
                      style={{ cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                    >
                      <td style={S.td}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{p.id}</span>
                      </td>
                      <td style={S.td}>
                        <img
                          src={p.image || 'https://placehold.co/100x80?text=No+Image'}
                          alt={p.title}
                          style={{ width: '52px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{p.title}</td>
                      <td style={S.td}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#f0f0f0',
                          fontSize: '0.75rem',
                          color: '#333'
                        }}>
                          {p.category}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontWeight: 700 }}>₹{p.price}</td>
                      <td style={S.td}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: p.inStock === 1 ? '#e8f5e9' : '#ffebee',
                          color: p.inStock === 1 ? '#2e7d32' : '#c62828',
                        }}>
                          {p.inStock === 1 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td style={{ ...S.td, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>{p.description}</span>
                      </td>
                      <td style={S.td} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', padding: 0 }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Product Pagination controls */}
          {products.length > PRODUCTS_PER_PAGE && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={() => setProductPage(p => Math.max(1, p - 1))}
                disabled={productPage === 1}
                style={S.pageBtn}
              >Prev</button>
              <span style={{ ...S.pageBtn, background: '#111', color: '#fff', cursor: 'default', fontWeight: '700' }}>
                {productPage}
              </span>
              <button
                onClick={() => setProductPage(p => Math.min(productTotalPages, p + 1))}
                disabled={productPage >= productTotalPages}
                style={S.pageBtn}
              >Next</button>
            </div>
          )}
        </div>

        {/* ── ROW 3: All Customer Orders ── */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>All Customer Orders</h2>
          <p style={S.cardSubtitle}>Click on any order to populate the update form above.</p>

          {/* Status filter chips */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {['All', ...ORDER_STATUSES].map(s => (
              <button
                key={s}
                className="admin-filter-btn"
                onClick={() => { setStatusFilter(s); setOrderPage(1); }}
                style={{
                  ...S.filterBtn,
                  background: statusFilter === s ? '#111' : '#fff',
                  color: statusFilter === s ? '#fff' : '#333',
                  borderColor: statusFilter === s ? '#111' : '#ddd',
                }}
              >
                {s}&nbsp;<span style={{ opacity: 0.7 }}>
                  ({s === 'All' ? orders.length : orders.filter(o => o.status === s).length})
                </span>
              </button>
            ))}
          </div>

          {/* Pagination controls */}
          {filteredOrders.length > ORDERS_PER_PAGE && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginBottom: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                disabled={orderPage === 1}
                style={S.pageBtn}
              >Prev</button>
              <span style={{ ...S.pageBtn, background: '#111', color: '#fff', cursor: 'default', fontWeight: '700' }}>
                {orderPage}
              </span>
              <button
                onClick={() => setOrderPage(p => Math.min(totalPages, p + 1))}
                disabled={orderPage >= totalPages}
                style={S.pageBtn}
              >Next</button>
            </div>
          )}

          {/* Orders table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  {['Order ID', 'Customer', 'Mobile', 'Address', 'Items', 'Total', 'Payment UTR', 'Status', 'Action'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#e67e22', fontSize: '0.9rem' }}>
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(order => {
                    const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.Processing;
                    return (
                      <tr
                        key={order.id}
                        className="admin-table-row"
                        onClick={() => handleOrderRowClick(order)}
                        style={{ cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                      >
                        <td style={S.td}>
                          <span style={{ fontWeight: 700, fontSize: '0.78rem', wordBreak: 'break-all' }}>{order.id}</span>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontWeight: 600 }}>{order.customerName}</span>
                        </td>
                        <td style={S.td}>{order.customerPhone}</td>
                        <td style={S.td}>
                          <div style={{ fontSize: '0.8rem' }}>{order.customerAddress}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888' }}>{order.customerCity} {order.customerPincode}</div>
                        </td>
                        <td style={S.td}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{order.productTitle}</div>
                          <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '0.5rem' }}>Qty: {order.quantity}</span>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontWeight: 700 }}>₹{order.totalAmount}</span>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontSize: '0.78rem', color: '#0066cc', wordBreak: 'break-all' }}>
                            {order.paymentReference}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            ...statusStyle,
                          }}>
                            {order.status}
                          </span>
                        </td>
                        <td style={S.td} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', padding: 0 }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ROW 4: Offers Management ── */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Offers Management</h2>
          <p style={S.cardSubtitle}>Schedule offers and sales on specific days.</p>

          <form onSubmit={handleAddOffer} style={S.form}>
            <Field label="Offer Title">
              <input
                type="text"
                required
                placeholder="e.g. Diwali Sale"
                value={newOffer.title}
                onChange={e => setNewOffer({ ...newOffer, title: e.target.value })}
                className="admin-input"
                style={S.input}
              />
            </Field>

            <Field label="Offer Message">
              <textarea
                required
                placeholder="e.g. Get 20% off on all personalized gifts!"
                value={newOffer.message}
                onChange={e => setNewOffer({ ...newOffer, message: e.target.value })}
                className="admin-input"
                style={{ ...S.input, minHeight: '80px', resize: 'vertical' }}
              />
            </Field>

            <Field label="Offer Date">
              <input
                type="date"
                value={newOffer.date}
                onChange={e => setNewOffer({ ...newOffer, date: e.target.value })}
                className="admin-input"
                style={S.input}
              />
            </Field>

            <Field label="Discount Percentage (%)">
              <input
                type="number"
                placeholder="e.g. 20"
                min="0"
                max="100"
                value={newOffer.discount}
                onChange={e => setNewOffer({ ...newOffer, discount: e.target.value })}
                className="admin-input"
                style={S.input}
              />
            </Field>

            <Field label="Offer Banner Image (optional)">
              <input
                type="file"
                accept="image/*"
                onChange={e => setOfferImageFile(e.target.files[0])}
                style={S.fileInput}
              />
              <span style={{ fontSize: '0.75rem', color: '#888' }}>
                Upload a banner image to display in the offer slideshow on the storefront.
              </span>
            </Field>

            {offerMsg && (
              <p style={{ fontSize: '0.85rem', color: offerMsg.startsWith('✅') ? '#2e7d32' : '#c62828', margin: 0 }}>
                {offerMsg}
              </p>
            )}

            <button type="submit" disabled={addingOffer} className="admin-btn-full" style={S.btnFull}>
              {addingOffer ? 'Creating...' : 'Create Offer'}
            </button>
          </form>

          {/* Scheduled Offers Table */}
          <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1rem', fontWeight: '700', color: '#111' }}>
            Scheduled Offers
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  {['ID', 'Image', 'Title', 'Message', 'Category', 'Discount', 'Date', 'Action'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: '#e67e22', fontSize: '0.9rem' }}>
                      No offers scheduled.
                    </td>
                  </tr>
                ) : (
                  offers.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={S.td}>{o.id}</td>
                      <td style={S.td}>
                        {o.image
                          ? <img src={o.image} alt={o.title} style={{ width: '52px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                          : <span style={{ color: '#bbb', fontSize: '0.8rem' }}>—</span>
                        }
                      </td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{o.title}</td>
                      <td style={{ ...S.td, maxWidth: '200px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#555' }}>
                          {o.message?.length > 65 ? o.message.slice(0, 65) + '…' : o.message}
                        </span>
                      </td>
                      <td style={S.td}>{o.category}</td>
                      <td style={S.td}>{o.discount ? `${o.discount}%` : '—'}</td>
                      <td style={S.td}>{o.date || '—'}</td>
                      <td style={S.td}>
                        <button
                          onClick={() => handleDeleteOffer(o.id)}
                          style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', padding: 0 }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>{/* end content */}

      {/* ════════════ ADD NEW ADMIN MODAL ════════════ */}
      {showAdminModal && (
        <div
          style={S.modalOverlay}
          onClick={() => { setShowAdminModal(false); setNewAdmin({ username: '', password: '' }); setAdminModalMsg(''); }}
        >
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 1.25rem', color: '#111' }}>
              Add New Admin
            </h2>
            <form onSubmit={handleAddNewAdmin} style={S.form}>
              <Field label="Username">
                <input
                  type="text"
                  required
                  placeholder="e.g. manager_1"
                  value={newAdmin.username}
                  onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                  className="admin-input"
                  style={S.input}
                  autoFocus
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  required
                  placeholder="Enter a strong password"
                  value={newAdmin.password}
                  onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="admin-input"
                  style={S.input}
                />
              </Field>
              {adminModalMsg && (
                <p style={{ fontSize: '0.85rem', color: adminModalMsg.startsWith('✅') ? '#2e7d32' : '#c62828', margin: 0 }}>
                  {adminModalMsg}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" disabled={addingAdmin} className="admin-btn-full" style={{ ...S.btnFull, flex: 1 }}>
                  {addingAdmin ? 'Adding...' : 'Add Admin'}
                </button>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  style={{ ...S.btnSecondary, flex: 1, justifyContent: 'center' }}
                  onClick={() => { setShowAdminModal(false); setNewAdmin({ username: '', password: '' }); setAdminModalMsg(''); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// ── Reusable field wrapper ────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#444' }}>{label}</label>
    {children}
  </div>
);

// ── Styles ────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: '#f2f2f2',
    fontFamily: "'Outfit', sans-serif",
  },
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    padding: '0.9rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: '1.45rem',
    fontWeight: '800',
    color: '#111',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  headerActions: {
    display: 'flex',
    gap: '0.65rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    padding: '0.5rem 1.2rem',
    fontSize: '0.88rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  btnSecondary: {
    background: '#fff',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '24px',
    padding: '0.5rem 1.2rem',
    fontSize: '0.88rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  btnFull: {
    width: '100%',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '30px',
    padding: '0.82rem',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  content: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  card: {
    background: '#ffffff',
    borderRadius: '10px',
    padding: '1.75rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    border: '1px solid #e8e8e8',
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#111',
    margin: '0 0 1.25rem',
  },
  cardSubtitle: {
    fontSize: '0.83rem',
    color: '#e67e22',
    margin: '-0.75rem 0 1.25rem',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontFamily: "'Outfit', sans-serif",
    color: '#333',
    background: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  fileInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontFamily: "'Outfit', sans-serif",
    background: '#fafafa',
    boxSizing: 'border-box',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: '700',
    color: '#333',
    fontSize: '0.82rem',
    borderBottom: '2px solid #eee',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 12px',
    color: '#444',
    verticalAlign: 'middle',
    fontSize: '0.85rem',
  },
  filterBtn: {
    border: '1px solid #ddd',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    fontWeight: '500',
    transition: 'all 0.15s',
  },
  pageBtn: {
    border: '1px solid #ddd',
    background: '#fff',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modalCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
};

export default Admin;
