// Server-side (loaders/actions) uses API_BASE_URL env var (direct localhost call)
// Client-side (browser) uses VITE_API_BASE_URL baked in at build time
const BASE = typeof process !== "undefined" && process.env?.API_BASE_URL
  ? process.env.API_BASE_URL
  : import.meta.env.VITE_API_BASE_URL;

export interface Video {
  id: string;
  title: string;
  description?: string;
  tags?: string;
  fileUrl: string;
  createdAt: string;
  thumbnails: Thumbnail[];
}

export interface Thumbnail {
  id: string;
  videoId: string;
  url: string;
  isPrimary: boolean;
}

export async function uploadVideo(formData: FormData): Promise<Video> {
  const res = await fetch(`${BASE}/videos`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function generateThumbnails(videoId: string): Promise<Thumbnail[]> {
  const res = await fetch(`${BASE}/videos/${videoId}/thumbnails/generate`, { method: 'POST' });
  if (!res.ok) throw new Error('Thumbnail generation failed');
  return res.json();
}

export async function selectThumbnail(videoId: string, thumbnailId: string): Promise<Thumbnail> {
  const res = await fetch(`${BASE}/videos/${videoId}/thumbnails/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thumbnailId }),
  });
  if (!res.ok) throw new Error('Select failed');
  return res.json();
}

export async function listVideos(search?: string, tag?: string): Promise<Video[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (tag) params.set('tag', tag);
  const res = await fetch(`${BASE}/videos?${params}`);
  if (!res.ok) throw new Error('Failed to fetch videos');
  return res.json();
}

export async function getVideo(id: string): Promise<Video> {
  const res = await fetch(`${BASE}/videos/${id}`);
  if (!res.ok) throw new Error('Video not found');
  return res.json();
}
