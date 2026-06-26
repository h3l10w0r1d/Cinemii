import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Maximize, Keyboard } from "lucide-react";

const PLAYER_BASE_URL = `https://www.2embed.online/embed/movie/tt${mediaId}`;

function buildMovieEmbedUrl(mediaId) {
  if (!mediaId) return "";
  return `${PLAYER_BASE_URL}/${encodeURIComponent(String(mediaId))}`;
}

export function CinemaPlayer({ mediaType = "movie", mediaId, title, onClose }) {
  const boxRef = useRef(null);
  const [showHelp, setHelp] = useState(false);

  const iframeUrl = useMemo(() => {
    if (mediaType !== "movie") return "";
    return buildMovieEmbedUrl(mediaId);
  }, [mediaType, mediaId]);

  const error = useMemo(() => {
    if (mediaType !== "movie") {
      return "Playback is currently available for movies only.";
    }

    if (!mediaId) {
      return "Playback unavailable: missing TMDB movie ID.";
    }

    return null;
  }, [mediaType, mediaId]);

  const toggleFullscreen = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  }, []);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => {
      switch (e.key.toLowerCase()) {
        case "escape":
          handleClose();
          break;
        case "f":
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [handleClose, toggleFullscreen]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={boxRef}
        className="relative w-full max-w-5xl mx-4 rounded-2xl overflow-hidden bg-black shadow-2xl"
      >
        {/* Top control bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end gap-2 p-3 bg-gradient-to-b from-black/70 to-transparent">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition"
            title="Fullscreen (F)"
            aria-label="Fullscreen"
          >
            <Maximize size={15} />
          </button>

          <button
            type="button"
            onClick={() => setHelp((v) => !v)}
            className="w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition"
            title="Keyboard shortcuts"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={15} />
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition"
            aria-label="Close"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts overlay */}
        {showHelp && (
          <div
            className="absolute top-14 right-3 z-20 rounded-xl p-4 text-xs text-white bg-black/80 shadow-xl w-52"
            onClick={() => setHelp(false)}
          >
            <p className="font-bold mb-2">Keyboard shortcuts</p>

            <div className="flex justify-between py-1">
              <span className="text-gray-300">Fullscreen</span>
              <kbd className="bg-white/10 px-1.5 rounded">F</kbd>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-gray-300">Close</span>
              <kbd className="bg-white/10 px-1.5 rounded">Esc</kbd>
            </div>
          </div>
        )}

        {/* Iframe player */}
        {error ? (
          <div className="aspect-video flex items-center justify-center text-white">
            <div className="text-center px-6">
              <p className="text-lg font-semibold mb-2">Playback unavailable</p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          </div>
        ) : (
          <iframe
            src={iframeUrl}
            title={title || "Movie Player"}
            className="w-full aspect-video bg-black"
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {/* Bottom bar */}
        <div className="px-4 py-3 bg-black/80 flex items-center justify-between gap-4">
          <span className="text-white font-semibold text-sm truncate">
            {title || "Now Playing"}
          </span>
          {mediaId && <span className="text-gray-400 text-xs shrink-0">TMDB: {mediaId}</span>}
        </div>
      </div>
    </div>
  );
}
