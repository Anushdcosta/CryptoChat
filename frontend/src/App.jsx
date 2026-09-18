import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, ArrowRight, Search, X, Users, Plus, MessageSquarePlus, MoreVertical } from 'lucide-react';
import { requestNotificationPermissions, showNotification } from './utils/NotificationUtils';
import SidebarContextMenu from './components/SidebarContextMenu';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import ChatBox from './components/ChatBox';
import MessageInput from './components/MessageInput';
import GroupModal from './components/GroupModal';
import SettingsModal from './components/SettingsModal';
import GroupSettingsModal from './components/GroupSettingsModal';
import Login from './components/Login';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, orderBy, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [remoteRooms, setRemoteRooms] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sidebarContextMenu, setSidebarContextMenu] = useState(null); // { x, y, chat }

  useEffect(() => {
    const handleGlobalClick = () => setSidebarContextMenu(null);
    if (sidebarContextMenu) {
      window.addEventListener('click', handleGlobalClick);
    }
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [sidebarContextMenu]);

  const handleSidebarAction = async (chat, action) => {
    if (chat.isGroup) return; // For now, only DMs
    const threadId = [user._id, chat._id].sort().join('_');
    await setDoc(doc(db, 'threads', threadId), {
      states: { [user._id]: action }
    }, { merge: true });
  };
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // AdMob Initialization
  useEffect(() => {
    const initAdMob = async () => {
      if (Capacitor.isNativePlatform()) {
        await AdMob.initialize({ requestTrackingAuthorization: true });
        
        await AdMob.showBanner({
          adId: 'ca-app-pub-9481773492516595/9400171776',
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.TOP_CENTER,
          margin: 0,
          isTesting: true,
        });
      }
    };
    initAdMob();
    
    return () => {
      if (Capacitor.isNativePlatform()) {
        AdMob.hideBanner().catch(() => {});
      }
    };
  }, []);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          let userData = {
            _id: firebaseUser.uid,
            email: firebaseUser.email || firebaseUser.phoneNumber,
            isOnline: true,
            lastSeen: Date.now(),
          };

          if (userDoc.exists()) {
            userData = { ...userDoc.data(), ...userData };
          } else {
            userData.username = firebaseUser.displayName || 'New User';
            userData.avatar = firebaseUser.photoURL || '';
            userData.status = 'Hey there! I am using CryptoChat.';
          }

          await setDoc(userRef, userData, { merge: true });
          setUser(userData);
          
          if (!localStorage.getItem('hasSeenTutorial')) {
            setShowTutorial(true);
            localStorage.setItem('hasSeenTutorial', 'true');
          }
          requestNotificationPermissions();
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        setAuthError(err.message || 'An unknown error occurred during login.');
        setUser(null); // fallback
      } finally {
        setAuthResolved(true);
      }
    });
    
    // Set offline on unload
    const handleUnload = () => {
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), { isOnline: false, lastSeen: Date.now() });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    
    // Heartbeat for online status
    const heartbeatInterval = setInterval(() => {
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), { lastSeen: Date.now(), isOnline: true }).catch(() => {});
      }
    }, 60000);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // 2. Fetch Users
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uData = [];
      snapshot.forEach(d => {
        if (d.id !== user._id) uData.push({ _id: d.id, ...d.data() });
      });
      setRemoteUsers(uData);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Fetch Rooms
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'rooms'), where('members', 'array-contains', user._id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rData = [];
      snapshot.forEach(d => {
        rData.push({ 
          _id: d.id, 
          username: d.data().name,
          isGroup: true,
          isOnline: true,
          status: `${d.data().members.length} members`,
          ...d.data() 
        });
      });
      setRemoteRooms(rData);
    });
    return () => unsubscribe();
  }, [user]);

  // 4. Fetch Messages for Active Chat
  useEffect(() => {
    if (!user || !activeChat) return;
    let q;
    if (activeChat.isGroup) {
      q = query(collection(db, 'messages'), where('roomId', '==', activeChat._id));
    } else {
      const threadId = [user._id, activeChat._id].sort().join('_');
      q = query(collection(db, 'messages'), where('threadId', '==', threadId));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(d => msgs.push({ _id: d.id, ...d.data() }));
      
      // Sort in memory to avoid needing Firestore composite indexes
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      
      setMessages(msgs);
      
      // Mark read
      msgs.forEach(m => {
        if (m.receiverId === user._id && !m.read) {
          updateDoc(doc(db, 'messages', m._id), { read: true });
        }
      });
    });
    return () => unsubscribe();
  }, [activeChat, user]);

  // 5. Global Notification Listeners
  const activeChatRef = useRef(activeChat);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const remoteRoomsRef = useRef(remoteRooms);
  useEffect(() => { remoteRoomsRef.current = remoteRooms; }, [remoteRooms]);

  useEffect(() => {
    if (!user) return;
    const appStartTime = Date.now();
    
    // Listen to ALL new messages globally (0 documents on mount)
    const qGlobal = query(collection(db, 'messages'), where('createdAt', '>', appStartTime));
    
    const unsubGlobal = onSnapshot(qGlobal, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          if (msg.senderId === user._id) return; // Ignore own messages
          
          if (msg.roomId) {
            // Group message notification
            const room = remoteRoomsRef.current.find(r => r._id === msg.roomId);
            if (room && (!activeChatRef.current || activeChatRef.current._id !== msg.roomId)) {
              showNotification(`New message in ${room.username}`, `From ${msg.senderName}`);
            }
          } else if (msg.receiverId === user._id) {
            // Direct message notification
            if (!activeChatRef.current || activeChatRef.current._id !== msg.senderId) {
              showNotification(`New message from ${msg.senderName}`, "Tap to open CryptoChat");
            }
          }
        }
      });
    });

    return () => unsubGlobal();
  }, [user]);

  // 6. Unread Message Counter for DMs
  useEffect(() => {
    if (!user) return;
    const qUnread = query(
      collection(db, 'messages'), 
      where('receiverId', '==', user._id), 
      where('read', '==', false)
    );
    const unsub = onSnapshot(qUnread, (snapshot) => {
      const counts = {};
      snapshot.forEach(d => {
        const sender = d.data().senderId;
        counts[sender] = (counts[sender] || 0) + 1;
      });
      setUnreadCounts(counts);
    });
    return () => unsub();
  }, [user]);

  // 7. Fetch Threads for Chat States (Primary, General, Request, Archived)
  const [threads, setThreads] = useState({});
  useEffect(() => {
    if (!user) return;
    const qThreads = query(collection(db, 'threads'), where('members', 'array-contains', user._id));
    const unsub = onSnapshot(qThreads, (snapshot) => {
      const thData = {};
      snapshot.forEach(d => {
        thData[d.id] = d.data();
      });
      setThreads(thData);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (activeChat) {
        setActiveChat(null);
      } else if (Capacitor.isNativePlatform() && !canGoBack) {
        CapacitorApp.exitApp();
      } else {
        window.history.back();
      }
    });

    // Remove the initial splash loader if it exists
    const loader = document.getElementById('initial-loader');
    if (loader) loader.remove();

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [activeChat]);

  // 5. Theme Listener
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    if (user) {
      await updateDoc(doc(db, 'users', user._id), { isOnline: false, lastSeen: Date.now() });
    }
    await signOut(auth);
  };

  const handleSendMessage = async (data) => {
    if (!user || !activeChat) return;
    
    const msgData = {
      senderId: user._id,
      senderName: user.username,
      plainText: data.plainText,
      scrambledText: data.scrambledText,
      attachment: data.attachment || null,
      replyTo: replyingToMessage ? replyingToMessage._id : null,
      createdAt: Date.now(),
      read: false,
      viewed: false,
      reactions: []
    };

    if (activeChat.isGroup) {
      msgData.roomId = activeChat._id;
    } else {
      const threadId = [user._id, activeChat._id].sort().join('_');
      msgData.receiverId = activeChat._id;
      msgData.threadId = threadId;
      
      if (!threads[threadId]) {
        await setDoc(doc(db, 'threads', threadId), {
          members: [user._id, activeChat._id],
          states: {
            [user._id]: 'primary',
            [activeChat._id]: 'request'
          },
          createdAt: Date.now()
        });
      } else {
        // If thread exists but current user has no state, implicitly accept to primary
        if (!threads[threadId].states[user._id] || threads[threadId].states[user._id] === 'request') {
          await setDoc(doc(db, 'threads', threadId), {
            states: { [user._id]: 'primary' }
          }, { merge: true });
        }
      }
    }

    await addDoc(collection(db, 'messages'), msgData);
    setReplyingToMessage(null);
  };

  const handleMarkViewed = async (messageId) => {
    await updateDoc(doc(db, 'messages', messageId), { viewed: true, attachment: null });
  };

  const handleDeleteMessage = async (messageId) => {
    await deleteDoc(doc(db, 'messages', messageId));
  };

  const handleCreateGroup = async (name, members) => {
    await addDoc(collection(db, 'rooms'), {
      name,
      members: [...members, user._id],
      createdAt: serverTimestamp()
    });
    setShowGroupModal(false);
  };

  const handleReact = async (messageId, emoji) => {
    const msg = messages.find(m => m._id === messageId);
    if (!msg) return;
    const newReactions = msg.reactions ? [...msg.reactions] : [];
    const idx = newReactions.findIndex(r => r.userId === user._id);
    if (idx >= 0) newReactions[idx].emoji = emoji;
    else newReactions.push({ userId: user._id, emoji });
    
    await updateDoc(doc(db, 'messages', messageId), { reactions: newReactions });
  };

  const handleUpdateProfile = async (data) => {
    await updateDoc(doc(db, 'users', user._id), data);
    setUser(prev => ({ ...prev, ...data }));
  };

  if (!authResolved) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  if (authError && !user) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '15px' }}>Authentication Failed</h2>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>{authError}</p>
          <button 
            onClick={() => { setAuthError(null); setAuthResolved(false); auth.signOut(); window.location.reload(); }}
            style={{ background: 'var(--wa-teal-light)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const checkIsOnline = (u) => {
    if (u.isGroup) return true;
    if (!u.isOnline) return false;
    if (u.lastSeen && (Date.now() - u.lastSeen > 120000)) return false;
    return true;
  };

  const allChats = [...remoteRooms, ...remoteUsers];
  const [activeTab, setActiveTab] = useState('Primary'); // 'Primary', 'General', 'Requests', 'Archived'

  const displayedUsers = isSearching 
    ? [...remoteRooms, ...remoteUsers].filter(u => u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : [...remoteRooms, ...remoteUsers].filter(u => {
        if (u.isGroup) {
          return activeTab === 'Primary';
        } else {
          const threadId = [user._id, u._id].sort().join('_');
          const thread = threads[threadId];
          if (!thread) return false;
          
          const state = thread.states[user._id] || 'request';
          if (activeTab === 'Primary') return state === 'primary';
          if (activeTab === 'General') return state === 'general';
          if (activeTab === 'Requests') return state === 'request';
          if (activeTab === 'Archived') return state === 'archived';
          return false;
        }
      });

  return (
    <div className="app-container" style={{ paddingTop: Capacitor.isNativePlatform() ? '50px' : '0' }}>
      {/* Sidebar */}
      <div className={`sidebar ${activeChat ? 'mobile-hidden' : ''}`}>
        <div className="sidebar-header" style={{ justifyContent: 'space-between', flexDirection: 'column', gap: '12px', alignItems: 'stretch', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div 
              className="chat-avatar" 
              style={{ width: 40, height: 40, background: '#cbd5e1', margin: 0, overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => setShowSettingsModal(true)}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <button onClick={() => setShowGroupModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-icon-color)' }}>
                <MessageSquarePlus size={20} />
              </button>
              <button onClick={() => setShowSettingsModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-icon-color)' }}>
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--wa-icon-color)' }}>
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search or start a new chat" 
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearching(e.target.value.length > 0);
              }}
              style={{ 
                padding: '8px 12px 8px 40px', borderRadius: '8px', border: 'none', 
                width: '100%', boxSizing: 'border-box', background: 'var(--wa-search-bg)',
                color: 'var(--wa-text-primary)', outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {['Primary', 'General', 'Requests'].map(tab => (
              <div 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? '600' : 'normal',
                  color: activeTab === tab ? 'var(--wa-teal-light)' : 'var(--wa-text-secondary)',
                  borderBottom: activeTab === tab ? '2px solid var(--wa-teal-light)' : '2px solid transparent',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>
        
        <div className="sidebar-chats">
          {activeTab === 'Primary' && Object.values(threads).some(t => t.states[user._id] === 'archived') && !isSearching && (
            <div 
              className="chat-item" 
              onClick={() => setActiveTab('Archived')}
              style={{ borderBottom: '1px solid var(--wa-border)' }}
            >
              <div className="chat-avatar" style={{ background: 'var(--wa-icon-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, marginRight: 16 }}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
              </div>
              <div style={{ flex: 1, fontWeight: '600' }}>Archived Chats</div>
            </div>
          )}
          {displayedUsers.map(u => {
            let threadState = 'primary';
            if (!u.isGroup) {
              const threadId = [user._id, u._id].sort().join('_');
              threadState = threads[threadId]?.states[user._id] || 'request';
            }
            return (
              <div 
                key={u._id} 
                className="chat-item" 
                style={{ background: activeChat?._id === u._id ? 'var(--wa-chat-hover)' : 'transparent' }}
                onClick={() => setActiveChat(u)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!u.isGroup) {
                    setSidebarContextMenu({ x: e.clientX, y: e.clientY, chat: u, state: threadState });
                  }
                }}
              >
              <div className="chat-avatar" style={{ margin: 0, marginRight: 16, overflow: 'hidden' }}>
                {u.isGroup ? <Users size={20} color="#fff" /> : (u.avatar ? <img src={u.avatar} alt="" referrerPolicy="no-referrer" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : u.username.charAt(0).toUpperCase())}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: '500', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</span>
                  <span style={{ fontSize: '12px', color: checkIsOnline(u) ? 'var(--wa-teal-light)' : 'var(--wa-text-secondary)', marginLeft: '10px', flexShrink: 0 }}>
                    {checkIsOnline(u) ? 'online' : (u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--wa-text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.status}
                  </div>
                  {unreadCounts[u._id] > 0 && (
                    <div style={{ background: 'var(--wa-teal-light)', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px', marginLeft: '8px' }}>
                      {unreadCounts[u._id]}
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
      
      {sidebarContextMenu && (
        <SidebarContextMenu 
          x={sidebarContextMenu.x} 
          y={sidebarContextMenu.y} 
          chat={sidebarContextMenu.chat} 
          currentState={sidebarContextMenu.state}
          onClose={() => setSidebarContextMenu(null)}
          onAction={handleSidebarAction}
        />
      )}

      {showGroupModal && (
        <GroupModal 
          users={remoteUsers} 
          currentUserId={user?._id} 
          onClose={() => setShowGroupModal(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {showSettingsModal && (
        <SettingsModal 
          user={user}
          theme={theme}
          setTheme={setTheme}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleUpdateProfile}
          onLogout={handleLogout}
        />
      )}

      {showGroupSettingsModal && activeChat && activeChat.isGroup && (
        <GroupSettingsModal 
          room={activeChat}
          users={remoteUsers}
          currentUserId={user?._id}
          onClose={() => setShowGroupSettingsModal(false)}
          onAddMember={async (roomId, userId) => {
            await updateDoc(doc(db, 'rooms', roomId), { members: [...activeChat.members, userId] });
          }}
          onRemoveMember={async (roomId, userId) => {
            await updateDoc(doc(db, 'rooms', roomId), { members: activeChat.members.filter(id => id !== userId) });
          }}
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
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--wa-icon-color)', display: 'none' }}
                >
                  ←
                </button>
                <div className="panel-title" style={{ cursor: activeChat.isGroup ? 'pointer' : 'default' }} onClick={() => activeChat.isGroup && setShowGroupSettingsModal(true)}>
                  <div className="chat-avatar" style={{ width: 40, height: 40, margin: 0, marginRight: 16, overflow: 'hidden' }}>
                    {activeChat.isGroup ? <Users size={20} color="#fff" /> : (activeChat.avatar ? <img src={activeChat.avatar} alt="" referrerPolicy="no-referrer" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : activeChat.username.charAt(0).toUpperCase())}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{activeChat.username}</span>
                    <span className="status-indicator" style={{ color: 'var(--wa-text-secondary)', fontSize: '13px' }}>
                      {activeChat.isGroup ? activeChat.status : (checkIsOnline(activeChat) ? 'online' : `last seen ${activeChat.lastSeen ? new Date(activeChat.lastSeen).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'offline'}`)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <ChatBox 
              messages={messages} 
              currentUserId={user?._id} 
              onMarkViewed={handleMarkViewed}
              onDeleteMessage={handleDeleteMessage}
              onReply={setReplyingToMessage}
              onReact={handleReact}
              isGroupChat={activeChat.isGroup}
            />
            
            {(!activeChat.isGroup && threads[[user._id, activeChat._id].sort().join('_')]?.states[user._id] === 'request') ? (
              <div style={{ padding: '16px', background: 'var(--wa-sidebar-bg)', display: 'flex', justifyContent: 'center', gap: '16px', borderTop: '1px solid var(--wa-border)' }}>
                 <button 
                   onClick={() => handleSidebarAction(activeChat, 'primary')}
                   style={{ padding: '10px 24px', background: 'var(--wa-teal-light)', color: '#fff', border: 'none', borderRadius: '24px', cursor: 'pointer', fontWeight: 'bold' }}
                 >
                   Accept
                 </button>
                 <button 
                   onClick={() => handleSidebarAction(activeChat, 'declined')}
                   style={{ padding: '10px 24px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '24px', cursor: 'pointer', fontWeight: 'bold' }}
                 >
                   Decline
                 </button>
              </div>
            ) : (
              <MessageInput 
                onSendMessage={handleSendMessage} 
                onTyping={() => {}}
                onStopTyping={() => {}}
                replyingToMessage={replyingToMessage}
                onCancelReply={() => setReplyingToMessage(null)}
              />
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--wa-text-secondary)', background: '#f0f2f5' }}>
            <ArrowRight size={48} style={{ marginBottom: '20px', color: '#cbd5e1' }} />
            <h2>CryptoChat for Windows</h2>
            <p>Select a user from the sidebar to start a secure, encrypted conversation.</p>
          </div>
        )}
      </div>

      {showTutorial && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', zIndex: 9999, 
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: 'white', padding: '40px', borderRadius: '12px', 
            maxWidth: '500px', textAlign: 'center', margin: '20px', color: '#111b21'
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
