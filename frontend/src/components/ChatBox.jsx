import React, { useEffect, useRef } from 'react';
import EncryptedMessage from './EncryptedMessage';

export default function ChatBox({ messages, currentUserId, onMarkViewed, onDeleteMessage, onReply, onReact, isGroupChat }) {
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
              />
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
