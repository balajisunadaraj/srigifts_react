import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import FloatingButtons from './components/FloatingButtons';
import CartDrawer from './components/CartDrawer';

import Home from './pages/Home';
import Products from './pages/Products';
import TrackOrder from './pages/TrackOrder';
import About from './pages/About';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Account from './pages/Account';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';

// Route guard — checks sri_admin_session in localStorage
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/**
 * AppContent — renders the correct layout based on the current route.
 * Admin routes (/admin, /admin-login) get a full-screen layout with
 * no Header, Footer, FloatingButtons, or CartDrawer.
 * All customer routes get the standard layout.
 */
const AppContent = () => {
  const { pathname } = useLocation();

  // Hide chrome for all admin routes
  const isAdminRoute = pathname === '/admin' || pathname === '/admin-login';

  return (
    <>
      {!isAdminRoute && <Header />}

      <main style={{ minHeight: isAdminRoute ? '100vh' : '80vh' }}>
        <Routes>
          {/* ── Customer Routes ── */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/account" element={<Account />} />

          {/* ── Admin Routes ── */}
          {/* Publicly accessible — redirects to /admin if already logged in */}
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* Protected — requires valid sri_admin_session in localStorage */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <Admin />
              </ProtectedAdminRoute>
            }
          />
        </Routes>
      </main>

      {!isAdminRoute && <FloatingButtons />}
      {!isAdminRoute && <CartDrawer />}
      {!isAdminRoute && <Footer />}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <ScrollToTop />
      <AppContent />
    </Router>
  );
};

export default App;
