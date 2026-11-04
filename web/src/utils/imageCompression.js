// src/utils/imageCompression.js
import imageCompression from 'browser-image-compression';

export const COMPRESSION_PRESETS = {
  card: { maxWidthOrHeight: 600, maxSizeMB: 0.3 },
  detail: { maxWidthOrHeight: 1200, maxSizeMB: 0.6 },
  variant: { maxWidthOrHeight: 1000, maxSizeMB: 0.5 },
  banner: { maxWidthOrHeight: 1920, maxSizeMB: 0.8 },
};

export async function compressImage(file, preset = 'detail') {
  if (!file || typeof file !== 'object') return file;

  const baseOptions = {
    ...COMPRESSION_PRESETS[preset],
    fileType: 'image/webp',
  };

  const toNamedFile = (blobOrFile) => {
    if (blobOrFile instanceof File && blobOrFile.name) return blobOrFile;
    const baseName = (file.name || 'image').replace(/\.[^/.]+$/, '');
    const ext = (blobOrFile.type === 'image/webp' || !file.name) ? 'webp' : file.name.split('.').pop();
    return new File([blobOrFile], `${baseName}.${ext}`, {
      type: blobOrFile.type || file.type || 'image/webp',
      lastModified: Date.now(),
    });
  };

  try {
    const compressed = await imageCompression(file, { ...baseOptions, useWebWorker: true });
    return toNamedFile(compressed);
  } catch (workerErr) {
    try {
      // Fallback to main-thread compression if Web Worker fails (e.g. ProgressEvent)
      const compressedFallback = await imageCompression(file, { ...baseOptions, useWebWorker: false });
      return toNamedFile(compressedFallback);
    } catch (err) {
      console.error('Image compression failed, using original file:', err);
      return file; // fail-safe: don't block upload if compression errors out
    }
  }
}