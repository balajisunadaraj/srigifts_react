import React from 'react';

const About = () => {
  return (
    <div className="page-transition">
      <div className="page-header">
        <h1>Our Story</h1>
        <p>The vision behind SRI GIFTS.</p>
      </div>

      <section className="container" style={{ paddingTop: '2rem', minHeight: '50vh' }}>
        <div className="about-content" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', fontSize: '1.125rem', lineHeight: '1.8', color: 'var(--text-color)' }}>
          <p style={{ marginBottom: '2rem' }}>
            At SRI GIFTS, we believe that every moment worth celebrating deserves a timeless keepsake. Founded with a passion for intricate craftsmanship and elegant design, we set out to redefine the art of gifting.
          </p>
          <p style={{ marginBottom: '2rem' }}>
            We are a premium gift boutique specializing in personalized wooden engravings, metallic keychains, modern 3D printed decor, and minimalist photo frames. Every item we curate is selected with immense care to ensure it meets our standard of luxury, aesthetics, and emotional resonance.
          </p>
          <p>
            Our commitment is simple: creating memories that can be held forever, beautifully.
          </p>
        </div>
      </section>
    </div>
  );
};

export default About;
