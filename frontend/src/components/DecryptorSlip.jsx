import React, { useEffect, useState } from 'react';
import { COLORS } from '../crypto';

export default function DecryptorSlip({ hoveredMessage, defaultKeyColor }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setIsVisible(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsVisible(false);
      }
    };

    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (!isVisible || !hoveredMessage) return null;

  const type = hoveredMessage.encryptionType || 'color-mesh';
  const activeColorKey = hoveredMessage.keyColor || defaultKeyColor;
  const activeColor = COLORS[activeColorKey]?.key || COLORS.red.key;

  if (type === 'slit-scan') {
    return (
      <div
        style={{
          position: 'fixed',
          left: position.x - 150,
          top: position.y - 75,
          width: '300px',
          height: '150px',
          borderRadius: '8px',
          border: '2px solid rgba(255, 255, 255, 0.5)',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
          /* The Slit-Scan Grating! 2px transparent slit, 6px opaque black block */
          background: 'repeating-linear-gradient(to right, transparent, transparent 2px, #000 2px, #000 8px)'
        }}
      />
    );
  }

  // Default: Color Mesh (Decoder Glasses)
  return (
    <div
      style={{
        position: 'fixed',
        left: position.x - 100,
        top: position.y - 50,
        width: '200px',
        height: '100px',
        borderRadius: '8px',
        border: '2px solid rgba(255, 255, 255, 0.5)',
        pointerEvents: 'none',
        zIndex: 9999,
        boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
        mixBlendMode: 'multiply',
        backgroundColor: activeColor,
        transition: 'background-color 0.2s'
      }}
    />
  );
}
