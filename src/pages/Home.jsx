import React from 'react';
import { Link } from 'react-router-dom';
import OffersSlideshow from '../components/OffersSlideshow';
import CategoryGrid from '../components/CategoryGrid';

const Home = () => {
  return (
    <div className="page-transition">
      {/* Hero Section */}
      <section className="hero banner-hero">
        <img 
          src="/banner.jpg" 
          alt="Sri Gifts Banner" 
          className="hero-banner-img" 
          width="1400" 
          height="700" 
          loading="eager" 
          fetchPriority="high" 
          decoding="async" 
        />
        <Link to="/products" className="btn btn-primary">Explore Now</Link>
      </section>

      {/* Offer Slideshow Section */}
      <OffersSlideshow />

      {/* Categories Grid Section */}
      <CategoryGrid />
    </div>
  );
};

export default Home;
