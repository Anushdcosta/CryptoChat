import React, { useState, useRef, useEffect } from 'react';
import { scrambleText } from '../crypto';
import { Send, Smile, Paperclip, X, Loader } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { uploadToCloudinary } from '../utils/CloudinaryUtils';

export default function MessageInput({ onSendMessage, onTyping, onStopTyping, replyingToMessage, onCancelReply }) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Please select an image smaller than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (url) setAttachment(url);
    } catch (err) {
      alert("Failed to upload attachment");
    } finally {
      setIsUploading(false);
    }
    
    e.target.value = null; // reset
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    if (onTyping) onTyping();
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (onStopTyping) onStopTyping();
    }, 2000);
  };

  const handleSend = () => {
    if (!text.trim() && !attachment) return;
    
    if (onStopTyping) onStopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
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
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
      {replyingToMessage && (
        <div style={{ padding: '8px 12px', background: '#e2e8f0', borderLeft: '4px solid var(--wa-teal-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b', fontSize: '13px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--wa-teal-light)' }}>Replying to message</span><br />
            {replyingToMessage.plainText}
          </div>
          <button onClick={onCancelReply} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
        </div>
      )}
      <div className="input-area" style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
        {showEmojiPicker && (
          <div ref={pickerRef} style={{ position: 'absolute', bottom: '60px', left: '10px', zIndex: 100 }}>
          <EmojiPicker theme="auto" onEmojiClick={onEmojiClick} />
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
        disabled={isUploading}
        style={{ background: 'transparent', border: 'none', color: '#54656f', padding: '8px', cursor: 'pointer', flexShrink: 0 }}
      >
        {isUploading ? <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} /> : <Paperclip size={24} />}
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
          onChange={handleInputChange}
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
    </div>
  );
}
