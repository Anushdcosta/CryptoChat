import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { User, Lock, ArrowRight, Search, X, Users, Plus } from 'lucide-react';
import { requestNotificationPermissions, showNotification } from './utils/NotificationUtils';
import { Capacitor } from '@capacitor/core';
import ChatBox from './components/ChatBox';
import MessageInput from './components/MessageInput';
import GroupModal from './components/GroupModal';
import ProfileModal from './components/ProfileModal';

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
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Typing State
  const [typingUsers, setTypingUsers] = useState({});

  // Advanced Features State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);

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
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    if (socket) socket.disconnect();
  };

  // Fetch Users
  useEffect(() => {
    if (!token) return;
    
    fetch(`${SOCKET_URL}/api/users/recent`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) { handleLogout(); throw new Error('Unauthorized'); }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
        else console.error('Failed to load recent users:', data);
      })
      .catch(err => console.error(err));
  }, [token]);

  // Fetch All Users for Search
  useEffect(() => {
    if (!token || !isSearching) return;
    
    fetch(`${SOCKET_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) { handleLogout(); throw new Error('Unauthorized'); }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setAllUsers(data);
        else console.error('Failed to load all users:', data);
      })
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

    newSocket.on('typing', (data) => {
      setTypingUsers(prev => ({ ...prev, [data.senderId]: true }));
    });
    
    newSocket.on('stop_typing', (data) => {
      setTypingUsers(prev => ({ ...prev, [data.senderId]: false }));
    });

    newSocket.on('message_deleted', (messageId) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    });

    newSocket.on('messages_read', (data) => {
      setMessages(prev => prev.map(m => {
        if (m.receiverId === data.receiverId && !m.read) {
          return { ...m, read: true };
        }
        return m;
      }));
    });

    newSocket.on('group_created', (room) => {
      setUsers(prev => {
        const formattedRoom = {
          _id: room._id,
          username: room.name,
          isGroup: true,
          isOnline: true,
          status: `${room.members.length} members`
        };
        // Avoid duplicates if already exists
        if (prev.find(u => u._id === room._id)) return prev;
        return [formattedRoom, ...prev];
      });
    });

    newSocket.on('receive_group_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      
      const isBackground = document.hidden;
      const isNotActiveChat = !activeChatRef.current || activeChatRef.current._id !== msg.roomId;

      if (isBackground || isNotActiveChat) {
        showNotification('CryptoChat', `${msg.senderName} to group`);
      }
    });

    newSocket.on('message_reacted', (data) => {
      setMessages(prev => prev.map(m => {
        if (m._id === data.messageId) {
          const newReactions = m.reactions ? [...m.reactions] : [];
          const idx = newReactions.findIndex(r => r.userId === data.userId);
          if (idx >= 0) newReactions[idx].emoji = data.emoji;
          else newReactions.push({ userId: data.userId, emoji: data.emoji });
          return { ...m, reactions: newReactions };
        }
        return m;
      }));
    });

    newSocket.on('user_status_change', (data) => {
      setUsers(prev => {
        const exists = prev.find(u => u._id === data.userId);
        if (exists) {
          return prev.map(u => u._id === data.userId ? { ...u, isOnline: data.isOnline, lastSeen: data.lastSeen } : u);
        }
        // If not found in current list, we can't easily add them without username, so ignore.
        return prev;
      });
    });

    return () => newSocket.disconnect();
  }, [token]);

  // Fetch Messages when Active Chat changes
  useEffect(() => {
    if (activeChat && token) {
      fetch(`${SOCKET_URL}/api/messages/${activeChat._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error(err));
    }
  }, [activeChat, token]);

  useEffect(() => {
    if (socket && activeChat && activeChat._id) {
      socket.emit('mark_messages_read', { senderId: activeChat._id });
    }
  }, [activeChat, messages]);

  const handleSendMessage = (data) => {
    if (!socket || !activeChat) return;

    if (activeChat.isGroup) {
      socket.emit('send_group_message', {
        roomId: activeChat._id,
        plainText: data.plainText,
        scrambledText: data.scrambledText,
        attachment: data.attachment,
        replyTo: replyingToMessage ? replyingToMessage._id : null
      });
    } else {
      socket.emit('send_direct_message', {
        receiverId: activeChat._id,
        plainText: data.plainText,
        scrambledText: data.scrambledText,
        attachment: data.attachment,
        replyTo: replyingToMessage ? replyingToMessage._id : null,
        timestamp: data.timestamp
      });
    }
    
    setReplyingToMessage(null);
  };

  const handleMarkViewed = (messageId) => {
    if (socket) {
      socket.emit('mark_viewed', messageId);
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, attachment: null, viewed: true } : m));
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (socket) {
      socket.emit('delete_message', messageId);
      setMessages(prev => prev.filter(m => m._id !== messageId));
    }
  };

  const handleTyping = () => {
    if (socket && activeChat && !activeChat.isGroup) socket.emit('typing', { receiverId: activeChat._id });
  };

  const handleStopTyping = () => {
    if (socket && activeChat && !activeChat.isGroup) socket.emit('stop_typing', { receiverId: activeChat._id });
  };

  const handleCreateGroup = (name, members) => {
    if (socket) {
      socket.emit('create_group', { name, members });
      setShowGroupModal(false);
    }
  };

  const handleReplyMessage = (message) => {
    setReplyingToMessage(message);
  };

  const handleReact = (messageId, emoji) => {
    if (socket) {
      socket.emit('react_message', { messageId, emoji });
    }
  };

  const handleUpdateProfile = async (data) => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        const newUser = { id: updatedUser._id, username: updatedUser.username, avatar: updatedUser.avatar, status: updatedUser.status };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
      }
    } catch (e) {
      console.error(e);
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
  const displayedUsers = isSearching 
    ? (Array.isArray(allUsers) ? allUsers : []).filter(u => u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : (Array.isArray(users) ? users : []);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className={`sidebar ${activeChat ? 'mobile-hidden' : ''}`}>
        <div className="sidebar-header" style={{ justifyContent: 'space-between', flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                className="chat-avatar" 
                style={{ width: 40, height: 40, background: '#cbd5e1', margin: 0, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setShowProfileModal(true)}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} />
                )}
              </div>
              <span style={{ fontWeight: 'bold' }}>{user?.username}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={() => setShowGroupModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-teal-dark)' }}>
                <Plus size={20} />
              </button>
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
              <div className="chat-avatar" style={{ margin: 0, marginRight: 16, overflow: 'hidden' }}>
                {u.isGroup ? <Users size={20} color="#fff" /> : (u.avatar ? <img src={u.avatar} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : u.username.charAt(0).toUpperCase())}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500, fontSize: '16px' }}>{u.username}</span>
                  <span style={{ fontSize: '12px', color: u.isOnline ? '#25D366' : 'var(--wa-text-secondary)' }}>
                    {u.isOnline ? 'online' : (u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'offline')}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: typingUsers[u._id] ? 'var(--wa-teal-light)' : 'var(--wa-text-secondary)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: typingUsers[u._id] ? 'bold' : 'normal' }}>
                  {typingUsers[u._id] ? 'typing...' : u.status}
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

      {showGroupModal && (
        <GroupModal 
          users={usersRef.current} 
          currentUserId={user?.id} 
          onClose={() => setShowGroupModal(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {showProfileModal && (
        <ProfileModal 
          user={user}
          onClose={() => setShowProfileModal(false)}
          onSave={handleUpdateProfile}
        />
      )}

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
                  <div className="chat-avatar" style={{ width: 40, height: 40, margin: 0, marginRight: 16, overflow: 'hidden' }}>
                    {activeChat.isGroup ? <Users size={20} color="#fff" /> : (activeChat.avatar ? <img src={activeChat.avatar} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : activeChat.username.charAt(0).toUpperCase())}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{activeChat.username}</span>
                    <span className="status-indicator" style={{ color: typingUsers[activeChat._id] ? 'var(--wa-teal-light)' : 'var(--wa-text-secondary)', fontWeight: typingUsers[activeChat._id] ? 'bold' : 'normal', fontSize: '13px' }}>
                      {typingUsers[activeChat._id] ? 'typing...' : (activeChat.isGroup ? activeChat.status : (activeChat.isOnline ? 'online' : `last seen ${activeChat.lastSeen ? new Date(activeChat.lastSeen).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'offline'}`))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <ChatBox 
              messages={messages.filter(m => 
                activeChat.isGroup 
                  ? m.roomId === activeChat._id 
                  : ((m.senderId === user?.id && m.receiverId === activeChat._id) || (m.senderId === activeChat._id && m.receiverId === user?.id))
              )} 
              currentUserId={user?.id} 
              onMarkViewed={handleMarkViewed}
              onDeleteMessage={handleDeleteMessage}
              onReply={handleReplyMessage}
              onReact={handleReact}
              isGroupChat={activeChat.isGroup}
            />
            
            <MessageInput 
              onSendMessage={handleSendMessage} 
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
              replyingToMessage={replyingToMessage}
              onCancelReply={() => setReplyingToMessage(null)}
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
