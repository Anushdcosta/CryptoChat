import React, { useEffect, useRef } from 'react';
import EncryptedMessage from './EncryptedMessage';

export default function ChatBox({ messages, currentUserId, onMarkViewed }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="messages-container">
      {messages.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Say hi to start the conversation!
        </div>
      ) : (
        messages.map((msg, idx) => (
          <div 
            key={msg._id || idx} 
            style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <EncryptedMessage 
              message={msg} 
              isSent={msg.senderId === currentUserId} 
              onMarkViewed={onMarkViewed}
            />
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
