import React, { useEffect, useRef, useState } from 'react';
import EncryptedMessage from './EncryptedMessage';
import ContextMenu from './ContextMenu';

export default function ChatBox({ messages, currentUserId, onMarkViewed, onDeleteMessage, onReply, onReact, isGroupChat }) {
  const bottomRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    const handleGlobalScroll = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleGlobalClick);
      window.addEventListener('scroll', handleGlobalScroll, true);
    }
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleGlobalScroll, true);
    };
  }, [contextMenu]);

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message: msg
    });
  };

  return (
    <div className="messages-container" style={{ position: 'relative' }}>
      {messages.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Say hi to start the conversation!
        </div>
      ) : (
        messages.map((msg, idx) => {
          const repliedMsg = msg.replyTo ? messages.find(m => m._id === msg.replyTo) : null;
          const isSameSenderAsPrev = idx > 0 && messages[idx - 1].senderId === msg.senderId;
          const isSameSenderAsNext = idx < messages.length - 1 && messages[idx + 1].senderId === msg.senderId;
          
          return (
            <div 
              key={msg._id || idx} 
              style={{ width: '100%', display: 'flex', flexDirection: 'column', marginBottom: isSameSenderAsNext ? '2px' : '12px' }}
            >
              <EncryptedMessage 
                message={msg} 
                isSent={msg.senderId === currentUserId} 
                onMarkViewed={onMarkViewed}
                onDelete={onDeleteMessage}
                onReply={onReply}
                onReact={onReact}
                isGroupChat={isGroupChat}
                repliedMessage={repliedMsg}
                hasTail={!isSameSenderAsPrev}
                onContextMenu={(e) => handleContextMenu(e, msg)}
              />
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          onClose={() => setContextMenu(null)}
          onReply={() => { onReply(contextMenu.message); setContextMenu(null); }}
          onDelete={() => { onDeleteMessage(contextMenu.message._id); setContextMenu(null); }}
          onReact={(emoji) => { onReact(contextMenu.message._id, emoji); setContextMenu(null); }}
        />
      )}
    </div>
  );
}
