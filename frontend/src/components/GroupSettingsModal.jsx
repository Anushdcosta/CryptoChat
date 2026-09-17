import React, { useState } from 'react';
import { X, UserPlus, UserMinus } from 'lucide-react';

export default function GroupSettingsModal({ room, users, currentUserId, onClose, onAddMember, onRemoveMember }) {
  const [search, setSearch] = useState('');

  const members = users.filter(u => room.members && room.members.includes(u._id));
  const nonMembers = users.filter(u => room.members && !room.members.includes(u._id) && u._id !== currentUserId);
  const filteredNonMembers = nonMembers.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', background: 'var(--wa-teal-dark)', color: 'white', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>←</button>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Group Info</h2>
      </div>

      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#ccc', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#fff' }}>
            {room.username.charAt(0).toUpperCase()}
          </div>
          <h2>{room.username}</h2>
          <p style={{ color: 'var(--wa-text-secondary)' }}>Group · {room.members ? room.members.length : 0} members</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--wa-teal-dark)', marginBottom: '15px' }}>{members.length} Members</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {members.map(m => (
              <div key={m._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    {m.avatar ? <img src={m.avatar} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : m.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 500 }}>{m._id === currentUserId ? 'You' : m.username}</span>
                </div>
                {m._id !== currentUserId && (
                  <button onClick={() => onRemoveMember(room._id, m._id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                    <UserMinus size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--wa-teal-dark)', marginBottom: '15px' }}>Add Participants</h3>
          <input 
            type="text" 
            placeholder="Search friends..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredNonMembers.map(m => (
              <div key={m._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    {m.avatar ? <img src={m.avatar} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : m.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 500 }}>{m.username}</span>
                </div>
                <button onClick={() => onAddMember(room._id, m._id)} style={{ background: 'none', border: 'none', color: 'var(--wa-teal-light)', cursor: 'pointer', padding: '4px' }}>
                  <UserPlus size={20} />
                </button>
              </div>
            ))}
            {filteredNonMembers.length === 0 && (
              <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>No users found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
