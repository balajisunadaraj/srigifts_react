import React from 'react';

const ProductCard = ({ product, onClick, compact = false }) => {
  const isOutOfStock = product.inStock === 0;
  
  const optimizedImage = product.image;

  return (
    <div 
      className={`product-card ${compact ? 'product-card--compact' : ''}`} 
      onClick={(event) => onClick && onClick(event, product)}
      style={isOutOfStock ? { opacity: 0.6 } : {}}
    >
      <div className="product-img-wrap" style={{ position: 'relative' }}>
        <img 
          src={optimizedImage || 'https://via.placeholder.com/450x320?text=No+Image'} 
          alt={product.title} 
          loading="lazy"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/450x320?text=Image+Not+Available'; }}
        />
        {product.category && compact && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%',
            background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '0.65rem 1rem',
            fontSize: '0.95rem', textTransform: 'capitalize'
          }}>
            {product.category}
          </div>
        )}
        {isOutOfStock && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', zIndex: 2
          }}>
            Out of Stock
          </div>
        )}
      </div>
      {!compact && (
        <div className="product-info">
          <h3 className="product-title">{product.title}</h3>
          <p className="product-price">₹{product.price}</p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}
            disabled={isOutOfStock}
            onClick={(e) => {
               e.stopPropagation();
               onClick && onClick(e, product);
            }}
          >
            {isOutOfStock ? 'Sold Out' : 'View Details'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
