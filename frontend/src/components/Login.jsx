import React, { useState, useEffect } from 'react';
import { Lock, Phone, Mail } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithCredential, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

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

    // Handle deep link token from Electron
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      
      const handleDeepLink = async (event, url) => {
        try {
          const urlObj = new URL(url);
          const token = urlObj.searchParams.get('token');
          if (token) {
            const credential = GoogleAuthProvider.credential(token);
            await signInWithCredential(auth, credential);
          }
        } catch (err) {
          setError(err.message || 'Failed to login from deep link');
        }
      };

      ipcRenderer.on('deep-link-url', handleDeepLink);
      return () => {
        ipcRenderer.removeListener('deep-link-url', handleDeepLink);
      };
    } else {
      // Handle Web App redirect logic for Desktop OAuth
      const urlParams = new URLSearchParams(window.location.search);
      const isDesktopAuth = urlParams.get('desktopAuth');
      if (isDesktopAuth) {
        setAuthMode('desktop-redirect');
      }
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
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        await signInWithCredential(auth, credential);
      } else if (window.require) {
        // We are in Electron! Open the secure system browser to do the login.
        const { shell } = window.require('electron');
        shell.openExternal('https://cryptochat-silk.vercel.app/?desktopAuth=true');
      } else {
        // We are on the regular web app, use the normal popup
        const result = await signInWithPopup(auth, googleProvider);
        
        // If this was a deep link redirect for the desktop app, send the token back!
        if (authMode === 'desktop-redirect') {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential && credential.idToken) {
            window.location.href = `cryptochat://auth?token=${credential.idToken}`;
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Google Sign-In failed');
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

  if (authMode === 'desktop-redirect') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-2xl shadow-xl text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">Login to CryptoChat Desktop</h2>
          <p className="mt-2 text-sm text-gray-400">
            Click the button below to securely log in with Google and return to the desktop app.
          </p>
          <button
            onClick={handleGoogleAuth}
            className="w-full mt-8 group relative flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

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
