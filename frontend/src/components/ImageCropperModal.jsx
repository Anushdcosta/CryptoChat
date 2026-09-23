import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

export default function ImageCropperModal({ imageSrc, aspect, onCancel, onCropComplete }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImageBlob);
    } catch (e) {
      console.error(e);
      alert('Failed to crop image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1, background: '#000' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
        />
      </div>
      <div style={{ height: '80px', background: '#202c33', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button 
          onClick={onCancel} 
          disabled={isProcessing}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#333', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          disabled={isProcessing}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--wa-teal-light)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
          {isProcessing ? 'Cropping...' : 'Save Crop'}
        </button>
      </div>
    </div>
  );
}
