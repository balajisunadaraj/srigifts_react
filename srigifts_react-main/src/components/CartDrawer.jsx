import React from 'react';
import { useCart } from '../context/CartContext';

const CartDrawer = () => {
  const { cartItems, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, cartTotal } = useCart();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    if (cartItems.length === 0) return alert('Your cart is empty');
    
    let message = "Hi, I would like to place an order for the following items:\n\n";
    cartItems.forEach((item, index) => {
        message += `${index + 1}. ${item.title} - ${item.quantity} x ₹${item.price} = ₹${item.quantity * item.price}\n`;
    });
    message += `\n*Total Amount: ₹${cartTotal}*\n\n`;
    message += "Please provide me with the payment details and customization options.";
    
    const whatsappUrl = `https://wa.me/918668001014?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000
        }} 
        onClick={() => setIsCartOpen(false)} 
      />
      
      <div style={{
        position: 'fixed', top: 0, right: 0, width: 'min(400px, 100vw)', height: '100%',
        background: 'var(--bg-color)', zIndex: 1001, boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Your Cart</h2>
          <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {cartItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-light)', marginTop: '2rem' }}>Your cart is empty.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {cartItems.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                  <img src={item.image} alt={item.title} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>{item.title}</h4>
                    <p style={{ margin: '0 0 0.5rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>₹{item.price}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '4px' }}>
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '0.2rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>-</button>
                        <span style={{ padding: '0 0.5rem' }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '0.2rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} style={{ color: '#ff4757', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: '#f9f9f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <span>Total:</span>
            <span style={{ color: 'var(--accent-color)' }}>₹{cartTotal}</span>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', background: '#25D366', borderColor: '#25D366' }}
            onClick={handleCheckout}
            disabled={cartItems.length === 0}
          >
            Checkout via WhatsApp
          </button>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
