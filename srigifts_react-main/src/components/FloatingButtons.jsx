import React from 'react';
import { useCart } from '../context/CartContext';

const FloatingButtons = () => {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <>
      {/* Floating Elements */}
      <div className="floating-cart" title="View Cart" onClick={() => setIsCartOpen(true)}>
        <span className="cart-count">{cartCount}</span>
        <svg viewBox="0 0 24 24">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </div>

      {/* WhatsApp Contact Link */}
      <a 
        href="https://wa.me/918668001014?text=my%20order%20id%3A%20%28Enter%20your%20order%20id%20here%29%20and%20i%20want%20my%20gift%20with%20this%20photo%2Fname%20%3A%20" 
        target="_blank" 
        rel="noreferrer"
        className="floating-whatsapp" 
        title="Direct Message on WhatsApp"
      >
        <svg viewBox="0 0 24 24">
          <path d="M12.013 2a9.982 9.982 0 0 0-8.525 15.176l-1.351 4.936 5.053-1.325A9.972 9.972 0 1 0 12.013 2zm-.013 18.067a8.04 8.04 0 0 1-4.08-1.1l-.29-.17-3.033.795.81-2.955-.187-.297a8.04 8.04 0 1 1 6.78 3.727zm4.398-5.99c-.24-.12-1.42-.7-1.642-.78-.22-.08-.382-.12-.544.12-.16.24-.622.78-.762.94-.14.16-.28.18-.52.06a6.52 6.52 0 0 1-1.916-1.182 7.15 7.15 0 0 1-1.328-1.65c-.14-.24-.015-.37.105-.49.108-.108.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.544-1.312-.746-1.796-.195-.47-.393-.406-.544-.413h-.462c-.16 0-.422.06-.642.3-1.056 1.15-.24 2.822.8 4.21.144.193 1.053 1.7 2.656 2.38 1.408.597 1.966.64 2.585.54.737-.118 1.42-.58 1.62-.114.2.466 -.22 1.405-.28 1.545-.06.14-.14.18-.38.06z" />
        </svg>
      </a>
    </>
  );
};

export default FloatingButtons;
