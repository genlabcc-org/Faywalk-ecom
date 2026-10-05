// src/utils/imageCompression.js
import imageCompression from 'browser-image-compression';

export const COMPRESSION_PRESETS = {
  card: { maxWidthOrHeight: 600, maxSizeMB: 0.3 },
  detail: { maxWidthOrHeight: 1200, maxSizeMB: 0.6 },
  variant: { maxWidthOrHeight: 1000, maxSizeMB: 0.5 },
  banner: { maxWidthOrHeight: 1920, maxSizeMB: 0.8 },
};

export async function compressImage(file, preset = 'detail') {
  const options = {
    ...COMPRESSION_PRESETS[preset],
    useWebWorker: true,
    fileType: 'image/webp',
  };

  try {
    return await imageCompression(file, options);
  } catch (err) {
    console.error('Image compression failed, using original file:', err);
    return file; // fail-safe: don't block upload if compression errors out
  }
}