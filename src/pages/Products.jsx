import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import { CATEGORY_OPTIONS } from '../data/categories';
import {
  fetchFirebaseCategories,
  fetchFirebaseProducts,
  fetchFirebaseProductById,
} from '../services/productsService';

const CategorySection = ({ categoryName, products, handleProductClick }) => {
  const rowRef = React.useRef(null);

  const handleScroll = (direction) => {
    if (rowRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="category-group" style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--primary-color)' }}>
          {categoryName} <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'normal' }}>({products.length})</span>
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            type="button"
            className="category-scroll-btn" 
            onClick={() => handleScroll('left')}
            title="Scroll Left"
            aria-label="Scroll Left"
          >
            &#10094;
          </button>
          <button 
            type="button"
            className="category-scroll-btn" 
            onClick={() => handleScroll('right')}
            title="Scroll Right"
            aria-label="Scroll Right"
          >
            &#10095;
          </button>
        </div>
      </div>
      <div className="category-products-row" ref={rowRef}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            compact={false}
            onClick={(event) => handleProductClick(event, product)}
          />
        ))}
      </div>
    </section>
  );
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [compactListMode, setCompactListMode] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const [firebaseProducts, firebaseCategories] = await Promise.all([
          fetchFirebaseProducts(),
          fetchFirebaseCategories(),
        ]);

        if (firebaseProducts.length === 0) {
          setError('No products found in Firebase.');
          setProducts([]);
          setCategories(['All']);
          return;
        }

        const productData = firebaseProducts;
        const categoryNames = firebaseCategories.map((c) => c.name).filter(Boolean);

        setProducts(productData);

        const catsFromProducts = [...new Set(productData.map((p) => p.category))].filter(Boolean);
        const uniqueCats = ['All', ...new Set([...CATEGORY_OPTIONS.map((c) => c.name), ...categoryNames, ...catsFromProducts])];
        setCategories(uniqueCats);
      } catch (firebaseError) {
        console.error('Firebase fetch failed:', firebaseError);
        setError('Unable to load products at this time. Please check your connection and try again.');
        setProducts([]);
        setCategories(['All']);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update active category if URL changes
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setActiveCategory(cat);
    }
  }, [searchParams]);

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', cat);
    }
    setSearchParams(searchParams);
  };

  const filteredProducts = products.filter((p) => {
    // Perform case‑insensitive category matching to handle variations like "Photo Frames" vs "Photo frames"
    const activeCat = activeCategory.toLowerCase();
    const productCat = (p.category || '').toLowerCase();
    const matchesCategory = activeCat === 'all' || productCat === activeCat;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [p.title, p.description, p.category].join(' ').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const categoryName = product.category || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {});

  const groupedCategories = Object.keys(groupedProducts).sort((a, b) => a.localeCompare(b));

  const [loadingProduct, setLoadingProduct] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });

  const handleProductClick = async (event, product) => {
    if (!product) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setModalPosition({
      x: rect.left,
      y: rect.top,
    });

    setLoadingProduct(true);

    try {
      const full = await fetchFirebaseProductById(product.id);
      setSelectedProduct(full || product);
    } catch (e) {
      console.warn('Firebase detail fetch failed', e);
      setSelectedProduct(product);
    } finally {
      setLoadingProduct(false);
    }
  };

  return (
    <div className="page-transition">
      <div className="page-header" id="products-page-marker">
        <h1>Our Collection</h1>
        <p>Browse our curated selection of fine gifts across all categories.</p>
      </div>

      <div className="search-section-wrapper container" style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
        <div className="search-bar-container">
          <div className="search-input-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              id="product-search-input" 
              placeholder="Search for bottles, frames, keychains, caricature..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" style={{ display: 'flex' }} onClick={() => setSearchQuery('')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <div className="search-filters-scroll">
          <div className="search-filters-container">
            {categories.map(cat => (
              <button 
                key={cat}
                className={`filter-chip ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="compact-toggle-row" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setCompactListMode((prev) => !prev)}
          >
            {compactListMode ? 'Show full grid' : 'Show compact list'}
          </button>
        </div>

        {(searchQuery || activeCategory !== 'All') && (
          <div className="search-status" style={{ display: 'flex' }}>
            <span className="search-count-text">
              Found {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} 
              {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
              {searchQuery ? ` for "${searchQuery}"` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="container" style={{ paddingTop: 0 }}>
        {activeCategory !== 'All' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>{activeCategory}</h2>
          </div>
        )}
        {loading ? (
          <div className="search-no-results-card">
            <h3>Loading products...</h3>
            <p>Please wait while we load the catalogue.</p>
          </div>
        ) : error ? (
          <div className="search-no-results-card">
            <h3>Unable to load products</h3>
            <p>{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="search-no-results-card">
            <svg className="no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="9" y1="9" x2="13" y2="13"></line>
              <line x1="13" y1="9" x2="9" y2="13"></line>
            </svg>
            <h3>No Products Found</h3>
            <p>We couldn't find anything matching your current filters. Try adjusting your search or category.</p>
            <button className="btn btn-primary search-reset-btn" onClick={() => { setSearchQuery(''); handleCategoryClick('All'); }}>
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="category-groups" style={{ width: '100%', marginTop: '1rem' }}>
            {groupedCategories.map((categoryName) => (
              <CategorySection
                key={categoryName}
                categoryName={categoryName}
                products={groupedProducts[categoryName]}
                handleProductClick={handleProductClick}
              />
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          position={modalPosition}
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
};

export default Products;
