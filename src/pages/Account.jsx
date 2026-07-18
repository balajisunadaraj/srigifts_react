import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { db } from "../firebase";
import { ref, get, remove, set, update } from "firebase/database";
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// Account / Customer Profile Page
// Renders a premium sidebar-based layout matching the reference UI.
// ─────────────────────────────────────────────────────────────

const Account = () => {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Real-time or fetched DB data
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Addresses Form State
  const [newAddress, setNewAddress] = useState({ street: '', city: '', pincode: '', state: '' });
  const [addressMsg, setAddressMsg] = useState('');

  // Settings form State
  const [profileForm, setProfileForm] = useState({ name: '', mobile: '' });
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    if (!user) return;

    // Load form defaults
    setProfileForm({
      name: user.name || '',
      mobile: user.mobile || '',
    });

    const loadUserData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Wishlist
        const wishSnapshot = await get(ref(db, "wishlist/" + user.uid));
        if (wishSnapshot.exists()) {
          const list = Object.entries(wishSnapshot.val()).map(([id, value]) => ({
            id,
            ...value,
          }));
          setWishlist(list);
        } else {
          setWishlist([]);
        }

        // 2. Fetch Customer Orders
        const ordersSnapshot = await get(ref(db, "orders"));
        if (ordersSnapshot.exists()) {
          const allOrders = Object.entries(ordersSnapshot.val()).map(([id, value]) => ({
            id,
            ...value,
          }));
          // Filter orders matching this customer name, phone, or email
          const userPhone = String(user.mobile || '').trim();
          const userEmail = String(user.email || '').trim().toLowerCase();
          
          const filtered = allOrders.filter(o => {
            const matchPhone = userPhone && String(o.customerPhone || '').trim() === userPhone;
            const matchEmail = userEmail && String(o.customerEmail || '').trim().toLowerCase() === userEmail;
            return matchPhone || matchEmail;
          }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          setOrders(filtered);
        } else {
          setOrders([]);
        }

        // 3. Fetch Addresses
        const addrSnapshot = await get(ref(db, `users/${user.uid}/addresses`));
        if (addrSnapshot.exists()) {
          setAddresses(Object.values(addrSnapshot.val()));
        } else {
          setAddresses([]);
        }

        // 4. Mock/Load Notifications
        const systemNotif = [
          { id: 1, title: 'Welcome to Sri Gifts!', message: 'Explore our catalog for personalized gifts crafted with love.', date: new Date().toLocaleDateString() }
        ];
        setNotifications(systemNotif);

      } catch (err) {
        console.error("Failed to load customer profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Route redirection checks
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Action handlers
  const removeFromWishlist = async (id) => {
    try {
      await remove(ref(db, "wishlist/" + user.uid + "/" + id));
      setWishlist(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert("Failed to remove item: " + err.message);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.street || !newAddress.city || !newAddress.pincode) {
      setAddressMsg('Please fill in required fields.');
      return;
    }
    try {
      const addrId = `addr_${Date.now()}`;
      const addressPayload = {
        id: addrId,
        ...newAddress,
      };
      await set(ref(db, `users/${user.uid}/addresses/${addrId}`), addressPayload);
      setAddresses(prev => [...prev, addressPayload]);
      setNewAddress({ street: '', city: '', pincode: '', state: '' });
      setAddressMsg('✅ Address added successfully!');
    } catch (err) {
      setAddressMsg('❌ Failed to save: ' + err.message);
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await remove(ref(db, `users/${user.uid}/addresses/${id}`));
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert("Failed to delete address: " + err.message);
    }
  };

  const handleCancelOrder = async (orderId, orderObj) => {
    if (!user) return;
    const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmCancel) return;
    try {
      await update(ref(db, `orders/${orderId}`), { ...orderObj, status: 'Cancelled' });
      const notifId = `notif_${Date.now()}`;
      const notifPayload = {
        id: notifId,
        title: 'Order Cancelled',
        message: `Your order #${orderId} was cancelled by the admin.`,
        date: new Date().toLocaleDateString()
      };
      await set(ref(db, `notifications/${user.uid}/${notifId}`), notifPayload);
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: 'Cancelled' } : o)));
      setNotifications(prev => [...prev, notifPayload]);
    } catch (err) {
      alert('Failed to cancel order: ' + err.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSettingsMsg('');
    try {
      await update(ref(db, `users/${user.uid}`), {
        name: profileForm.name,
        mobile: profileForm.mobile,
      });
      // Update local context/storage data if your hook supports it
      const sriUser = localStorage.getItem('sri_user');
      if (sriUser) {
        const parsed = JSON.parse(sriUser);
        parsed.name = profileForm.name;
        parsed.mobile = profileForm.mobile;
        localStorage.setItem('sri_user', JSON.stringify(parsed));
      }
      setSettingsMsg('✅ Profile updated successfully! Please refresh or log in again to reflect changes fully.');
    } catch (err) {
      setSettingsMsg('❌ Failed: ' + err.message);
    }
  };

  const renderFallback = () => (
    <div style={{ padding: '2rem' }}>
      <h2 style={styles.tabTitle}>Page Not Found</h2>
      <p style={styles.emptyText}>The selected section is unavailable.</p>
    </div>
  );

  return (
    <div className="page-transition" style={styles.page}>
      
      {/* Welcome Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Welcome, {user.name}</h1>
      </div>

      <div style={styles.container}>
        {/* Left Sidebar Menu */}
        <aside style={styles.sidebar}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            style={{...styles.sidebarBtn, ...(activeTab === 'dashboard' ? styles.sidebarBtnActive : {})}}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('orders')} 
            style={{...styles.sidebarBtn, ...(activeTab === 'orders' ? styles.sidebarBtnActive : {})}}
          >
            Orders
          </button>
          <button 
            onClick={() => setActiveTab('addresses')} 
            style={{...styles.sidebarBtn, ...(activeTab === 'addresses' ? styles.sidebarBtnActive : {})}}
          >
            Addresses
          </button>
          <button 
            onClick={() => setActiveTab('notifications')} 
            style={{...styles.sidebarBtn, ...(activeTab === 'notifications' ? styles.sidebarBtnActive : {})}}
          >
            Notifications
          </button>
          <button 
            onClick={() => setActiveTab('wishlist')} 
            style={{...styles.sidebarBtn, ...(activeTab === 'wishlist' ? styles.sidebarBtnActive : {})}}
          >
            Wishlist
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            style={{...styles.sidebarBtn, ...(activeTab === 'settings' ? styles.sidebarBtnActive : {})}}
          >
            Settings
          </button>
          <button 
            onClick={logout} 
            style={{...styles.sidebarBtn, color: '#ff4757', fontWeight: '600'}}
          >
            Logout
          </button>
        </aside>

        {/* Right Tab Content Card */}
        <main style={styles.mainContent}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
              <p>Loading your profile details...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div>
                  <h2 style={styles.tabTitle}>Dashboard</h2>
                  
                  {/* Grid summary cards */}
                  <div style={styles.cardsRow}>
                    <div style={styles.summaryCard}>
                      <span style={styles.goldNumber}>{orders.length}</span>
                      <span style={styles.cardLabel}>Total Orders</span>
                    </div>
                    <div style={styles.summaryCard}>
                      <span style={styles.goldNumber}>{addresses.length}</span>
                      <span style={styles.cardLabel}>Saved Addresses</span>
                    </div>
                    <div style={styles.summaryCard}>
                      <span style={styles.goldNumber}>{notifications.length}</span>
                      <span style={styles.cardLabel}>Notifications</span>
                    </div>
                  </div>

                  {/* My Information Block */}
                  <h3 style={styles.sectionHeading}>My Information</h3>
                  <div style={styles.infoBlock}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Name:</span>
                      <span style={styles.infoValue}>{user.name}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Email:</span>
                      <span style={styles.infoValue}>{user.email}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Mobile:</span>
                      <span style={styles.infoValue}>{user.mobile || '—'}</span>
                    </div>
                  </div>

                  {/* Recent Orders Block */}
                  <h3 style={styles.sectionHeading}>Recent Orders</h3>
                  <div style={{ marginTop: '0.75rem' }}>
                    {orders.length === 0 ? (
                      <p style={styles.emptyText}>No recent orders.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {orders.slice(0, 3).map(o => (
                          <div key={o.id} style={styles.orderListItem}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700 }}>Order ID: {o.id}</span>
                              <span style={{
                                padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                                background: o.status === 'Delivered' ? '#e8f5e9' : '#fff8e1',
                                color: o.status === 'Delivered' ? '#2e7d32' : '#f57c00'
                              }}>
                                {o.status || 'Processing'}
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#666' }}>
                              {o.productTitle} × {o.quantity} — ₹{o.totalAmount}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h2 style={styles.tabTitle}>My Orders</h2>
                  {orders.length === 0 ? (
                    <p style={styles.emptyText}>You haven't placed any orders yet.</p>
                  ) : (
                    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ background: '#f8f8f8', borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem' }}>Order ID</th>
                            <th style={{ padding: '0.75rem' }}>Date</th>
                            <th style={{ padding: '0.75rem' }}>Item</th>
                            <th style={{ padding: '0.75rem' }}>UTR</th>
                            <th style={{ padding: '0.75rem' }}>Amount</th>
                            <th style={{ padding: '0.75rem' }}>Status</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => (
                            <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '0.75rem', fontWeight: 600 }}>{o.id}</td>
                              <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#666' }}>{new Date(o.createdAt || Date.now()).toLocaleDateString()}</td>
                              <td style={{ padding: '0.75rem' }}>{o.productTitle} <span style={{ color: '#888' }}>×{o.quantity}</span></td>
                              <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.paymentReference || '—'}</td>
                              <td style={{ padding: '0.75rem', fontWeight: 700 }}>₹{o.totalAmount}</td>
                              <td style={{ padding: '0.75rem' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                                  background: o.status === 'Delivered' ? '#e8f5e9' : '#fff8e1',
                                  color: o.status === 'Delivered' ? '#2e7d32' : '#f57c00'
                                }}>{o.status || 'Processing'}</span>
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                {o.status !== 'Shipped' && o.status !== 'Delivered' && (
                                  <button onClick={() => handleCancelOrder(o.id, o)}
                                    style={{ background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
                                    Cancel
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'addresses' && (
                <div>
                  <h2 style={styles.tabTitle}>Saved Addresses</h2>
                  {addresses.length === 0 ? (
                    <p style={styles.emptyText}>No saved addresses found.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                      {addresses.map(a => (
                        <div key={a.id} style={{ ...styles.detailCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontWeight: 600, margin: 0 }}>{a.street}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#666' }}>
                              {a.city}, {a.state} — {a.pincode}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDeleteAddress(a.id)}
                            style={{ background: 'none', border: 'none', color: '#ff4757', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <h3 style={styles.sectionHeading}>Add New Address</h3>
                  <form onSubmit={handleAddAddress} style={styles.form}>
                    <div style={styles.formRow}>
                      <input 
                        type="text" 
                        required 
                        placeholder="Street Address / Area" 
                        value={newAddress.street} 
                        onChange={e => setNewAddress({...newAddress, street: e.target.value})}
                        style={styles.input} 
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input 
                        type="text" 
                        required 
                        placeholder="City" 
                        value={newAddress.city} 
                        onChange={e => setNewAddress({...newAddress, city: e.target.value})}
                        style={{ ...styles.input, flex: 1 }} 
                      />
                      <input 
                        type="text" 
                        required 
                        placeholder="Pincode" 
                        value={newAddress.pincode} 
                        onChange={e => setNewAddress({...newAddress, pincode: e.target.value})}
                        style={{ ...styles.input, flex: 1 }} 
                      />
                    </div>
                    <div style={styles.formRow}>
                      <input 
                        type="text" 
                        placeholder="State" 
                        value={newAddress.state} 
                        onChange={e => setNewAddress({...newAddress, state: e.target.value})}
                        style={styles.input} 
                      />
                    </div>
                    {addressMsg && <p style={{ fontSize: '0.85rem', color: addressMsg.startsWith('✅') ? '#2e7d32' : '#c62828' }}>{addressMsg}</p>}
                    <button type="submit" style={styles.btnGold}>Add Address</button>
                  </form>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h2 style={styles.tabTitle}>Notifications</h2>
                  {notifications.length === 0 ? (
                    <p style={styles.emptyText}>No notifications.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {notifications.map(n => (
                        <div key={n.id} style={styles.detailCard}>
                          <h4 style={{ margin: 0, fontWeight: 700 }}>{n.title}</h4>
                          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#555' }}>{n.message}</p>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#999', marginTop: '6px' }}>{n.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div>
                  <h2 style={styles.tabTitle}>My Wishlist</h2>
                  {wishlist.length === 0 ? (
                    <p style={styles.emptyText}>Your wishlist is empty.</p>
                  ) : (
                    <div style={styles.wishlistGrid}>
                      {wishlist.map(item => (
                        <div key={item.id} style={styles.wishItemCard}>
                          <img 
                            src={item.productImage || 'https://via.placeholder.com/200'} 
                            alt={item.productTitle} 
                            style={styles.wishItemImg} 
                          />
                          <h4 style={styles.wishItemTitle}>{item.productTitle}</h4>
                          <p style={styles.wishItemPrice}>₹{item.productPrice}</p>
                          <button 
                            onClick={() => removeFromWishlist(item.id)}
                            style={styles.wishRemoveBtn}
                            aria-label="Remove item from wishlist"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 style={styles.tabTitle}>Settings</h2>
                  <form onSubmit={handleUpdateProfile} style={styles.form}>
                    <div style={styles.formRow}>
                      <label style={styles.fieldLabel}>Full Name</label>
                      <input 
                        type="text" 
                        required 
                        value={profileForm.name} 
                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                        style={styles.input} 
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.fieldLabel}>Mobile Number</label>
                      <input 
                        type="tel" 
                        required 
                        value={profileForm.mobile} 
                        onChange={e => setProfileForm({...profileForm, mobile: e.target.value})}
                        style={styles.input} 
                      />
                    </div>
                    {settingsMsg && <p style={{ fontSize: '0.85rem', color: settingsMsg.startsWith('✅') ? '#2e7d32' : '#c62828' }}>{settingsMsg}</p>}
                    <button type="submit" style={styles.btnGold}>Update Settings</button>
                  </form>
                </div>
              )}
              
              {activeTab !== 'dashboard' && 
               activeTab !== 'orders' && 
               activeTab !== 'addresses' && 
               activeTab !== 'notifications' && 
               activeTab !== 'wishlist' && 
               activeTab !== 'settings' && 
               renderFallback()}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

// ── Styles — Clean White Card Layout + Sidebar Menu ──────────
const styles = {
  page: {
    minHeight: '80vh',
    background: '#fafafa',
    padding: '3rem 5%',
    fontFamily: "'Outfit', sans-serif",
  },
  header: {
    maxWidth: '1100px',
    margin: '0 auto 2rem',
  },
  headerTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#111',
    margin: 0,
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    gap: '2rem',
    alignItems: 'flex-start',
  },
  // Responsive sidebar
  sidebar: {
    width: '240px',
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #eaeaea',
    padding: '0.75rem 0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    flexShrink: 0,
  },
  sidebarBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '0.85rem 1.5rem',
    background: 'none',
    border: 'none',
    borderLeft: '4px solid transparent',
    fontSize: '0.92rem',
    fontWeight: '500',
    color: '#555',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s',
  },
  sidebarBtnActive: {
    background: 'rgba(212, 175, 55, 0.08)',
    borderLeftColor: '#d4af37',
    color: '#111',
    fontWeight: '600',
  },
  // Tab Card content
  mainContent: {
    flex: 1,
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #eaeaea',
    padding: '2.25rem 2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    minHeight: '460px',
  },
  tabTitle: {
    fontSize: '1.45rem',
    fontWeight: '700',
    color: '#111',
    margin: '0 0 1.5rem',
  },
  sectionHeading: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#111',
    marginTop: '2rem',
    marginBottom: '0.75rem',
    borderBottom: '1px solid #f0f0f0',
    paddingBottom: '0.4rem',
  },
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '2rem',
  },
  summaryCard: {
    background: '#ffffff',
    border: '1px solid #eee',
    borderRadius: '10px',
    padding: '1.5rem 1rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
  },
  goldNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#d4af37',
    lineHeight: '1.2',
  },
  cardLabel: {
    fontSize: '0.82rem',
    color: '#666',
    marginTop: '6px',
    fontWeight: '500',
  },
  // Info layout
  infoBlock: {
    background: '#fafafa',
    border: '1px solid #eee',
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
  },
  infoRow: {
    display: 'flex',
    padding: '0.5rem 0',
    fontSize: '0.92rem',
  },
  infoLabel: {
    width: '90px',
    fontWeight: '700',
    color: '#111',
  },
  infoValue: {
    color: '#444',
  },
  orderListItem: {
    background: '#fff',
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '0.85rem 1.2rem',
    fontSize: '0.9rem',
  },
  emptyText: {
    color: '#777',
    fontSize: '0.9rem',
    fontStyle: 'italic',
  },
  detailCard: {
    background: '#fafafa',
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '1.25rem',
    fontSize: '0.9rem',
    lineHeight: '1.6',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxWidth: '460px',
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontFamily: "'Outfit', sans-serif",
    boxSizing: 'border-box',
  },
  btnGold: {
    alignSelf: 'flex-start',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    padding: '0.5rem 1.5rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'background 0.2s',
  },
  // Wishlist Grid
  wishlistGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1.25rem',
  },
  wishItemCard: {
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '0.85rem',
    position: 'relative',
    background: '#fff',
  },
  wishItemImg: {
    width: '100%',
    height: '130px',
    objectFit: 'cover',
    borderRadius: '4px',
  },
  wishItemTitle: {
    margin: '0.5rem 0 0.25rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#333',
    lineHeight: '1.3',
  },
  wishItemPrice: {
    color: '#d4af37',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    margin: 0,
  },
  wishRemoveBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: '#ff4757',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '12px',
    padding: 0,
  },
};

// Add responsive sidebar CSS directly in head
if (!document.getElementById('profile-page-responsive-css')) {
  const css = document.createElement('style');
  css.id = 'profile-page-responsive-css';
  css.textContent = `
    @media (max-width: 768px) {
      div[style*="alignItems: flex-start"] {
        flex-direction: column !important;
      }
      aside[style*="width: 240px"] {
        width: 100% !important;
      }
    }
  `;
  document.head.appendChild(css);
}

export default Account;
