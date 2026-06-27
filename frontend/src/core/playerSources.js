// =============================================================================
// Player source resolution
// =============================================================================
//
// This module decides WHAT a movie should play. It is intentionally the single
// seam between the player UI and where playable sources come from.
//
// PRODUCTION ARCHITECTURE (the target, NOT yet implemented):
//
//     Movie/player opens
//       → frontend has a TMDB id
//       → frontend asks the BACKEND for a source for that title
//       → backend checks licensing / ownership / rights
//       → backend returns a source ONLY if we are legally allowed to stream it
//       → frontend plays the returned, authorized source
//
//   The backend response shape this module is built around:
//       {
//         source_type: "webtorrent",   // (future: "hls" | "mp4" | ...)
//         magnet_uri:  "magnet:?xt=...",
//         tmdb_id:     45745,
//         is_authorized: true           // MUST be true or the player refuses
//       }
//
// CURRENT STATE (temporary local dev/test ONLY):
//
//   There is no backend authorization layer yet. To test the *playback
//   pipeline* (peers, progress, file selection, <video> rendering) before that
//   layer exists, we map a FEW TMDB ids to magnets for content that is legal to
//   distribute over BitTorrent — i.e. Creative-Commons / public-domain / content
//   we own. Right now that is exactly one entry: Blender's open movie "Sintel"
//   (CC-BY 3.0), which is the canonical WebTorrent demo torrent.
//
//   HARD RULES for DEV_WEBTORRENT_SOURCES:
//     1. NEVER add magnets for copyrighted commercial movies. A TMDB-id → magnet
//        map filled with commercial titles is a piracy tool, dev flag or not.
//     2. Only Creative-Commons / public-domain / content-we-own may appear here.
//     3. This map is only ever consulted when import.meta.env.DEV is true.
//        It is dead in production builds (see resolveMovieSource below).
//
// -----------------------------------------------------------------------------
// TODO (before any public / production release) — strict backend authorization:
//   [ ] Backend endpoint: GET /api/stream/source/{tmdb_id}
//   [ ] Backend verifies licensing/ownership and returns 403 for unauthorized.
//   [ ] Backend returns { source_type, magnet_uri|url, tmdb_id, is_authorized }.
//   [ ] Frontend calls that endpoint here instead of the dev map.
//   [ ] Player refuses to render unless is_authorized === true.
//   [ ] Delete DEV_WEBTORRENT_SOURCES (or gate it behind a build that strips it).
//   [ ] Add audit logging of what was served to whom.
// =============================================================================

/**
 * Blender Foundation — "Sintel" (2010), licensed CC-BY 3.0.
 * This is the official WebTorrent demo torrent and is legal to distribute.
 * It includes a Sintel.mp4 file and an HTTPS web seed (ws=) so it plays in the
 * browser even with zero live peers.
 */
const SINTEL_CC_MAGNET =
  "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10" +
  "&dn=Sintel" +
  "&tr=udp%3A%2F%2Fexplodie.org%3A6969" +
  "&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337" +
  "&tr=wss%3A%2F%2Ftracker.btorrent.xyz" +
  "&tr=wss%3A%2F%2Ftracker.openwebtorrent.com" +
  "&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F" +
  "&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent";

/**
 * DEV/TEST ONLY. TMDB id (string) → legal magnet URI.
 * See the HARD RULES above. Keys are strings to match TMDB ids coming from the
 * router as path params.
 *
 *   45745 = Sintel (the test content itself — play this title to exercise the flow)
 */
const DEV_WEBTORRENT_SOURCES = {
  "45745": SINTEL_CC_MAGNET,
};

/**
 * Resolve a playable source for a movie.
 *
 * @param {string|number} tmdbId
 * @param {object|null} backendSource - a future backend-provided source object,
 *        shape { source_type, magnet_uri, tmdb_id, is_authorized }. When the
 *        backend authorization layer exists, callers pass it here and it always
 *        wins. Until then it will be null/undefined.
 * @returns {{source_type: string, magnet_uri: string, tmdb_id: string, is_authorized: boolean, is_dev_test?: boolean} | null}
 */
export function resolveMovieSource(tmdbId, backendSource = null) {
  // 1. Production path: trust ONLY an explicitly authorized backend source.
  if (backendSource && backendSource.is_authorized === true) {
    return backendSource;
  }

  // 2. Dev/test path: the dev map is consulted ONLY in development builds.
  //    In production this branch is unreachable, so the dev magnets cannot be
  //    used even if the map somehow survived tree-shaking.
  if (import.meta.env.DEV) {
    const magnet = DEV_WEBTORRENT_SOURCES[String(tmdbId)];
    if (magnet) {
      return {
        source_type: "webtorrent",
        magnet_uri: magnet,
        tmdb_id: String(tmdbId),
        is_authorized: true, // dev-only assertion; NOT a real rights check
        is_dev_test: true,
      };
    }
  }

  // 3. No authorized source available.
  return null;
}
