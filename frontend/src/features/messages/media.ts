export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_FILES = 10;
export const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(',');

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Mirrors the backend limits so users get instant feedback; the server re-validates. */
export function validateFile(file: File): string | null {
  if (IMAGE_TYPES.includes(file.type)) {
    return file.size > MAX_IMAGE_BYTES ? `${file.name} is larger than ${formatBytes(MAX_IMAGE_BYTES)}` : null;
  }
  if (VIDEO_TYPES.includes(file.type)) {
    return file.size > MAX_VIDEO_BYTES ? `${file.name} is larger than ${formatBytes(MAX_VIDEO_BYTES)}` : null;
  }
  return `${file.name}: unsupported file type`;
}
