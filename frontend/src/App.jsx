import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import ChatBox from './components/ChatBox';
import MessageInput from './components/MessageInput';

const SOCKET_URL = 'http://localhost:3001';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('receive_encrypted_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => newSocket.disconnect();
  }, []);

  const handleSendMessage = (msgData) => {
    if (socket) {
      const payload = { ...msgData, senderId: socket.id };
      socket.emit('send_encrypted_message', payload);
      setMessages((prev) => [...prev, payload]);
    }
  };

  return (
    <div className="app-container">
      {/* WhatsApp Sidebar Fake Layout */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="chat-avatar" style={{ width: 40, height: 40, background: '#cbd5e1' }}>ME</div>
        </div>
        <div className="sidebar-chats">
          <div className="chat-item" style={{ background: '#f5f6f6' }}>
            <div className="chat-avatar">G</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500 }}>Global Secure Line</span>
                <span style={{ fontSize: '12px', color: 'var(--wa-text-secondary)' }}>Just now</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--wa-text-secondary)', marginTop: 4 }}>
                Hold SHIFT to decode messages...
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="chat-panel">
        <div className="panel-header">
          <div className="panel-title">
            <div className="chat-avatar" style={{ width: 40, height: 40, margin: 0 }}>G</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '15px' }}>Global Secure Line</span>
              <span className="status-indicator">
                {isConnected ? 'online' : 'connecting...'}
              </span>
            </div>
          </div>
        </div>
        
        <ChatBox 
          messages={messages} 
          currentSocketId={socket?.id} 
        />
        
        <MessageInput 
          onSendMessage={handleSendMessage} 
        />
      </div>
    </div>
  );
}
