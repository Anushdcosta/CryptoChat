import React, { useState, useRef, useEffect } from 'react';

export default function EncryptedMessage({ message, isSent }) {
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);

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

  const showXRay = isHovered && isShiftDown;

  return (
    <div className={`message-wrapper ${isSent ? 'sent' : 'received'}`}>
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
      >
        {/* The Base Layer: Gibberish Text */}
        <div style={{ 
          opacity: showXRay ? 0.2 : 1, 
          transition: 'opacity 0.2s',
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          {message.scrambledText}
          {/* Invisible spacer for the time to float right properly */}
          <span style={{ display: 'inline-block', width: '60px' }}></span>
        </div>

        {/* The X-Ray Layer: Real Text */}
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
              ? `circle(120px at ${mousePos.x}px ${mousePos.y}px)` 
              : 'circle(0px at 0 0)',
            transition: 'clip-path 0.05s ease-out',
            pointerEvents: 'none',
            wordBreak: 'break-word',
            zIndex: 10
          }}
        >
          {message.plainText}
          <span style={{ display: 'inline-block', width: '60px' }}></span>
        </div>
        
        <div className="message-time" style={{ position: 'absolute', bottom: '4px', right: '12px', zIndex: 11 }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isSent && (
            <svg viewBox="0 0 16 15" width="16" height="15" style={{ marginLeft: 4, verticalAlign: 'middle' }}>
              <path fill="#53bdeb" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.74a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
