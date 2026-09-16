import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { db } from '../firebase';
import { ref, set, get } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

const CheckoutModal = ({ product, quantity = 1, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('details'); // 'details', 'payment', 'reference'

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.mobile || '',
    address: '',
    city: '',
    pincode: '',
  });

  const [paymentRef, setPaymentRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderId, setOrderId] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [utrError, setUtrError] = useState('');

  // Auto-fill address from user profile
  useEffect(() => {
    if (!user?.uid) return;
    const fetchAddresses = async () => {
      try {
        const snapshot = await get(ref(db, `users/${user.uid}/addresses`));
        if (snapshot.exists()) {
          const addrs = Object.values(snapshot.val());
          setSavedAddresses(addrs);
          // Auto-fill with the first saved address
          if (addrs.length > 0) {
            const first = addrs[0];
            setFormData(prev => ({
              ...prev,
              address: first.street || '',
              city: first.city || '',
              pincode: first.pincode || '',
            }));
          }
        }
      } catch (e) {
        console.warn('Failed to load addresses:', e);
      }
    };
    fetchAddresses();
  }, [user]);

  const createOrderId = () => {
    const prefix = 'SG';
    const timestampPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${timestampPart}-${randomPart}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressSelect = (addr) => {
    setFormData(prev => ({
      ...prev,
      address: addr.street || '',
      city: addr.city || '',
      pincode: addr.pincode || '',
    }));
  };

  const handleSubmitDetails = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address || !formData.city || !formData.pincode) {
      alert('Please fill all fields');
      return;
    }

    const generatedOrderId = createOrderId();
    setOrderId(generatedOrderId);
    setStep('payment');
  };

  const handlePaymentRefChange = (e) => {
    // Allow only digits, max 12
    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
    setPaymentRef(val);
    if (val.length > 0 && val.length < 12) {
      setUtrError('UTR/Reference number must be exactly 12 digits.');
    } else {
      setUtrError('');
    }
  };

  const handleFinalizeOrder = async () => {
    if (!paymentRef.trim()) {
      alert('Please enter payment reference number');
      return;
    }
    if (paymentRef.length !== 12) {
      setUtrError('UTR/Reference number must be exactly 12 digits.');
      return;
    }
    setLoading(true);
    setOrderError('');

    try {
      const finalOrderId = orderId || createOrderId();
      setOrderId(finalOrderId);

      const orderData = {
        orderId: finalOrderId,
        userId: user?.id || 'guest',
        userName: user?.name || 'Guest',
        productTitle: product.title,
        productPrice: product.price,
        productImage: product.image,
        quantity: quantity,
        totalAmount: product.price * quantity,

        customerName: formData.name,
        customerPhone: formData.phone,
        customerAddress: formData.address,
        customerCity: formData.city,
        customerPincode: formData.pincode,

        paymentReference: paymentRef,
        paymentStatus: 'Pending Verification',

        status: 'Processing',
        message: 'Awaiting payment verification',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const orderRef = ref(db, `orders/${finalOrderId}`);
      await set(orderRef, orderData);

      alert('Order placed successfully! Order ID: ' + finalOrderId);
      setLoading(false);
      onClose();
    } catch (err) {
      console.error('Order submission error:', err);
      setOrderError('Failed to place order. Please try again.');
      setLoading(false);
    }
  };

  const totalAmount = product.price * quantity;
  const paymentAccountNumber = import.meta.env.VITE_PAYMENT_ACCOUNT_NUMBER || 'priyadharshinisuriyan@okaxis';
  const paymentQRValue = `upi://pay?pa=${encodeURIComponent(paymentAccountNumber)}&pn=SRI%20GIFTS&tr=${encodeURIComponent(orderId || 'ORDER')}&am=${totalAmount}&cu=INR`;

  return (
    <div
      className="modal-overlay active"
      onClick={(e) => e.target.className.includes('modal-overlay') && onClose()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflowY: 'auto',
        zIndex: 99999,
        padding: '1rem',
      }}
    >
      <div
        className="checkout-modal"
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '95%',
          maxHeight: '82vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          position: 'relative',
        }}
      >
        <span
          className="modal-close"
          onClick={onClose}
          style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '2rem', cursor: 'pointer' }}
        >
          &times;
        </span>

        {/* STEP 1: User Details Form */}
        {step === 'details' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Delivery Details</h2>

            {/* Saved address selector */}
            {savedAddresses.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#444' }}>
                  Select a saved address:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {savedAddresses.map((addr, i) => (
                    <button
                      key={addr.id || i}
                      type="button"
                      onClick={() => handleAddressSelect(addr)}
                      style={{
                        textAlign: 'left',
                        padding: '0.6rem 0.9rem',
                        border: '1.5px solid #ddd',
                        borderRadius: '8px',
                        background: '#f9f9f9',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        color: '#333',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={e => e.target.style.borderColor = '#d4af37'}
                      onMouseLeave={e => e.target.style.borderColor = '#ddd'}
                    >
                      📍 {addr.street}, {addr.city}{addr.state ? `, ${addr.state}` : ''} — {addr.pincode}
                    </button>
                  ))}
                </div>
                <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
              </div>
            )}

            <form onSubmit={handleSubmitDetails} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Order Summary</p>
                <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>{product.title}</p>
                <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>Quantity: {quantity}</p>
                <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                  Total: ₹{totalAmount}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.3rem' }}>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  style={{ width: '100%', padding: '0.7rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.3rem' }}>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile number"
                  pattern="[0-9]{10}"
                  style={{ width: '100%', padding: '0.7rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.3rem' }}>Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="House no., street, area"
                  style={{ width: '100%', padding: '0.7rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.3rem' }}>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    style={{ width: '100%', padding: '0.7rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.3rem' }}>Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="6-digit pincode"
                    pattern="[0-9]{6}"
                    style={{ width: '100%', padding: '0.7rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '1rem', fontSize: '1rem' }}>
                Continue to Payment
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Payment QR Code */}
        {step === 'payment' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Payment Required</h2>
            <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>Amount to Pay</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>₹{totalAmount}</p>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#666' }}>Order ID: {orderId || 'Generating...'}</p>
            </div>

            <div style={{ background: '#f0f0f0', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'inline-block' }}>
              <QRCodeCanvas value={paymentQRValue} size={256} level="H" marginSize={4} />
            </div>

            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Scan this QR code to pay ₹{totalAmount} via UPI
            </p>
            <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '1.5rem' }}>
              Make the payment and note down your 12-digit UTR/transaction reference number
            </p>

            <button
              onClick={() => setStep('reference')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
            >
              I've Completed Payment
            </button>
          </div>
        )}

        {/* STEP 3: Payment Reference */}
        {step === 'reference' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Confirm Payment</h2>
            <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>Order Total</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>₹{totalAmount}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.3rem' }}>
                  UTR / Transaction Reference Number * <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 400 }}>(12 digits)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={paymentRef}
                  onChange={handlePaymentRefChange}
                  placeholder="Enter 12-digit UTR number"
                  maxLength={12}
                  style={{
                    width: '100%',
                    padding: '0.7rem',
                    border: `1px solid ${utrError ? '#c62828' : '#ddd'}`,
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    fontSize: '1rem',
                    letterSpacing: '0.05em',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  {utrError ? (
                    <span style={{ fontSize: '0.8rem', color: '#c62828' }}>{utrError}</span>
                  ) : (
                    <span />
                  )}
                  <span style={{ fontSize: '0.8rem', color: paymentRef.length === 12 ? '#2e7d32' : '#888' }}>
                    {paymentRef.length}/12
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#666', background: '#f0f0f0', padding: '0.75rem', borderRadius: '4px', margin: 0 }}>
                You can find this in your UPI app or bank's payment confirmation message
              </p>

              {orderError && (
                <div style={{ background: '#fee', padding: '0.75rem', borderRadius: '4px', color: '#c00', fontSize: '0.9rem' }}>
                  {orderError}
                </div>
              )}

              <button
                type="button"
                onClick={handleFinalizeOrder}
                disabled={loading || paymentRef.length !== 12}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  fontSize: '1rem',
                  opacity: (loading || paymentRef.length !== 12) ? 0.65 : 1,
                  cursor: (loading || paymentRef.length !== 12) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
