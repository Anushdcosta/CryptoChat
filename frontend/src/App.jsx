import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, ArrowRight, Search, X, Users, Plus } from 'lucide-react';
import { requestNotificationPermissions, showNotification } from './utils/NotificationUtils';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import ChatBox from './components/ChatBox';
import MessageInput from './components/MessageInput';
import GroupModal from './components/GroupModal';
import ProfileModal from './components/ProfileModal';
import GroupSettingsModal from './components/GroupSettingsModal';
import Login from './components/Login';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, query, where, orderBy, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
  
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [remoteRooms, setRemoteRooms] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
      setAuthResolved(true);
    });
    
    // Set offline on unload
    const handleUnload = () => {
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), { isOnline: false, lastSeen: Date.now() });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
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
      q = query(collection(db, 'messages'), where('roomId', '==', activeChat._id), orderBy('createdAt', 'asc'));
    } else {
      const threadId = [user._id, activeChat._id].sort().join('_');
      q = query(collection(db, 'messages'), where('threadId', '==', threadId), orderBy('createdAt', 'asc'));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(d => msgs.push({ _id: d.id, ...d.data() }));
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

  useEffect(() => {
    CapacitorApp.addListener('backButton', () => {
      if (activeChat) setActiveChat(null);
      else CapacitorApp.exitApp();
    });
    return () => CapacitorApp.removeAllListeners();
  }, [activeChat]);

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
      msgData.receiverId = activeChat._id;
      msgData.threadId = [user._id, activeChat._id].sort().join('_');
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

  if (!user) {
    return <Login />;
  }

  const allChats = [...remoteRooms, ...remoteUsers];
  const displayedUsers = isSearching 
    ? allChats.filter(u => u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : allChats;

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--wa-text-secondary)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showGroupModal && (
        <GroupModal 
          users={remoteUsers} 
          currentUserId={user?._id} 
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
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--wa-teal-dark)', display: 'none' }}
                >
                  ←
                </button>
                <div className="panel-title" style={{ cursor: activeChat.isGroup ? 'pointer' : 'default' }} onClick={() => activeChat.isGroup && setShowGroupSettingsModal(true)}>
                  <div className="chat-avatar" style={{ width: 40, height: 40, margin: 0, marginRight: 16, overflow: 'hidden' }}>
                    {activeChat.isGroup ? <Users size={20} color="#fff" /> : (activeChat.avatar ? <img src={activeChat.avatar} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : activeChat.username.charAt(0).toUpperCase())}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{activeChat.username}</span>
                    <span className="status-indicator" style={{ color: 'var(--wa-text-secondary)', fontSize: '13px' }}>
                      {activeChat.isGroup ? activeChat.status : (activeChat.isOnline ? 'online' : `last seen ${activeChat.lastSeen ? new Date(activeChat.lastSeen).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'offline'}`)}
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
            
            <MessageInput 
              onSendMessage={handleSendMessage} 
              onTyping={() => {}}
              onStopTyping={() => {}}
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
