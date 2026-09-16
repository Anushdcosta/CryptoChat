import React, { useState, useRef, useEffect } from 'react';
import { scrambleText } from '../crypto';
import { Send, Smile, Paperclip, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function MessageInput({ onSendMessage }) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onEmojiClick = (emojiObject) => {
    setText(prev => prev + emojiObject.emoji);
  };

  const handleAttachClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Please select an image smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment(event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset
  };

  const handleSend = () => {
    if (!text.trim() && !attachment) return;
    
    const plainText = text.trim() || '📸 Photo';
    const scrambledText = scrambleText(plainText);
    
    onSendMessage({
      plainText,
      scrambledText,
      attachment,
      timestamp: Date.now()
    });
    
    setText('');
    setAttachment(null);
  };

  return (
    <div className="input-area" style={{ position: 'relative' }}>
      {showEmojiPicker && (
        <div ref={pickerRef} style={{ position: 'absolute', bottom: '60px', left: '10px', zIndex: 100 }}>
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}
      
      <button 
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        style={{ background: 'transparent', border: 'none', color: '#54656f', padding: '8px', cursor: 'pointer', flexShrink: 0 }}
      >
        <Smile size={24} />
      </button>
      
      <button 
        onClick={handleAttachClick}
        style={{ background: 'transparent', border: 'none', color: '#54656f', padding: '8px', cursor: 'pointer', flexShrink: 0 }}
      >
        <Paperclip size={24} />
      </button>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*" 
        onChange={handleFileChange} 
      />
      
      <div className="text-input-group" style={{ display: 'flex', alignItems: 'center' }}>
        {attachment && (
          <div style={{ position: 'relative', marginRight: '10px' }}>
            <img src={attachment} alt="preview" style={{ height: '30px', borderRadius: '4px' }} />
            <button 
              onClick={() => setAttachment(null)}
              style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={12} />
            </button>
          </div>
        )}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message"
        />
      </div>

      <button 
        className="send-btn" 
        onClick={handleSend} 
        style={{ padding: '8px', opacity: (text.trim() || attachment) ? 1 : 0.5, flexShrink: 0 }}
        disabled={!text.trim() && !attachment}
      >
        <Send size={24} />
      </button>
    </div>
  );
}
