import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, set } from 'firebase/database';
import CheckoutModal from './CheckoutModal';

const ProductModal = ({ product, onClose }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);

  if (!product) return null;

  const isOutOfStock = product.inStock === 0;

  const handleBuyNow = () => {
    setShowCheckout(true);
  };

  const handleWishlist = async () => {
    if (!user) {
      alert('Please login to add items to wishlist');
      return;
    }
    try {
      const wishlistRef = ref(db, `wishlist/${user.uid}/${product.id}`);
      await set(wishlistRef, {
        productTitle: product.title,
        productPrice: product.price,
        productImage: product.image,
      });
      alert('Added to wishlist!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="modal-overlay active"
      onClick={(e) => e.target.className.includes('modal-overlay') && onClose()}
      style={{
        position: 'fixed',
        top: '100px',
        left: 0,
        right: 0,
        bottom: 0,
        height: '600px',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflowY: 'scroll',
        zIndex: 99999,
        padding: '1rem',
      }}
    >
      <div
        className="modal-content"
        style={{
          maxHeight: '70vh',
          overflowY: 'scroll',
          padding: '2rem',
          maxWidth: '900px',
          width: '95%',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          position: 'relative',
        }}
      >
        <span className="modal-close" onClick={onClose}>&times;</span>

        <div
          className="modal-main-details"
          style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}
        >
          <div
            className="modal-img"
            style={{
              flex: '0.8',
              minWidth: '200px',
              maxWidth: '280px',
              height: '280px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              overflow: 'hidden',
              borderRadius: '8px',
            }}
          >
            <img
              src={product.image || 'https://via.placeholder.com/450x320?text=No+Image'}
              alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div
            className="modal-details"
            style={{
              flex: '1.2',
              minWidth: '250px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2 style={{ marginTop: 0, fontSize: '2rem' }}>{product.title}</h2>
              <h3
                className="product-price"
                style={{ fontSize: '1.5rem', color: 'var(--accent-color)', marginBottom: '1rem' }}
              >
                ₹{product.price}
              </h3>
              <p
                className="modal-desc"
                style={{ lineHeight: '1.6', color: '#555', whiteSpace: 'pre-wrap' }}
              >
                {product.description}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginTop: '1rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <label style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Quantity:</label>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  padding: '0.4rem 0.6rem',
                  border: '1px solid #ddd',
                  background: '#f5f5f5',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                −
              </button>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  minWidth: '30px',
                  textAlign: 'center',
                }}
              >
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                style={{
                  padding: '0.4rem 0.6rem',
                  border: '1px solid #ddd',
                  background: '#f5f5f5',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                +
              </button>
              <span style={{ marginLeft: 'auto', fontWeight: '600', color: 'var(--accent-color)' }}>
                Total: ₹{product.price * quantity}
              </span>
            </div>

            <div
              style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}
            >
              <button
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '120px' }}
                disabled={isOutOfStock}
                onClick={() => { addToCart(product, quantity); onClose(); }}
              >
                {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1.3,
                  background: '#25D366',
                  borderColor: '#25D366',
                  minWidth: '150px',
                }}
                disabled={isOutOfStock}
                onClick={handleBuyNow}
              >
                Buy Now
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1,
                  background: '#ff4757',
                  borderColor: '#ff4757',
                  minWidth: '120px',
                }}
                onClick={handleWishlist}
              >
                ❤️ Wishlist
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          product={product}
          quantity={quantity}
          onClose={() => { setShowCheckout(false); onClose(); }}
        />
      )}
    </div>
  );
};

export default ProductModal;
