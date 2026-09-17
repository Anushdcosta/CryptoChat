import React, { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';

export default function ProfileModal({ user, onClose, onSave }) {
  const [status, setStatus] = useState(user.status || '');
  const [avatar, setAvatar] = useState(user.avatar || null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1 * 1024 * 1024) {
      alert("Please select an image smaller than 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatar(event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = null; 
  };

  const handleSave = async () => {
    setLoading(true);
    await onSave({ avatar, status });
    setLoading(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff', borderRadius: '8px', padding: '20px', width: '90%', maxWidth: '400px',
        display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
        </div>
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            width: '120px', height: '120px', borderRadius: '50%', background: '#cbd5e1', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            overflow: 'hidden', position: 'relative'
          }}
        >
          {avatar ? (
            <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '48px', color: '#fff' }}>{user.username.charAt(0).toUpperCase()}</span>
          )}
          <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '4px', display: 'flex', color: 'white' }}>
            <Camera size={16} />
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleFileChange} 
        />

        <div style={{ width: '100%' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Status (About me)</label>
          <input 
            type="text" 
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        
        <button 
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '12px', background: 'var(--wa-teal-light)', color: 'white', border: 'none',
            borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', width: '100%',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
