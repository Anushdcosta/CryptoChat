import React, { useEffect, useRef } from 'react';
import EncryptedMessage from './EncryptedMessage';

export default function ChatBox({ messages, currentSocketId }) {
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
          No messages yet. Send a secret!
        </div>
      ) : (
        messages.map((msg, idx) => (
          <div 
            key={idx} 
            style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <EncryptedMessage 
              message={msg} 
              isSent={msg.senderId === currentSocketId} 
            />
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
