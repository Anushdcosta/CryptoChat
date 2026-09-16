import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import ChatBox from './components/ChatBox';
import MessageInput from './components/MessageInput';
import { User, Lock, ArrowRight } from 'lucide-react';

const SOCKET_URL = 'https://cryptochat-s5bf.onrender.com';

export default function App() {
  // Auth State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  
  // App State
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Auth Forms
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

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
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    if (socket) socket.disconnect();
  };

  // Fetch Users
  useEffect(() => {
    if (!token) return;
    
    fetch(`${SOCKET_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  }, [token]);

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
    });

    newSocket.on('user_status_change', (data) => {
      setUsers(prev => prev.map(u => 
        u._id === data.userId ? { ...u, isOnline: data.isOnline } : u
      ));
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

  // --- RENDER MAIN APP ---
  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="chat-avatar" style={{ width: 40, height: 40, background: '#cbd5e1', margin: 0 }}>
              <User size={20} />
            </div>
            <span style={{ fontWeight: 'bold' }}>{user?.username}</span>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--wa-teal-dark)', cursor: 'pointer', fontSize: '14px' }}>
            Logout
          </button>
        </div>
        
        <div className="sidebar-chats">
          {users.map(u => (
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
          {users.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--wa-text-secondary)' }}>
              No other users registered yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="chat-panel">
        {activeChat ? (
          <>
            <div className="panel-header">
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
            
            <ChatBox 
              messages={messages.filter(m => 
                (m.senderId === user?.id && m.receiverId === activeChat._id) || 
                (m.senderId === activeChat._id && m.receiverId === user?.id)
              )} 
              currentUserId={user?.id} 
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
    </div>
  );
}
