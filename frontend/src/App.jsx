import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { User, Lock, ArrowRight, Search, X, Fingerprint, KeyRound } from 'lucide-react';
import { requestNotificationPermissions, showNotification } from './utils/NotificationUtils';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const SOCKET_URL = 'https://cryptochat-s5bf.onrender.com';

export default function App() {
  // Auth State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  
  // App State
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Security State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinMode, setPinMode] = useState('verify'); // 'create' or 'verify'
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Refs for socket callbacks
  const activeChatRef = useRef(null);
  const usersRef = useRef([]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Auth Forms
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [showTutorial, setShowTutorial] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${SOCKET_URL}/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      
      if (!localStorage.getItem('hasSeenTutorial')) {
        setShowTutorial(true);
        localStorage.setItem('hasSeenTutorial', 'true');
      }
      
      // Request notification permissions after login
      requestNotificationPermissions();
      
      // Determine if we need to set a PIN for the first time
      if (!Capacitor.isNativePlatform() && !localStorage.getItem('appPin')) {
        setPinMode('create');
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Keep appPin so the device remains locked to the user if they log in again? 
    // Actually, maybe clear it so a new user can set their own PIN.
    localStorage.removeItem('appPin');
    setToken(null);
    setUser(null);
    setIsUnlocked(false);
    if (socket) socket.disconnect();
  };

  // Fetch Users
  useEffect(() => {
    if (!token) return;
    
    fetch(`${SOCKET_URL}/api/users/recent`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  }, [token]);

  // Fetch All Users for Search
  useEffect(() => {
    if (!token || !isSearching) return;
    
    fetch(`${SOCKET_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setAllUsers(data))
      .catch(err => console.error(err));
  }, [token, isSearching]);

  // Socket Connection
  useEffect(() => {
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    
    newSocket.on('receive_direct_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      
      if (msg.senderId !== user?.id) {
        // If the app is in background, or we are not looking at the chat
        const isBackground = document.hidden;
        const isNotActiveChat = !activeChatRef.current || activeChatRef.current._id !== msg.senderId;

        if (isBackground || isNotActiveChat) {
          // Try to find sender's name
          const sender = usersRef.current.find(u => u._id === msg.senderId);
          const senderName = sender ? sender.username : 'Someone';
          showNotification('CryptoChat', `New message from ${senderName}`);
        }
      }
    });

    newSocket.on('message_viewed', (messageId) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, attachment: null, viewed: true } : m));
    });

    newSocket.on('user_status_change', (data) => {
      setUsers(prev => {
        const exists = prev.find(u => u._id === data.userId);
        if (!exists) {
          // If we don't know this user, fetch the recent list again
          fetch(`${SOCKET_URL}/api/users/recent`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(console.error);
          return prev;
        }
        return prev.map(u => 
          u._id === data.userId ? { ...u, isOnline: data.isOnline } : u
        );
      });
    });

    return () => newSocket.disconnect();
  }, [token]);

  // Fetch Messages when Active Chat changes
  useEffect(() => {
    if (!activeChat || !token) return;
    
    fetch(`${SOCKET_URL}/api/messages/${activeChat._id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error(err));
  }, [activeChat, token]);

  const handleSendMessage = (msgData) => {
    if (socket && activeChat) {
      const payload = {
        ...msgData,
        receiverId: activeChat._id
      };
      socket.emit('send_direct_message', payload);
    }
  };

  const handleMarkViewed = (messageId) => {
    if (socket) {
      socket.emit('mark_viewed', messageId);
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, attachment: null, viewed: true } : m));
    }
  };

  // --- RENDER AUTH SCREEN ---
  if (!token) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <Lock size={48} color="var(--wa-teal-light)" />
            <h2 style={{ marginTop: '10px', color: 'var(--wa-teal-dark)' }}>CryptoChat</h2>
            <p style={{ color: 'var(--wa-text-secondary)' }}>Sign in to continue</p>
          </div>
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {authError && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{authError}</div>}
            
            <input 
              type="text" 
              placeholder="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
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

  // --- RENDER SECURITY UNLOCK SCREEN ---
  if (token && !isUnlocked) {
    const isNative = Capacitor.isNativePlatform();

    const handleBiometricUnlock = async () => {
      try {
        const result = await NativeBiometric.verifyIdentity({
          reason: "Unlock CryptoChat",
          title: "Verify Identity"
        });
        if (result) setIsUnlocked(true);
      } catch (e) {
        console.error('Biometric error:', e);
      }
    };

    const handlePinSubmit = (e) => {
      e.preventDefault();
      setPinError('');
      if (pinMode === 'create') {
        if (pinInput.length < 4) {
          setPinError('PIN must be at least 4 digits');
          return;
        }
        localStorage.setItem('appPin', pinInput);
        setIsUnlocked(true);
      } else {
        if (pinInput === localStorage.getItem('appPin')) {
          setIsUnlocked(true);
        } else {
          setPinError('Incorrect PIN');
          setPinInput('');
        }
      }
    };

    // Auto-prompt biometric on mount if native
    useEffect(() => {
      if (isNative) {
        handleBiometricUnlock();
      } else {
        if (!localStorage.getItem('appPin')) setPinMode('create');
      }
    }, [isNative]);

    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '350px', textAlign: 'center' }}>
          {isNative ? (
            <>
              <Fingerprint size={64} color="var(--wa-teal-dark)" style={{ margin: '0 auto 20px' }} />
              <h2 style={{ color: 'var(--wa-teal-dark)' }}>App Locked</h2>
              <p style={{ color: 'var(--wa-text-secondary)', marginBottom: '30px' }}>Verify your identity to read messages.</p>
              <button 
                onClick={handleBiometricUnlock}
                style={{ background: 'var(--wa-teal-light)', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Unlock with Biometrics
              </button>
            </>
          ) : (
            <>
              <KeyRound size={64} color="var(--wa-teal-dark)" style={{ margin: '0 auto 20px' }} />
              <h2 style={{ color: 'var(--wa-teal-dark)' }}>{pinMode === 'create' ? 'Create a PIN' : 'App Locked'}</h2>
              <p style={{ color: 'var(--wa-text-secondary)', marginBottom: '30px' }}>
                {pinMode === 'create' ? 'Set a 4-digit PIN to secure your X-Ray lens on this device.' : 'Enter your 4-digit PIN to unlock.'}
              </p>
              <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {pinError && <div style={{ color: 'red', fontSize: '14px' }}>{pinError}</div>}
                <input 
                  type="password" 
                  placeholder="Enter PIN" 
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0,4))}
                  style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '24px', textAlign: 'center', letterSpacing: '8px' }}
                  required
                />
                <button type="submit" style={{ background: 'var(--wa-teal-light)', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {pinMode === 'create' ? 'Save PIN & Unlock' : 'Unlock'}
                </button>
              </form>
            </>
          )}
          <div style={{ marginTop: '30px' }}>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline' }}>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP ---
  const displayedUsers = isSearching 
    ? allUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className={`sidebar ${activeChat ? 'mobile-hidden' : ''}`}>
        <div className="sidebar-header" style={{ justifyContent: 'space-between', flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="chat-avatar" style={{ width: 40, height: 40, background: '#cbd5e1', margin: 0 }}>
                <User size={20} />
              </div>
              <span style={{ fontWeight: 'bold' }}>{user?.username}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={() => { setIsSearching(!isSearching); setSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-teal-dark)' }}>
                {isSearching ? <X size={20} /> : <Search size={20} />}
              </button>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--wa-teal-dark)', cursor: 'pointer', fontSize: '14px' }}>
                Logout
              </button>
            </div>
          </div>
          {isSearching && (
            <input 
              type="text" 
              placeholder="Search all users..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}
            />
          )}
        </div>
        
        <div className="sidebar-chats">
          {displayedUsers.map(u => (
            <div 
              key={u._id} 
              className="chat-item" 
              style={{ background: activeChat?._id === u._id ? '#f5f6f6' : 'transparent' }}
              onClick={() => setActiveChat(u)}
            >
              <div className="chat-avatar" style={{ margin: 0, marginRight: 16 }}>
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500, fontSize: '16px' }}>{u.username}</span>
                  <span style={{ fontSize: '12px', color: u.isOnline ? '#25D366' : 'var(--wa-text-secondary)' }}>
                    {u.isOnline ? 'online' : 'offline'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--wa-text-secondary)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.status}
                </div>
              </div>
            </div>
          ))}
          {displayedUsers.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--wa-text-secondary)' }}>
              {isSearching ? 'No users found.' : 'No recent chats. Click the search icon to find someone!'}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className={`chat-panel ${!activeChat ? 'mobile-hidden' : ''}`}>
        {activeChat ? (
          <>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button 
                  className="mobile-only-btn" 
                  onClick={() => setActiveChat(null)} 
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--wa-teal-dark)', display: 'none' }}
                >
                  ←
                </button>
                <div className="panel-title">
                  <div className="chat-avatar" style={{ width: 40, height: 40, margin: 0 }}>
                    {activeChat.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '16px' }}>{activeChat.username}</span>
                    <span className="status-indicator">
                      {activeChat.isOnline ? 'online' : 'offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <ChatBox 
              messages={messages.filter(m => 
                (m.senderId === user?.id && m.receiverId === activeChat._id) || 
                (m.senderId === activeChat._id && m.receiverId === user?.id)
              )} 
              currentUserId={user?.id} 
              onMarkViewed={handleMarkViewed}
            />
            
            <MessageInput 
              onSendMessage={handleSendMessage} 
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--wa-text-secondary)', background: '#f0f2f5' }}>
            <ArrowRight size={48} style={{ marginBottom: '20px', color: '#cbd5e1' }} />
            <h2>CryptoChat for Windows</h2>
            <p>Select a user from the sidebar to start a secure, encrypted conversation.</p>
          </div>
        )}
      </div>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', zIndex: 9999, 
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: 'white', padding: '40px', borderRadius: '12px', 
            maxWidth: '500px', textAlign: 'center', margin: '20px'
          }}>
            <h2 style={{ color: 'var(--wa-teal-dark)', marginBottom: '20px' }}>Welcome to CryptoChat!</h2>
            <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
              Your messages are protected by military-grade encryption. To keep them safe from prying eyes, they appear as scrambled gibberish by default.
            </p>
            <div style={{ background: '#f0f2f5', padding: '20px', borderRadius: '8px', marginBottom: '30px', textAlign: 'left' }}>
              <div style={{ marginBottom: '10px' }}><strong>How to read messages:</strong></div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '10px' }}><strong>Desktop:</strong> Hold down the <kbd>SHIFT</kbd> key while hovering over a message.</li>
                <li><strong>Mobile:</strong> Long-press on a message to decode it.</li>
              </ul>
            </div>
            <button 
              onClick={() => setShowTutorial(false)}
              style={{
                background: 'var(--wa-teal-light)', color: 'white', border: 'none', 
                padding: '12px 30px', borderRadius: '24px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
