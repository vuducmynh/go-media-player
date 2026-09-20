/**
 * YouTube Utility Library
 * Extracts video IDs, validates URLs and formats embed URLs
 */

const YT_DIRECT_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const YT_SHORT_REGEX = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
const YT_WATCH_REGEX = /[?&]v=([a-zA-Z0-9_-]{11})/;
const YT_EMBED_REGEX = /youtube\.com\/(?:embed|shorts|v)\/([a-zA-Z0-9_-]{11})/;

export function extractYouTubeVideoID(input: string): string | null {
  const clean = input.trim();
  if (!clean) return null;

  if (YT_DIRECT_REGEX.test(clean)) {
    return clean;
  }

  const shortMatch = clean.match(YT_SHORT_REGEX);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  const watchMatch = clean.match(YT_WATCH_REGEX);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  const embedMatch = clean.match(YT_EMBED_REGEX);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  return null;
}

export function isValidYouTubeURL(input: string): boolean {
  return extractYouTubeVideoID(input) !== null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedURL(videoId: string): string {
  const origin = window.location.origin || 'http://localhost';
  return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&origin=${encodeURIComponent(origin)}`;
}
