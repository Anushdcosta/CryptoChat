import React, { useState } from 'react';
import { scrambleText } from '../crypto';
import { Send, Smile, Paperclip } from 'lucide-react';

export default function MessageInput({ onSendMessage }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    
    const plainText = text.trim();
    const scrambledText = scrambleText(plainText);
    
    onSendMessage({
      plainText,
      scrambledText,
      timestamp: Date.now()
    });
    
    setText('');
  };

  return (
    <div className="input-area">
      <div style={{ position: 'relative' }}>
        <span className="help-text">Hold SHIFT to decode</span>
      </div>
      <button style={{ background: 'transparent', border: 'none', color: '#54656f', padding: '8px', cursor: 'pointer' }}>
        <Smile size={24} />
      </button>
      <button style={{ background: 'transparent', border: 'none', color: '#54656f', padding: '8px', cursor: 'pointer' }}>
        <Paperclip size={24} />
      </button>
      
      <div className="text-input-group">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message"
        />
      </div>

      {text.trim() ? (
        <button className="send-btn" onClick={handleSend} style={{ padding: '8px' }}>
          <Send size={24} />
        </button>
      ) : (
        <button className="send-btn" style={{ padding: '8px', color: '#54656f', cursor: 'default' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.002z"></path>
          </svg>
        </button>
      )}
    </div>
  );
}
