import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../core/backend";
import { resolveMovieSource } from "../../core/playerSources";
import { WebTorrentPlayer } from "./WebTorrentPlayer";
import { DirectVideoPlayer } from "./DirectVideoPlayer";

// =============================================================================
// CinemaPlayer — movie player entry point.
//
// Flow:
//   1. Ask the backend movie gate for this TMDB id (GET /api/stream/movie/{id}).
//      The backend returns a source ONLY when a saved source is rights-confirmed,
//      active and non-expired ({ available, source_type, magnet_uri, ... }). The
//      frontend never decides rights and never builds or holds magnets.
//   2. resolveMovieSource() prefers that authorized source. In DEVELOPMENT only,
//      if the backend has nothing, it falls back to the local CC test map.
//   3. Mount the right concrete player for the source type:
//        webtorrent        -> WebTorrentPlayer (P2P)
//        mp4 | hls | file  -> DirectVideoPlayer (native <video>)
//
// Movie-only for now. Same props as before, so all call sites are unchanged.
// =============================================================================

/**
 * @param {{ mediaType?: string, mediaId: string|number, title?: string, onClose: () => void }} props
 */
export function CinemaPlayer({ mediaType = "movie", mediaId, title, onClose }) {
  // undefined = still fetching; null = none; object = authorized backend source.
  const [backendSource, setBackendSource] = useState(undefined);

  useEffect(() => {
    let active = true;
    if (mediaType !== "movie" || !mediaId) {
      setBackendSource(null);
      return;
    }
    setBackendSource(undefined);
    api
      .getMovieStream(mediaId)
      .then((data) => {
        if (!active) return;
        // Map the public movie gate response to the source shape the player
        // expects. `available:false` -> no source (player shows a message).
        if (data && data.available && data.source_type === "webtorrent" && data.magnet_uri) {
          setBackendSource({
            source_type: "webtorrent",
            magnet_uri: data.magnet_uri,
            tmdb_id: String(mediaId),
            is_authorized: true,
            license: data.license,
            quality: data.quality,
            language: data.language,
          });
        } else {
          setBackendSource(null);
        }
      })
      .catch(() => active && setBackendSource(null)); // offline -> none
    return () => {
      active = false;
    };
  }, [mediaType, mediaId]);

  if (mediaType !== "movie") {
    return <ErrorModal message="Playback is currently available for movies only." title={title} mediaId={mediaId} onClose={onClose} />;
  }
  if (!mediaId) {
    return <ErrorModal message="Playback unavailable: missing TMDB movie ID." title={title} mediaId={mediaId} onClose={onClose} />;
  }
  if (backendSource === undefined) {
    return <LoadingModal title={title} onClose={onClose} />;
  }

  const src = resolveMovieSource(mediaId, backendSource);
  if (!src) {
    return (
      <ErrorModal
        message={
          import.meta.env.DEV
            ? "No licensed or test stream configured for this movie."
            : "This movie is not available for streaming yet."
        }
        title={title}
        mediaId={mediaId}
        onClose={onClose}
      />
    );
  }

  if (src.source_type === "webtorrent") {
    return (
      <WebTorrentPlayer
        magnetUri={src.magnet_uri}
        title={title}
        onClose={onClose}
        isDevTest={Boolean(src.is_dev_test)}
      />
    );
  }
  if (src.source_type === "mp4" || src.source_type === "hls" || src.source_type === "file") {
    return <DirectVideoPlayer url={src.url} title={title} license={src.license} onClose={onClose} />;
  }
  return <ErrorModal message={`Unsupported source type: ${src.source_type}`} title={title} mediaId={mediaId} onClose={onClose} />;
}

// --- Modal chrome shared by the loading / error states ----------------------

function Shell({ children, onClose }) {
  const handleClose = useCallback(() => onClose?.(), [onClose]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [handleClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-5xl mx-4 rounded-2xl overflow-hidden bg-black shadow-2xl">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end p-3 bg-gradient-to-b from-black/70 to-transparent">
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadingModal({ title, onClose }) {
  return (
    <Shell onClose={onClose}>
      <div className="aspect-video flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="px-4 py-3 bg-black/80">
        <span className="text-white font-semibold text-sm truncate">{title || "Loading…"}</span>
      </div>
    </Shell>
  );
}

function ErrorModal({ message, title, mediaId, onClose }) {
  return (
    <Shell onClose={onClose}>
      <div className="aspect-video flex items-center justify-center text-white">
        <div className="text-center px-6">
          <p className="text-lg font-semibold mb-2">Playback unavailable</p>
          <p className="text-sm text-gray-400">{message}</p>
        </div>
      </div>
      <div className="px-4 py-3 bg-black/80 flex items-center justify-between gap-4">
        <span className="text-white font-semibold text-sm truncate">{title || "Now Playing"}</span>
        {mediaId && <span className="text-gray-400 text-xs shrink-0">TMDB: {mediaId}</span>}
      </div>
    </Shell>
  );
}
