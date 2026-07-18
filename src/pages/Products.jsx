import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import { CATEGORY_OPTIONS } from '../data/categories';
import {
  fetchFirebaseCategories,
  fetchFirebaseProducts,
  fetchFirebaseProductById,
  fetchSupabaseCategories,
  fetchSupabaseProducts,
  fetchSupabaseProductById,
} from '../services/productsService';

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

      let productData = [];
      let categoryNames = [];

      try {
        const [firebaseProducts, firebaseCategories] = await Promise.all([
          fetchFirebaseProducts(),
          fetchFirebaseCategories(),
        ]);

        if (firebaseProducts.length > 0) {
          productData = firebaseProducts;
          categoryNames = firebaseCategories.map((c) => c.name).filter(Boolean);
        } else {
          throw new Error('No products found in Firebase.');
        }
      } catch (firebaseError) {
        console.warn('Firebase fetch failed, falling back to Supabase:', firebaseError);

        try {
          const [supabaseProducts, supabaseCategories] = await Promise.all([
            fetchSupabaseProducts(),
            fetchSupabaseCategories(),
          ]);

          productData = supabaseProducts;
          categoryNames = supabaseCategories.map((c) => c.name).filter(Boolean);
        } catch (supabaseError) {
          console.error('Supabase fallback also failed:', supabaseError);
          setError('Unable to load products at this time. Please check your connection and try again.');
          setLoading(false);
          return;
        }
      }

      setProducts(productData);

      const catsFromProducts = [...new Set(productData.map((p) => p.category))].filter(Boolean);
      const uniqueCats = ['All', ...new Set([...CATEGORY_OPTIONS.map((c) => c.name), ...categoryNames, ...catsFromProducts])];
      setCategories(uniqueCats);
      setLoading(false);
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
    
    // Capture click coordinates
    const rect = event.currentTarget.getBoundingClientRect();
    setModalPosition({
      x: rect.left,
      y: rect.top,
    });

    setLoadingProduct(true);
    // Try Firebase first
    let full = null;
    try {
      full = await fetchFirebaseProductById(product.id);
    } catch (e) {
      console.warn('Firebase detail fetch failed', e);
    }

    if (!full) {
      try {
        full = await fetchSupabaseProductById(product.id);
      } catch (e) {
        console.warn('Supabase detail fetch failed', e);
      }
    }

    // If still no full, fall back to the passed product object
    setSelectedProduct(full || product);
    setLoadingProduct(false);
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
              <section key={categoryName} className="category-group" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.35rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
                  {categoryName}
                </h3>
                <div className="category-products-row">
                  {groupedProducts[categoryName].map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      compact={false}
                      onClick={(event) => handleProductClick(event, product)}
                    />
                  ))}
                </div>
              </section>
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
