import React, { useState } from 'react';
import { X, Download, CheckCircle, Loader } from 'lucide-react';

const STICKER_PACKS = [
  {
    id: 'cat_memes',
    title: 'Cat Memes',
    description: 'The purr-fect reactions for any chat.',
    cover: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
    stickers: [
      'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
      'https://media.giphy.com/media/jpbnoe3UIa8WX8XpnG/giphy.gif',
      'https://media.giphy.com/media/2FazqiXvVst3P5hTO/giphy.gif',
      'https://media.giphy.com/media/26ufcVAp3AiReV58A/giphy.gif',
      'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif',
      'https://media.giphy.com/media/3o7aD2saalEvpjtVNm/giphy.gif'
    ]
  },
  {
    id: 'cute_memes',
    title: 'Cute & Wholesome',
    description: 'Send some love and wholesomeness.',
    cover: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
    stickers: [
      'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
      'https://media.giphy.com/media/3ndAvMC5LFPNMCzq7m/giphy.gif',
      'https://media.giphy.com/media/Wj7lNjMNDxSmc/giphy.gif',
      'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
      'https://media.giphy.com/media/xT0xeQ1ZUQ0lvz2wF2/giphy.gif',
      'https://media.giphy.com/media/11s7Ke7jcNxCHS/giphy.gif'
    ]
  },
  {
    id: 'crypto_pack',
    title: 'Crypto Degen',
    description: 'To the moon! HODL your way to the top.',
    cover: 'https://media.giphy.com/media/trN9ht5RlE3Dcwavg2/giphy.gif',
    stickers: [
      'https://media.giphy.com/media/trN9ht5RlE3Dcwavg2/giphy.gif',
      'https://media.giphy.com/media/85UGT15wJfghYtuM5E/giphy.gif',
      'https://media.giphy.com/media/Y2ZUWLrTy63j9T6qrK/giphy.gif',
      'https://media.giphy.com/media/Qv7y2Tl4ki7Ru/giphy.gif',
      'https://media.giphy.com/media/Jj2m0QvXYkQta/giphy.gif',
      'https://media.giphy.com/media/l41lZxzroU33typuU/giphy.gif'
    ]
  }
];

export default function StickerStoreModal({ onClose, onDownloadPack, userStickers = [] }) {
  const [downloading, setDownloading] = useState(null);

  const handleDownload = async (pack) => {
    setDownloading(pack.id);
    await onDownloadPack(pack.stickers);
    setDownloading(null);
  };

  // Check if a pack is fully downloaded by verifying if all its stickers exist in the user's stickers array
  const isPackDownloaded = (pack) => {
    return pack.stickers.every(s => userStickers.includes(s));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.7)', zIndex: 9999, 
      display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: '20px'
    }}>
      <div style={{
        background: 'var(--wa-bg)', width: '100%', maxWidth: '400px', 
        height: '70vh', borderRadius: '16px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.3)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--wa-border)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--wa-text-primary)' }}>Sticker Store</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--wa-text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {STICKER_PACKS.map(pack => {
            const downloaded = isPackDownloaded(pack);
            const isCurrentlyDownloading = downloading === pack.id;

            return (
              <div key={pack.id} style={{ 
                display: 'flex', alignItems: 'center', marginBottom: '24px', 
                background: 'var(--wa-sidebar-bg)', padding: '12px', borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                <img src={pack.cover} alt={pack.title} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                
                <div style={{ flex: 1, padding: '0 12px' }}>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--wa-text-primary)', fontSize: '15px' }}>{pack.title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--wa-text-secondary)' }}>{pack.description}</p>
                </div>

                <button 
                  onClick={() => !downloaded && !isCurrentlyDownloading && handleDownload(pack)}
                  disabled={downloaded || isCurrentlyDownloading}
                  style={{ 
                    background: downloaded ? 'transparent' : 'var(--wa-teal-light)', 
                    color: downloaded ? '#10b981' : 'white', 
                    border: downloaded ? '1px solid #10b981' : 'none', 
                    padding: '8px', borderRadius: '50%', cursor: downloaded ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px'
                  }}
                >
                  {isCurrentlyDownloading ? (
                    <Loader size={20} style={{ animation: 'spin 1s linear infinite', color: 'white' }} />
                  ) : downloaded ? (
                    <CheckCircle size={20} />
                  ) : (
                    <Download size={20} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
