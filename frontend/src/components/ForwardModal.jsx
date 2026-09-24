import React, { useState } from 'react';
import { Search, X, Users } from 'lucide-react';

export default function ForwardModal({ onClose, onForward, activeChats }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filterChats = activeChats.filter(chat => 
    chat.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--wa-bg)', width: '90%', maxWidth: '400px', borderRadius: '12px',
        display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflow: 'hidden'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--wa-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--wa-text-primary)' }}>Forward Message to...</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--wa-text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '12px', borderBottom: '1px solid var(--wa-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--wa-sidebar-bg)', padding: '8px 12px', borderRadius: '8px' }}>
            <Search size={18} color="var(--wa-text-secondary)" />
            <input 
              type="text" 
              placeholder="Search chats..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '8px', width: '100%', color: 'var(--wa-text-primary)' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filterChats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--wa-text-secondary)' }}>No chats found.</div>
          ) : (
            filterChats.map(chat => (
              <div 
                key={chat._id}
                onClick={() => { onForward(chat); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--wa-border)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--wa-chat-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--wa-teal-light)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', overflow: 'hidden', flexShrink: 0 }}>
                  {chat.isGroup ? <Users size={20} color="#fff" /> : (chat.avatar ? <img src={chat.avatar} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : chat.username?.charAt(0).toUpperCase())}
                </div>
                <div style={{ flex: 1, color: 'var(--wa-text-primary)', fontWeight: '500' }}>
                  {chat.isGroup ? chat.name : chat.username}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
