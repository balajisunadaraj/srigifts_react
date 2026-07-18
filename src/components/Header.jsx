import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { user } = useAuth();

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const closeNav = () => setIsNavOpen(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header>
      <Link to="/" className="logo" onClick={closeNav}>
        <img src="/sri-gifts-logo-new.png" alt="SRI GIFTS" className="main-logo-img" />
      </Link>
      
      <button 
        className={`mobile-nav-toggle ${isNavOpen ? 'open' : ''}`} 
        onClick={toggleNav}
        aria-label="Toggle Navigation"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={isNavOpen ? 'nav-active' : ''}>
        <ul>
          <li>
            <Link to="/" style={isActive('/') ? { color: 'var(--accent-color)' } : {}} onClick={closeNav}>Home</Link>
          </li>
          <li>
            <Link to="/products" style={isActive('/products') ? { color: 'var(--accent-color)' } : {}} onClick={closeNav}>Products</Link>
          </li>
          <li>
            <Link to="/track-order" style={isActive('/track-order') ? { color: 'var(--accent-color)' } : {}} onClick={closeNav}>Track Order</Link>
          </li>
          <li>
            <Link to="/about" style={isActive('/about') ? { color: 'var(--accent-color)' } : {}} onClick={closeNav}>About</Link>
          </li>
          <li>
            {user ? (
              <Link to="/account" style={isActive('/account') ? { color: 'var(--accent-color)' } : {}} onClick={closeNav}>Profile</Link>
            ) : (
              <Link to="/login" style={isActive('/login') ? { color: 'var(--accent-color)' } : {}} onClick={closeNav}>Login</Link>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
