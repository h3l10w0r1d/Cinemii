// API origin for auth / streams / rooms / chat (the Python backend).
// - Dev: local FastAPI on 8001
// - Prod (Vercel): same-origin ('') — backend-dependent calls hit serverless
//   functions where available, and degrade gracefully where not.
const DEV_API = 'http://127.0.0.1:8001';

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? (import.meta.env.PROD ? '' : DEV_API); 

// TMDB always goes through a proxy so the key stays server-side.
// Dev: the FastAPI proxy. Prod: the Vercel serverless function at /api/tmdb
// (same origin — independent of where VITE_API_BASE points).
export const TMDB_BASE =
  import.meta.env.VITE_TMDB_BASE ??
  (import.meta.env.PROD ? '/api/tmdb' : `${API_BASE}/api/tmdb`);

// Cinemii embed player (iframe), keyed by TMDB id.
//   movie: https://api.cinemii.com/embed/movie/597?apikey=...
//   tv:    https://api.cinemii.com/embed/tv/1399/1/1?apikey=...  (id/season/episode)
export const EMBED_BASE =
  import.meta.env.VITE_EMBED_BASE ?? 'https://api.cinemii.com/embed';
// Set VITE_EMBED_API_KEY in the environment (e.g. frontend/.env or Vercel).
export const EMBED_API_KEY = import.meta.env.VITE_EMBED_API_KEY ?? '';

function withKey(url) {
  return EMBED_API_KEY ? `${url}?${new URLSearchParams({ apikey: EMBED_API_KEY })}` : url;
}

export function movieEmbedUrl(tmdbId) {
  return withKey(`${EMBED_BASE}/movie/${encodeURIComponent(tmdbId)}`);
}

export function tvEmbedUrl(tmdbId, season, episode) {
  const parts = [tmdbId, season, episode].map((v) => encodeURIComponent(v));
  return withKey(`${EMBED_BASE}/tv/${parts.join('/')}`);
}
