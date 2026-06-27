import { useCallback, useEffect, useMemo, useRef } from "react";
import { X, Maximize } from "lucide-react";
import { API_BASE } from "../../core/config";

// Native <video> player for direct sources (mp4 / hls / a file served by the
// backend). Used when the licensing CMS returns a url-based authorized source.
//
// NOTE: HLS (.m3u8) plays natively in Safari but not in Chrome/Firefox. If you
// serve HLS to those browsers, add hls.js here. (TODO)

function resolveUrl(url) {
  if (!url) return "";
  return url.startsWith("/") ? `${API_BASE}${url}` : url;
}

/**
 * @param {{ url: string, title?: string, onClose: () => void, license?: string }} props
 */
export function DirectVideoPlayer({ url, title, onClose, license }) {
  const boxRef = useRef(null);
  const src = useMemo(() => resolveUrl(url), [url]);

  const toggleFullscreen = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  const handleClose = useCallback(() => onClose?.(), [onClose]);

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
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <video
          src={src}
          className="w-full aspect-video bg-black"
          controls
          autoPlay
          playsInline
        />

        <div className="px-4 py-3 bg-black/80 flex items-center justify-between gap-4">
          <span className="text-white font-semibold text-sm truncate">
            {title || "Now Playing"}
          </span>
          {license && <span className="text-gray-400 text-xs shrink-0">{license}</span>}
        </div>
      </div>
    </div>
  );
}
