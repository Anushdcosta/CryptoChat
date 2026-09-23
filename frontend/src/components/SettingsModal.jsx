import React, { useState } from 'react';
import { X, Camera, Moon, Sun, Monitor, LogOut, Upload } from 'lucide-react';
import { uploadToCloudinary } from '../utils/CloudinaryUtils';
import ImageCropperModal from './ImageCropperModal';

export default function SettingsModal({ user, theme, setTheme, accentColor, setAccentColor, wallpaper, setWallpaper, notificationsEnabled, setNotificationsEnabled, onClose, onSave, onLogout }) {
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [status, setStatus] = useState(user?.status || 'Hey there! I am using CryptoChat.');
  const [isUploading, setIsUploading] = useState(false);
  const [cropData, setCropData] = useState(null);

  const handleSave = () => {
    onSave({ username, avatar, status });
    onClose();
  };

  const processSelectedImage = (e, type, aspect) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image is too large! Please select an image under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setCropData({ imageSrc: reader.result, aspect, type });
      };
      e.target.value = null; // reset input
    }
  };

  const handleImageUpload = (e) => processSelectedImage(e, 'avatar', 1);
  const handleWallpaperUpload = (e) => processSelectedImage(e, 'wallpaper', 9 / 16);

  const handleCropComplete = async (croppedBlob) => {
    const { type } = cropData;
    setCropData(null);
    setIsUploading(true);
    try {
      const fileToUpload = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = await uploadToCloudinary(fileToUpload);
      if (url) {
        if (type === 'avatar') setAvatar(url);
        else setWallpaper(url);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to upload ${type}.`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {cropData && (
        <ImageCropperModal
          imageSrc={cropData.imageSrc}
          aspect={cropData.aspect}
          onCancel={() => setCropData(null)}
          onCropComplete={handleCropComplete}
        />
      )}
      <div style={{
        background: 'var(--wa-sidebar-bg)', width: '95%', maxWidth: '500px', borderRadius: '12px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        color: 'var(--wa-text-primary)', maxHeight: '90vh'
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

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
          
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
              {isUploading ? (
                <div style={{ color: '#fff', fontSize: '12px' }}>Uploading...</div>
              ) : avatar ? (
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

          {/* Notifications Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '16px', color: 'var(--wa-text-primary)', fontWeight: 'bold' }}>Background Notifications</label>
              <div style={{ fontSize: '12px', color: 'var(--wa-text-secondary)', marginTop: '4px' }}>Keep app running in background to get instant push notifications. (May use more battery)</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px', flexShrink: 0 }}>
              <input 
                type="checkbox" 
                checked={notificationsEnabled} 
                onChange={e => setNotificationsEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: notificationsEnabled ? 'var(--wa-teal-light)' : '#ccc',
                transition: '.4s', borderRadius: '34px'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '16px', width: '16px',
                  left: notificationsEnabled ? '22px' : '2px', bottom: '2px',
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                }}></span>
              </span>
            </label>
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

          {/* Accent Color Section */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--wa-teal-light)', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Accent Color</label>
            <div style={{ display: 'flex', gap: '15px' }}>
              {[
                { id: 'teal', color: '#128C7E' },
                { id: 'blue', color: '#2563eb' },
                { id: 'purple', color: '#9333ea' },
                { id: 'rose', color: '#e11d48' },
                { id: 'orange', color: '#ea580c' },
              ].map(accent => (
                <div 
                  key={accent.id}
                  onClick={() => setAccentColor(accent.id)}
                  style={{
                    width: '30px', height: '30px', borderRadius: '50%', background: accent.color,
                    cursor: 'pointer', border: accentColor === accent.id ? '2px solid var(--wa-text-primary)' : '2px solid transparent',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--wa-border)' }} />

          {/* Wallpaper Section */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--wa-teal-light)', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Chat Wallpaper</label>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              {[
                { id: 'default', name: 'Doodle' },
                { id: 'solid', name: 'Solid' },
                { id: 'gradient-ocean', name: 'Ocean' },
                { id: 'gradient-sunset', name: 'Sunset' },
                { id: 'anime', name: 'Anime' },
              ].map(wp => (
                <button
                  key={wp.id}
                  onClick={() => setWallpaper(wp.id)}
                  style={{
                    padding: '8px 16px', borderRadius: '20px', border: wallpaper === wp.id ? '2px solid var(--wa-teal-light)' : '1px solid var(--wa-border)',
                    background: wallpaper === wp.id ? 'var(--wa-chat-hover)' : 'transparent', color: 'var(--wa-text-primary)',
                    cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  {wp.name}
                </button>
              ))}
              <button
                onClick={() => document.getElementById('wallpaper-upload').click()}
                disabled={isUploading}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--wa-border)',
                  background: 'transparent', color: 'var(--wa-text-primary)',
                  cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px'
                }}
              >
                <Upload size={14} /> Custom
              </button>
              <input 
                id="wallpaper-upload" 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleWallpaperUpload} 
              />
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
              disabled={isUploading}
              style={{
                background: isUploading ? '#cbd5e1' : 'var(--wa-teal-light)', color: '#fff', border: 'none',
                padding: '10px 24px', borderRadius: '24px', fontSize: '16px', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 'bold'
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
