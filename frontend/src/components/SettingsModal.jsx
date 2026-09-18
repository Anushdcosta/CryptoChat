import React, { useState } from 'react';
import { X, Camera, Moon, Sun, Monitor, LogOut } from 'lucide-react';

export default function SettingsModal({ user, theme, setTheme, onClose, onSave, onLogout }) {
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [status, setStatus] = useState(user?.status || 'Hey there! I am using CryptoChat.');

  const handleSave = () => {
    onSave({ username, avatar, status });
    onClose();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Image is too large! Please select an image under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--wa-sidebar-bg)', width: '100%', maxWidth: '400px', borderRadius: '12px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        color: 'var(--wa-text-primary)'
      }}>
        <div style={{
          padding: '20px', background: 'var(--wa-sidebar-header)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-icon-color)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Profile Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <div 
              style={{
                width: '100px', height: '100px', borderRadius: '50%', background: '#ccc',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative'
              }}
              onClick={() => document.getElementById('avatar-upload').click()}
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={40} color="#fff" />
              )}
              <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '10px', textAlign: 'center', padding: '4px 0' }}>
                CHANGE
              </div>
            </div>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleImageUpload} 
            />
            
            <div style={{ width: '100%' }}>
              <label style={{ fontSize: '12px', color: 'var(--wa-teal-light)', fontWeight: 'bold' }}>Your Name</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: '100%', border: 'none', borderBottom: '2px solid var(--wa-teal-light)',
                  padding: '8px 0', fontSize: '16px', outline: 'none', background: 'transparent',
                  color: 'var(--wa-text-primary)'
                }}
              />
            </div>


            <div style={{ width: '100%' }}>
              <label style={{ fontSize: '12px', color: 'var(--wa-teal-light)', fontWeight: 'bold' }}>Status</label>
              <input 
                type="text" 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                style={{
                  width: '100%', border: 'none', borderBottom: '2px solid var(--wa-teal-light)',
                  padding: '8px 0', fontSize: '16px', outline: 'none', background: 'transparent',
                  color: 'var(--wa-text-primary)'
                }}
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--wa-border)' }} />

          {/* Theme Section */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--wa-teal-light)', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Theme</label>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button 
                onClick={() => setTheme('light')}
                style={{ 
                  flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                  background: theme === 'light' ? 'var(--wa-chat-hover)' : 'transparent',
                  border: '1px solid var(--wa-border)', borderRadius: '8px 0 0 8px', cursor: 'pointer', color: 'var(--wa-text-primary)'
                }}
              >
                <Sun size={20} /> Light
              </button>
              <button 
                onClick={() => setTheme('dark')}
                style={{ 
                  flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                  background: theme === 'dark' ? 'var(--wa-chat-hover)' : 'transparent',
                  border: '1px solid var(--wa-border)', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', color: 'var(--wa-text-primary)'
                }}
              >
                <Moon size={20} /> Dark
              </button>
              <button 
                onClick={() => setTheme('system')}
                style={{ 
                  flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                  background: theme === 'system' ? 'var(--wa-chat-hover)' : 'transparent',
                  border: '1px solid var(--wa-border)', borderRadius: '0 8px 8px 0', cursor: 'pointer', color: 'var(--wa-text-primary)'
                }}
              >
                <Monitor size={20} /> System
              </button>
            </div>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--wa-border)' }} />

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <button 
              onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'
              }}
            >
              <LogOut size={20} /> Logout
            </button>

            <button 
              onClick={handleSave}
              style={{
                background: 'var(--wa-teal-light)', color: '#fff', border: 'none',
                padding: '10px 24px', borderRadius: '24px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              Save
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
