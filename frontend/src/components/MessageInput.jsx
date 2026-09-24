import React, { useState, useRef, useEffect } from 'react';
import { scrambleText } from '../crypto';
import { Send, Smile, Paperclip, X, Loader } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { uploadToCloudinary } from '../utils/CloudinaryUtils';

export default function MessageInput({ user, onUploadStickers, onSendMessage, onTyping, onStopTyping, replyingToMessage, onCancelReply }) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null); // { url, type }
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingStickers, setIsUploadingStickers] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji');
  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const stickerInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const STICKERS = [
    'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    'https://media.giphy.com/media/3o7aD2saalEvpjtVNm/giphy.gif',
    'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
    'https://media.giphy.com/media/Wj7lNjMNDxSmc/giphy.gif',
    'https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif',
    'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif'
  ];

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
    
    if (file.size > 20 * 1024 * 1024) {
      alert("Please select a file smaller than 20MB");
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (url) setAttachment({ url, type: file.type || 'application/octet-stream' });
    } catch (err) {
      alert("Failed to upload attachment");
    } finally {
      setIsUploading(false);
    }
    
    e.target.value = null; // reset
  };

  const handleStickerImport = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingStickers(true);
    const uploadedUrls = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) continue; // Skip if > 5MB
        const url = await uploadToCloudinary(file);
        if (url) uploadedUrls.push(url);
      }
      
      if (uploadedUrls.length > 0 && onUploadStickers) {
        await onUploadStickers(uploadedUrls);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload some stickers");
    } finally {
      setIsUploadingStickers(false);
      if (stickerInputRef.current) stickerInputRef.current.value = "";
    }
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
    
    const plainText = text.trim() || (attachment ? (attachment.type.startsWith('image') ? '📸 Photo' : attachment.type.startsWith('video') ? '🎥 Video' : '📎 File') : '');
    const scrambledText = scrambleText(plainText);
    
    onSendMessage({
      plainText,
      scrambledText,
      attachment: attachment ? attachment.url : null,
      attachmentType: attachment ? attachment.type : null,
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
          <div ref={pickerRef} style={{ position: 'absolute', bottom: '60px', left: '10px', zIndex: 100, background: 'var(--wa-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--wa-border)' }}>
              <button onClick={() => setPickerTab('emoji')} style={{ flex: 1, padding: '10px', background: pickerTab === 'emoji' ? 'var(--wa-sidebar-bg)' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'var(--wa-text-primary)' }}>Emoji</button>
              <button onClick={() => setPickerTab('stickers')} style={{ flex: 1, padding: '10px', background: pickerTab === 'stickers' ? 'var(--wa-sidebar-bg)' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'var(--wa-text-primary)' }}>Stickers</button>
            </div>
            {pickerTab === 'emoji' ? (
              <EmojiPicker theme="auto" onEmojiClick={onEmojiClick} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '400px', width: '350px' }}>
                <div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    onClick={() => stickerInputRef.current?.click()}
                    disabled={isUploadingStickers}
                    style={{ background: 'var(--wa-teal-light)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {isUploadingStickers ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Import Stickers'}
                  </button>
                </div>
                <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', overflowY: 'auto', flex: 1 }}>
                  {[...(user?.stickers || []), ...STICKERS].map((sticker, idx) => (
                    <img 
                      key={idx} 
                      src={sticker} 
                      alt="sticker" 
                      onClick={() => {
                        onSendMessage({
                          plainText: '🎨 Sticker',
                          scrambledText: scrambleText('🎨 Sticker'),
                          attachment: sticker,
                          attachmentType: 'image/webp',
                          timestamp: Date.now()
                        });
                        setShowEmojiPicker(false);
                      }}
                      style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      
      <input 
        type="file" 
        ref={stickerInputRef} 
        style={{ display: 'none' }} 
        accept="image/webp,image/png,image/gif" 
        multiple
        onChange={handleStickerImport} 
      />
      
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
        accept="*/*" 
        onChange={handleFileChange} 
      />
      
      <div className="text-input-group" style={{ display: 'flex', alignItems: 'center' }}>
        {attachment && (
          <div style={{ position: 'relative', marginRight: '10px', display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '4px', borderRadius: '4px' }}>
            {attachment.type.startsWith('image') ? (
              <img src={attachment.url} alt="preview" style={{ height: '30px', borderRadius: '4px' }} />
            ) : attachment.type.startsWith('video') ? (
              <div style={{ padding: '0 8px', fontSize: '12px', fontWeight: 'bold' }}>🎥 Video</div>
            ) : (
              <div style={{ padding: '0 8px', fontSize: '12px', fontWeight: 'bold' }}>📎 File</div>
            )}
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
