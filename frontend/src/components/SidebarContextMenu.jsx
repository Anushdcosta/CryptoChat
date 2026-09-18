import React, { useRef } from 'react';
import { Archive, ArrowRightCircle, ArrowLeftCircle, Inbox } from 'lucide-react';

export default function SidebarContextMenu({ x, y, chat, currentState, onClose, onAction }) {
  const menuRef = useRef(null);

  // Ensure menu doesn't go off-screen
  const adjustedX = x + 160 > window.innerWidth ? window.innerWidth - 170 : x;
  const adjustedY = y + 160 > window.innerHeight ? window.innerHeight - 170 : y;

  const menuStyle = {
    position: 'fixed',
    top: adjustedY,
    left: adjustedX,
    backgroundColor: 'var(--wa-sidebar-bg)',
    border: '1px solid var(--wa-border)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 10000,
    padding: '8px 0',
    minWidth: '180px',
    color: 'var(--wa-text-primary)'
  };

  const handleAction = (action) => {
    onAction(chat, action);
    onClose();
  };

  return (
    <div ref={menuRef} style={menuStyle} onContextMenu={(e) => e.preventDefault()}>
      {currentState !== 'archived' && (
        <ContextMenuItem icon={<Archive size={18} />} label="Archive" onClick={() => handleAction('archived')} />
      )}
      {currentState === 'archived' && (
        <ContextMenuItem icon={<Inbox size={18} />} label="Unarchive" onClick={() => handleAction('primary')} />
      )}
      {currentState === 'general' && (
        <ContextMenuItem icon={<ArrowLeftCircle size={18} />} label="Move to Primary" onClick={() => handleAction('primary')} />
      )}
      {(currentState === 'primary' || currentState === 'request') && (
        <ContextMenuItem icon={<ArrowRightCircle size={18} />} label="Move to General" onClick={() => handleAction('general')} />
      )}
    </div>
  );
}

function ContextMenuItem({ icon, label, onClick, color }) {
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
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
