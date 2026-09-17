import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Login({ onAuthSuccess, authError }) {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuthSuccess({ mode: authMode, email, username, password });
  };

  const handleGoogleSuccess = (credentialResponse) => {
    onAuthSuccess({ mode: 'google', credential: credentialResponse.credential });
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Lock size={48} color="var(--wa-teal-light)" />
          <h2 style={{ marginTop: '10px', color: 'var(--wa-teal-dark)' }}>CryptoChat</h2>
          <p style={{ color: 'var(--wa-text-secondary)' }}>Sign in to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {authError && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{authError}</div>}
          
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
            required
          />

          {authMode === 'register' && (
            <input 
              type="text" 
              placeholder="Display Name" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
              required
            />
          )}

          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
            required
          />
          <button type="submit" style={{ background: 'var(--wa-teal-light)', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
            {authMode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', textAlign: 'center', color: '#999' }}>
          <hr style={{ flex: 1, borderTop: '1px solid #ddd' }} />
          <span style={{ padding: '0 10px' }}>OR</span>
          <hr style={{ flex: 1, borderTop: '1px solid #ddd' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log('Login Failed');
            }}
          />
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            style={{ background: 'none', border: 'none', color: 'var(--wa-teal-light)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
