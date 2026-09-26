import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function GroupModal({ users, currentUserId, onClose, onCreate }) {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const toggleUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    onCreate(groupName, selectedUsers);
  };

  const availableUsers = users.filter(u => !u.isGroup && u._id !== currentUserId);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--wa-sidebar-bg)', color: 'var(--wa-text-primary)', borderRadius: '8px', padding: '20px', width: '90%', maxWidth: '400px',
        display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>New Group</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-text-primary)' }}><X /></button>
        </div>
        
        <input 
          type="text" 
          placeholder="Group Name" 
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--wa-border)', fontSize: '16px', background: 'var(--wa-bg)', color: 'var(--wa-text-primary)' }}
        />
        
        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {availableUsers.map(u => (
            <div 
              key={u._id}
              onClick={() => toggleUser(u._id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '8px',
                borderRadius: '4px', background: selectedUsers.includes(u._id) ? 'var(--wa-bubble-sent)' : 'var(--wa-search-bg)',
                cursor: 'pointer'
              }}
            >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid var(--wa-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
                  {selectedUsers.includes(u._id) && <Check size={14} color="var(--wa-teal-light)" />}
                </div>
                <span>{u.username}</span>
            </div>
          ))}
        </div>
        
        <button 
          onClick={handleCreate}
          disabled={!groupName.trim() || selectedUsers.length === 0}
          style={{
            padding: '12px', background: 'var(--wa-teal-light)', color: 'white', border: 'none',
            borderRadius: '4px', cursor: (!groupName.trim() || selectedUsers.length === 0) ? 'not-allowed' : 'pointer',
            opacity: (!groupName.trim() || selectedUsers.length === 0) ? 0.5 : 1
          }}
        >
          Create Group
        </button>
      </div>
    </div>
  );
}
