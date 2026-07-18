import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSignup = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // Write complete user profile details into the RTDB
      await set(ref(db, "users/" + userCredential.user.uid), {
        name,
        email,
        mobile: mobile.trim(),
        role: "customer",
      });

      const sessionId = Math.random().toString(36).substring(2, 15);

      login(
        {
          uid: userCredential.user.uid,
          name: userCredential.user.displayName || name,
          email: userCredential.user.email,
          mobile: mobile.trim(),
          role: "customer",
        },
        sessionId
      );
      navigate("/account");
    } catch (error) {
      console.error(error);
      setError(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="page-transition" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem 5%' }}>
      <div className="auth-container" style={{ width: '100%', maxWidth: '400px', background: 'var(--card-bg)', padding: '2.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Create an Account</h2>
        {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
            <input 
              type="text" 
              required
              style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email Address</label>
            <input 
              type="email" 
              required
              style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Mobile Number</label>
            <input 
              type="tel" 
              required
              placeholder="e.g. 9486520377"
              style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
              value={mobile}
              onChange={e => setMobile(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password</label>
            <input 
              type="password" 
              required
              style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.9rem', fontSize: '1.05rem' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#666' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
