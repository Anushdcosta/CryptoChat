import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Reply, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function EncryptedMessage({ message, isSent, onMarkViewed, onDelete, onReply, onReact, isGroupChat, repliedMessage }) {
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isWrapperHovered, setIsWrapperHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [wasViewed, setWasViewed] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const containerRef = useRef(null);

  const showXRay = isHovered && isShiftDown;

  useEffect(() => {
    // Only trigger View Once logic if the message was RECEIVED, not sent.
    if (showXRay && message.attachment && !message.viewed && !isSent) {
      setWasViewed(true);
    } else if (!showXRay && wasViewed) {
      if (onMarkViewed) onMarkViewed(message._id);
      setWasViewed(false);
    }
  }, [showXRay, message, wasViewed, onMarkViewed, isSent]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') setIsShiftDown(true);
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') setIsShiftDown(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    setMousePos({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handleTouchStart = (e) => {
    setIsHovered(true);
    setIsShiftDown(true); // Treat touch as "holding shift"
    handleMouseMove(e);
  };

  const handleTouchEnd = () => {
    setIsHovered(false);
    setIsShiftDown(false);
  };

  return (
    <div 
      className={`message-wrapper ${isSent ? 'sent' : 'received'}`}
      onMouseEnter={() => setIsWrapperHovered(true)}
      onMouseLeave={() => setIsWrapperHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isSent ? 'flex-end' : 'flex-start' }}
    >
      <div style={{ display: 'flex', gap: '4px', opacity: isWrapperHovered ? 1 : 0, transition: 'opacity 0.2s', flexDirection: isSent ? 'row' : 'row-reverse', alignItems: 'center' }}>
        {isSent && (
          <button onClick={() => onDelete(message._id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Unsend">
            <Trash2 size={16} />
          </button>
        )}
        <button onClick={() => onReply(message)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }} title="Reply">
          <Reply size={16} />
        </button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }} title="React">
            <Smile size={16} />
          </button>
          {showEmojiPicker && (
            <div style={{ position: 'absolute', bottom: '30px', left: isSent ? 'auto' : 0, right: isSent ? 0 : 'auto', zIndex: 1000 }}>
              <EmojiPicker onEmojiClick={(emojiData) => { onReact(message._id, emojiData.emoji); setShowEmojiPicker(false); }} />
            </div>
          )}
        </div>
      </div>
      <div 
        className="message-bubble"
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onTouchMove={handleMouseMove}
        style={{ minWidth: (message.attachment || message.viewed) ? '120px' : '80px' }}
      >
        <div style={{ 
          opacity: showXRay ? 0.2 : 1, 
          transition: 'opacity 0.2s',
          fontFamily: (message.attachment || message.viewed) ? 'inherit' : 'monospace',
          wordBreak: 'break-all',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {isGroupChat && !isSent && (
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--wa-teal-dark)' }}>
              {message.senderName}
            </div>
          )}
          {repliedMessage && (
            <div style={{ padding: '6px', background: 'rgba(0,0,0,0.05)', borderLeft: '4px solid var(--wa-teal-light)', borderRadius: '4px', fontSize: '13px', color: '#555' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--wa-teal-light)' }}>{repliedMessage.senderName || 'User'}</span><br />
              {repliedMessage.plainText}
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {message.viewed ? (
              <span style={{ color: 'var(--wa-text-secondary)', fontStyle: 'italic' }}>📸 Opened</span>
            ) : message.attachment ? (
              <div style={{ width: '250px', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSent ? '#c1e5a5' : '#e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>{isSent ? '📸 Photo Sent' : '📸 View Once Photo'}</span>
              </div>
            ) : (
              message.scrambledText
            )}
            {/* Invisible spacer for the time to float right properly */}
            {!message.attachment && <span style={{ display: 'inline-block', width: '60px' }}></span>}
          </div>
        </div>

        {/* The X-Ray Layer: Real Text / Image */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            padding: '8px 12px',
            backgroundColor: isSent ? '#DCF8C6' : '#FFFFFF', 
            color: '#000000',
            fontFamily: 'inherit',
            clipPath: showXRay 
              ? `circle(9999px at ${mousePos.x}px ${mousePos.y}px)` 
              : 'circle(0px at 50% 50%)',
            transition: 'clip-path 0.3s ease-out',
            pointerEvents: 'none',
            wordBreak: 'break-word',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {isGroupChat && !isSent && (
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--wa-teal-dark)' }}>
              {message.senderName}
            </div>
          )}
          {repliedMessage && (
            <div style={{ padding: '6px', background: 'rgba(0,0,0,0.05)', borderLeft: '4px solid var(--wa-teal-light)', borderRadius: '4px', fontSize: '13px', color: '#555' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--wa-teal-light)' }}>{repliedMessage.senderName || 'User'}</span><br />
              {repliedMessage.plainText}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {message.viewed ? (
              <span style={{ color: 'var(--wa-text-secondary)', fontStyle: 'italic' }}>📸 Opened</span>
            ) : (
              <>
                {message.attachment && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '8px' }}>
                    {isSent ? (
                      <span style={{ fontWeight: 'bold' }}>📸 Photo Sent (View Once)</span>
                    ) : (
                      <img src={message.attachment} alt="attachment" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                    )}
                  </div>
                )}
                {message.plainText !== '📸 Photo' && <span>{message.plainText}</span>}
              </>
            )}
            {!message.attachment && <span style={{ display: 'inline-block', width: '60px' }}></span>}
          </div>
        </div>
        
        {message.reactions && message.reactions.length > 0 && (
          <div style={{ position: 'absolute', bottom: '-10px', right: '10px', display: 'flex', gap: '2px', background: '#fff', borderRadius: '12px', padding: '2px 4px', border: '1px solid #ddd', zIndex: 12 }}>
            {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => (
              <span key={emoji} style={{ fontSize: '12px' }}>{emoji}</span>
            ))}
          </div>
        )}
        
        <div className="message-time" style={{ position: 'absolute', bottom: '4px', right: '12px', zIndex: 11 }}>
          {new Date(message.createdAt || message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isSent && (
            <svg viewBox="0 0 16 15" width="16" height="15" style={{ marginLeft: 4, verticalAlign: 'middle' }}>
              <path fill={message.read ? "#53bdeb" : "#9CA3AF"} d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.74a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
