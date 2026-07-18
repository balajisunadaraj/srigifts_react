import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';

// ─────────────────────────────────────────────────────────────
// AdminLogin — authenticates admins via Firebase Realtime DB.
// Does NOT use Firebase Authentication or Supabase.
// Session stored in localStorage under 'sri_admin_session'.
// Customer login (sri_user) is completely unaffected.
// Theme: clean white, matching the Admin Dashboard UI.
// ─────────────────────────────────────────────────────────────

// Inject styles once
if (!document.getElementById('admin-login-style')) {
  const s = document.createElement('style');
  s.id = 'admin-login-style';
  s.textContent = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .al-input:focus {
      border-color: #111 !important;
      outline: none;
      box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
    }
    #al-submit-btn:not(:disabled):hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }
    #al-submit-btn:not(:disabled):active { transform: translateY(0); }
    .al-eye-btn:hover { color: #333 !important; }
  `;
  document.head.appendChild(s);
}

const AdminLogin = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    try {
      const existing = localStorage.getItem('sri_admin_session');
      if (existing) {
        const session = JSON.parse(existing);
        if (session?.username) {
          navigate('/admin', { replace: true });
        }
      }
    } catch {
      localStorage.removeItem('sri_admin_session');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      // Read the 'admins' node from Firebase RTDB
      const snapshot = await get(ref(db, 'admins'));

      if (!snapshot.exists()) {
        setError('Admin data not found. Please contact support.');
        return;
      }

      const adminsData = snapshot.val();
      let matchedAdmin = null;

      // Iterate all admin entries to find a matching username + password
      Object.values(adminsData).forEach((admin) => {
        if (admin.username === trimmedUser && admin.password === trimmedPass) {
          matchedAdmin = admin;
        }
      });

      if (matchedAdmin) {
        // ✅ Match — store session and go to dashboard
        const sessionData = {
          id: matchedAdmin.id,
          username: matchedAdmin.username,
          loggedInAt: new Date().toISOString(),
        };
        localStorage.setItem('sri_admin_session', JSON.stringify(sessionData));
        // Small delay to ensure localStorage is flushed before navigation
        setTimeout(() => navigate('/admin', { replace: true }), 50);
      } else {
        // ❌ No match
        setError('Invalid Username or Password.');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={LS.page}>
      <div style={LS.card}>

        {/* Branding */}
        <div style={LS.brand}>
          <div style={LS.brandIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1 style={LS.title}>SRI GIFTS Admin</h1>
            <p style={LS.subtitle}>Sign in to your dashboard</p>
          </div>
        </div>

        <div style={LS.divider} />

        {/* Login Form */}
        <form onSubmit={handleLogin} style={LS.form} noValidate>

          {/* Username */}
          <div style={LS.field}>
            <label htmlFor="al-username" style={LS.label}>Username</label>
            <input
              id="al-username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              className="al-input"
              style={LS.input}
              autoComplete="username"
              disabled={loading}
              required
            />
          </div>

          {/* Password */}
          <div style={LS.field}>
            <label htmlFor="al-password" style={LS.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="al-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="al-input"
                style={{ ...LS.input, paddingRight: '3rem' }}
                autoComplete="current-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="al-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                style={LS.eyeBtn}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={LS.errorBox} role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            id="al-submit-btn"
            type="submit"
            disabled={loading}
            style={{
              ...LS.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  display: 'inline-block', width: '15px', height: '15px',
                  border: '2px solid rgba(255,255,255,0.35)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Verifying...
              </span>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={LS.footer}>
          Restricted to authorised administrators only.
        </p>
      </div>
    </div>
  );
};

// ── Styles — clean white theme matching Admin Dashboard ───────
const LS = {
  page: {
    minHeight: '100vh',
    background: '#f2f2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    fontFamily: "'Outfit', sans-serif",
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '2.5rem 2.25rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
    border: '1px solid #e8e8e8',
    animation: 'fadeSlideUp 0.35s ease',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  brandIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    background: '#111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#111',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.82rem',
    color: '#888',
    margin: '2px 0 0',
  },
  divider: {
    height: '1px',
    background: '#f0f0f0',
    marginBottom: '1.75rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#444',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #ddd',
    borderRadius: '8px',
    fontSize: '0.92rem',
    fontFamily: "'Outfit', sans-serif",
    color: '#222',
    background: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.85rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    transition: 'color 0.2s',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: '#fff5f5',
    border: '1.5px solid #ffcdd2',
    borderRadius: '8px',
    padding: '0.65rem 0.9rem',
    color: '#c62828',
    fontSize: '0.87rem',
    lineHeight: '1.4',
  },
  submitBtn: {
    width: '100%',
    padding: '0.88rem',
    background: '#111',
    border: 'none',
    borderRadius: '30px',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: '700',
    fontFamily: "'Outfit', sans-serif",
    transition: 'opacity 0.2s, transform 0.15s',
    marginTop: '0.25rem',
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.76rem',
    color: '#bbb',
  },
};

export default AdminLogin;
