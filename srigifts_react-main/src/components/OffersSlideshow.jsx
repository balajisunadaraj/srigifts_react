import React, { useState, useEffect } from 'react';
import { db } from "../firebase";
import { ref, get } from "firebase/database";

const OffersSlideshow = () => {
  const [offers, setOffers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
  if (offers.length <= 1) return;

  const interval = setInterval(() => {
    setCurrentIndex(prev =>
      prev === offers.length - 1 ? 0 : prev + 1
    );
  }, 5000);

  return () => clearInterval(interval);
}, [offers.length]);

  useEffect(() => {
  const fetchOffers = async () => {
    try {
      const snapshot = await get(ref(db, "offers"));

      if (snapshot.exists()) {
        const data = snapshot.val();

        const offersArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));

        // Sort by latest offerDate
        offersArray.sort(
          (a, b) => new Date(b.offerDate) - new Date(a.offerDate)
        );

        setOffers(offersArray);
      } else {
        setOffers([]);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  fetchOffers();
}, []);

  if (offers.length === 0) {
    return (
      <section className="offers-slideshow-section">
        <div className="text-center" style={{ padding: '3rem 5% 1.5rem' }}>
          <h2>Special Offers & Announcements</h2>
          <p>Explore exclusive seasonal discounts, active coupon alerts, and important store updates.</p>
        </div>
        <div className="offers-slideshow-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '280px' }}>
          <div className="offer-no-active">
            <h3>No Active Offers</h3>
            <p>Check back later for exciting deals!</p>
          </div>
        </div>
      </section>
    );
  }

  const handlePrev = () => {
    setCurrentIndex(prev => prev === 0 ? offers.length - 1 : prev - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev === offers.length - 1 ? 0 : prev + 1);
  };

  return (
    <section className="offers-slideshow-section">
      <div className="text-center" style={{ padding: '3rem 5% 1.5rem' }}>
        <h2>Special Offers & Announcements</h2>
        <p>Explore exclusive seasonal discounts, active coupon alerts, and important store updates.</p>
      </div>
      <div className="offers-slideshow-wrapper">
        <div className="offers-slideshow-track">
          {offers.map((offer, index) => (
            <div key={offer.id} className={`offer-slide ${index === currentIndex ? 'active' : ''}`}>
              <div className="offer-slide-img">
                {offer.image ? (
                  <img src={offer.image} alt={offer.title} />
                ) : (
                  <div className="offer-slide-img-placeholder">🎁</div>
                )}
              </div>
              <div className="offer-slide-content">
                {offer.discount > 0 && <span className="offer-slide-discount">{offer.discount}% OFF</span>}
                <h3 className="offer-slide-title">{offer.title}</h3>
                <p className="offer-slide-message">{offer.message}</p>
                <div className="offer-slide-meta">
                  <span>{offer.category}</span>
                  <span>{new Date(offer.offerDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {offers.length > 1 && (
          <>
            <button className="slideshow-btn slideshow-prev" onClick={handlePrev} aria-label="Previous offer">‹</button>
            <button className="slideshow-btn slideshow-next" onClick={handleNext} aria-label="Next offer">›</button>
            <div className="slideshow-dots">
              {offers.map((_, index) => (
                <div 
                  key={index} 
                  className={`slideshow-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default OffersSlideshow;
