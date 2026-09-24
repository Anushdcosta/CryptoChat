export const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'cryptochat');

  try {
    const response = await fetch('https://api.cloudinary.com/v1_1/f5msdmar/auto/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    if (data.secure_url) {
      const url = data.secure_url;
      // Only apply image transformations if it's actually an image
      if (data.resource_type === 'image') {
        const parts = url.split('/upload/');
        if (parts.length === 2) {
          return `${parts[0]}/upload/f_auto,q_auto/${parts[1]}`;
        }
      }
      return url;
    } else {
      console.error('Cloudinary upload error:', data);
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (err) {
    console.error('Failed to upload image:', err);
    throw err;
  }
};
