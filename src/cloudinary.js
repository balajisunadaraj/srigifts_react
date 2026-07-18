// Convert file to base64 data URI (fallback when Cloudinary is unavailable)
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Resize image before converting to base64 to keep Firebase data small
const resizeImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });
};

export const uploadImageToCloudinary = async (file) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Try Cloudinary first if configured
  if (cloudName && uploadPreset && uploadPreset !== 'your_unsigned_upload_preset_here') {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.secure_url) {
        return data.secure_url;
      }

      console.warn("Cloudinary upload failed:", data?.error?.message || "Unknown error", "— falling back to base64.");
    } catch (error) {
      console.warn("Cloudinary network error — falling back to base64:", error.message);
    }
  }

  // Fallback: resize and convert to base64 (matches existing product data format)
  try {
    const base64 = await resizeImage(file);
    return base64;
  } catch (error) {
    console.error("Base64 conversion also failed:", error);
    return null;
  }
};
