import React, { useState } from 'react';
import { X, Download, CheckCircle, Loader } from 'lucide-react';

const STICKER_PACKS = [
  {
    id: 'cat_memes',
    title: 'Cat Memes',
    description: 'The purr-fect reactions for any chat.',
    cover: 'https://res.cloudinary.com/f5msdmar/image/upload/v1790364225/hullr4w9bbukczqomsiv.gif',
    stickers: [
      'https://res.cloudinary.com/f5msdmar/image/upload/v1790364225/hullr4w9bbukczqomsiv.gif',
      'https://res.cloudinary.com/f5msdmar/image/upload/v1790364227/hz3t4kpapbbkem6wwfuv.gif',
      'https://res.cloudinary.com/f5msdmar/image/upload/v1790364228/zg8mpioftobt7urrymnf.gif',
      'https://res.cloudinary.com/f5msdmar/image/upload/v1790364220/oqriqb6zsw1kiybznhd7.gif',
      'https://res.cloudinary.com/f5msdmar/image/upload/v1790364223/jpzckixqjew2xsbwwu2n.gif'
    ]
  },
  {
    id: 'cute_memes',
    title: 'Cute & Wholesome',
    description: 'Send some love and wholesomeness.',
    cover: 'https://em-content.zobj.net/source/apple/391/pleading-face_1f97a.png',
    stickers: [
      'https://em-content.zobj.net/source/apple/391/pleading-face_1f97a.png',
      'https://em-content.zobj.net/source/apple/391/smiling-face-with-hearts_1f970.png',
      'https://em-content.zobj.net/source/apple/391/dog-face_1f436.png',
      'https://em-content.zobj.net/source/apple/391/bear_1f43b.png',
      'https://em-content.zobj.net/source/apple/391/sparkles_2728.png'
    ]
  },
  {
    id: 'crypto_pack',
    title: 'Crypto Degen',
    description: 'To the moon! HODL your way to the top.',
    cover: 'https://em-content.zobj.net/source/apple/391/rocket_1f680.png',
    stickers: [
      'https://em-content.zobj.net/source/apple/391/rocket_1f680.png',
      'https://em-content.zobj.net/source/apple/391/gem-stone_1f48e.png',
      'https://em-content.zobj.net/source/apple/391/chart-increasing_1f4c8.png',
      'https://em-content.zobj.net/source/apple/391/money-bag_1f4b0.png',
      'https://em-content.zobj.net/source/apple/391/alien-monster_1f47e.png'
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
