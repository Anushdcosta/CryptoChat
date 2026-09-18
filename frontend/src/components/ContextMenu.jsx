import React, { useEffect, useRef } from 'react';
import { Reply, Copy, Smile, Trash2 } from 'lucide-react';

export default function ContextMenu({ x, y, message, onClose, onReply, onDelete, onReact }) {
  const menuRef = useRef(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.plainText || '');
    onClose();
  };

  // Ensure menu doesn't go off-screen
  const adjustedX = x + 160 > window.innerWidth ? window.innerWidth - 170 : x;
  const adjustedY = y + 200 > window.innerHeight ? window.innerHeight - 210 : y;

  const menuStyle = {
    position: 'fixed',
    top: adjustedY,
    left: adjustedX,
    backgroundColor: 'var(--wa-sidebar-bg)',
    border: '1px solid var(--wa-border)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 9999,
    padding: '8px 0',
    minWidth: '160px',
    color: 'var(--wa-text-primary)'
  };

  return (
    <div ref={menuRef} style={menuStyle} onContextMenu={(e) => e.preventDefault()}>
      <div style={{ display: 'flex', gap: '12px', padding: '8px 16px', borderBottom: '1px solid var(--wa-border)', marginBottom: '4px' }}>
        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
          <span 
            key={emoji} 
            style={{ fontSize: '20px', cursor: 'pointer', transition: 'transform 0.1s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onClick={(e) => { e.stopPropagation(); onReact(emoji); }}
          >
            {emoji}
          </span>
        ))}
      </div>
      <ContextMenuItem icon={<Reply size={18} />} label="Reply" onClick={onReply} />
      <ContextMenuItem icon={<Copy size={18} />} label="Copy" onClick={handleCopy} />
      <ContextMenuItem icon={<Trash2 size={18} color="#ef4444" />} label="Delete" onClick={onDelete} color="#ef4444" />
    </div>
  );
}

function ContextMenuItem({ icon, label, onClick, color }) {
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="context-menu-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        cursor: 'pointer',
        gap: '12px',
        color: color || 'var(--wa-text-primary)',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--wa-chat-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {icon}
      <span style={{ fontSize: '14px' }}>{label}</span>
    </div>
  );
}
