import React from 'react';
import { Navigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// ProtectedAdminRoute — React Router guard for /admin.
//
// Reads 'sri_admin_session' from localStorage.
//   • If session is missing or corrupted  → redirect to /admin-login
//   • If session is valid                 → render children normally
//
// This is completely separate from customer auth (sri_user).
// ─────────────────────────────────────────────────────────────

const ProtectedAdminRoute = ({ children }) => {
  let isAuthenticated = false;

  try {
    const raw = localStorage.getItem('sri_admin_session');
    if (raw) {
      const session = JSON.parse(raw);
      // A valid session must at minimum have a username
      if (session?.username) {
        isAuthenticated = true;
      }
    }
  } catch {
    // Corrupt JSON in localStorage — treat as unauthenticated
    localStorage.removeItem('sri_admin_session');
  }

  if (!isAuthenticated) {
    // Not logged in → redirect to admin login page
    return <Navigate to="/admin-login" replace />;
  }

  // Logged in → render the protected admin content
  return children;
};

export default ProtectedAdminRoute;
