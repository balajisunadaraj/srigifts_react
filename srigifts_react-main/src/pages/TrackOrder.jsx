import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, off } from 'firebase/database';
import { supabase } from '../supabase'; // Fallback if not using RTDB fully yet

const TrackOrder = () => {
  const [orderId, setOrderId] = useState('');
  const [orderStatus, setOrderStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clean up listener
  useEffect(() => {
    return () => {
      if (orderId) {
        const orderRef = ref(db, `orders/${orderId}`);
        off(orderRef);
      }
    };
  }, [orderId]);

  const handleTrack = async () => {
    if (!orderId.trim()) {
      setError('Please enter a valid Order ID');
      return;
    }
    
    setError('');
    setLoading(true);
    setOrderStatus(null);

    // 1. Setup Firebase Realtime Database Listener for instant updates
    const orderRef = ref(db, `orders/${orderId.trim()}`);
    onValue(orderRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setOrderStatus(data);
        setLoading(false);
      } else {
        // Fallback to Supabase if not found in RTDB (for old orders)
        fetchFromSupabase(orderId.trim());
      }
    }, (err) => {
      console.error("Firebase tracking error:", err);
      fetchFromSupabase(orderId.trim());
    });
  };

  const fetchFromSupabase = async (id) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('orderId', id)
        .single();
        
      if (error || !data) {
        setError("Order not found. Please check the ID and try again.");
      } else {
        setOrderStatus(data);
      }
    } catch (err) {
      setError("Failed to track order. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-transition">
      <div className="page-header">
        <h1>Track Your Order</h1>
        <p>Enter your order ID below to check the delivery status.</p>
      </div>

      <section className="container" style={{ paddingTop: '2rem', minHeight: '50vh', textAlign: 'center' }}>
        <div className="track-container" style={{ 
          maxWidth: '600px', margin: '0 auto', backgroundColor: 'var(--card-bg)', 
          padding: '3rem', borderRadius: '16px', border: '1px solid var(--border-color)', 
          boxShadow: 'var(--shadow-sm)' 
        }}>
          <div className="form-group" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <label htmlFor="order-id" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--primary-color)' }}>Order ID</label>
            <input 
              type="text" 
              id="order-id" 
              placeholder="e.g. SG-123456" 
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit', transition: 'var(--transition)' }}
            />
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={handleTrack}
            disabled={loading}
          >
            {loading ? 'Tracking...' : 'Track Package'}
          </button>
          
          {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

          {orderStatus && (
            <div className="track-result" style={{ 
              marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', 
              borderRadius: '8px', display: 'block', borderLeft: '4px solid var(--accent-color)', 
              textAlign: 'left' 
            }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Order Status: {orderStatus.status}</h3>
              <p>{orderStatus.message}</p>
              {orderStatus.updatedAt && (
                <small style={{ color: '#888', display: 'block', marginTop: '1rem' }}>
                  Last updated: {new Date(orderStatus.updatedAt).toLocaleString()}
                </small>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default TrackOrder;
