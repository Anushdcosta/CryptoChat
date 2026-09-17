import React, { useState, useEffect } from 'react';
import { Lock, Phone, Mail } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

export default function Login() {
  const [authMode, setAuthMode] = useState('login'); // login, register, phone
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  }, []);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePhoneAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await confirmationResult.confirm(verificationCode);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Lock size={48} color="var(--wa-teal-light)" />
          <h2 style={{ marginTop: '10px', color: 'var(--wa-teal-dark)' }}>CryptoChat</h2>
          <p style={{ color: 'var(--wa-text-secondary)' }}>Sign in to continue</p>
        </div>
        
        {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center', marginBottom: '15px' }}>{error}</div>}

        <div id="recaptcha-container"></div>

        {authMode === 'phone' ? (
          confirmationResult ? (
            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="text" 
                placeholder="6-digit SMS Code" 
                value={verificationCode} 
                onChange={e => setVerificationCode(e.target.value)}
                style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
                required
              />
              <button type="submit" style={{ background: 'var(--wa-teal-light)', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
                Verify Code
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhoneAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="tel" 
                placeholder="Phone Number (e.g. +1234567890)" 
                value={phoneNumber} 
                onChange={e => setPhoneNumber(e.target.value)}
                style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
                required
              />
              <button type="submit" style={{ background: 'var(--wa-teal-light)', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
                Send SMS Code
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
              required
            />
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
        )}

        <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', textAlign: 'center', color: '#999' }}>
          <hr style={{ flex: 1, borderTop: '1px solid #ddd' }} />
          <span style={{ padding: '0 10px' }}>OR</span>
          <hr style={{ flex: 1, borderTop: '1px solid #ddd' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={handleGoogleAuth}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'white', border: '1px solid #ccc', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" style={{ width: '20px' }} />
            Sign in with Google
          </button>
          
          {authMode !== 'phone' && (
            <button 
              onClick={() => { setAuthMode('phone'); setError(''); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#25D366', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              <Phone size={20} />
              Sign in with Phone
            </button>
          )}
          {authMode === 'phone' && (
            <button 
              onClick={() => { setAuthMode('login'); setError(''); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--wa-teal-light)', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              <Mail size={20} />
              Sign in with Email
            </button>
          )}
        </div>
        
        {authMode !== 'phone' && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              style={{ background: 'none', border: 'none', color: 'var(--wa-teal-light)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
