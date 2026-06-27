// API origin for auth / streams / rooms / chat (the Python backend).
// - Dev: local FastAPI on 8001
// - Prod (Vercel): same-origin ('') — backend-dependent calls hit serverless
//   functions where available, and degrade gracefully where not.
const DEV_API = 'http://127.0.0.1:8001';

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? (import.meta.env.PROD ? '' : DEV_API); 

// TMDB always goes through a proxy so the key stays server-side.
// Dev: the FastAPI proxy. Prod: the Vercel serverless function at /api/tmdb.
export const TMDB_BASE =
  import.meta.env.VITE_TMDB_BASE ?? `${API_BASE}/api/tmdb`;
