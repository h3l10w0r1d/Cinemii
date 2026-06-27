import { useCallback, useEffect, useRef, useState } from "react";
import { X, Maximize, Loader2, Users, AlertTriangle } from "lucide-react";
// Use the prebuilt browser bundle: the package's main entry pulls Node builtins
// that Vite can't bundle without polyfills. The dist bundle is browser-ready.
import WebTorrent from "webtorrent/dist/webtorrent.min.js";

// Prefer formats <video> can play natively. .mkv is included as a last resort
// but most browsers can't decode it — it's filtered out below if it can't play.
const PLAYABLE_RE = /\.(mp4|webm|m4v|ogg|ogv)$/i;

function pickVideoFile(files) {
  if (!files || files.length === 0) return null;
  const playable = files.filter((f) => PLAYABLE_RE.test(f.name));
  if (playable.length === 0) return null;
  // Largest playable file is almost always the feature, not a sample/trailer.
  return playable.sort((a, b) => b.length - a.length)[0];
}

function fmtSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec < 1) return "0 KB/s";
  const kb = bytesPerSec / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB/s`;
  return `${(kb / 1024).toFixed(1)} MB/s`;
}

/**
 * WebTorrent (P2P) video player.
 *
 * Plays a single magnet URI into a <video> element via WebTorrent's in-browser
 * WebRTC client. Movie-only for now; TV/season/episode support can come later.
 *
 * @param {{ magnetUri: string, title?: string, onClose: () => void, isDevTest?: boolean }} props
 */
export function WebTorrentPlayer({ magnetUri, title, onClose, isDevTest = false }) {
  const boxRef = useRef(null);
  const videoRef = useRef(null);
  const clientRef = useRef(null);
  const torrentRef = useRef(null);
  const pollRef = useRef(null);

  const [status, setStatus] = useState("connecting"); // connecting | playing | error
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0); // 0..100
  const [peers, setPeers] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [fileName, setFileName] = useState("");

  const toggleFullscreen = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  // Destroy the torrent + client, then notify the parent. Safe to call twice.
  const handleClose = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = null;
    try {
      torrentRef.current = null;
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
    } catch {
      /* already torn down */
    }
    onClose?.();
  }, [onClose]);

  // --- Torrent lifecycle -----------------------------------------------------
  // In the browser, WebTorrent streams a file into a <video> via a small HTTP
  // server backed by a Service Worker. The flow is:
  //   1. register the SW (served at /sw.min.js) and wait until it's active
  //   2. client.createServer({ controller: registration })
  //   3. add the magnet, pick a playable file, file.streamTo(<video>)
  useEffect(() => {
    if (!magnetUri) {
      setError("No stream source provided.");
      setStatus("error");
      return;
    }

    let cancelled = false;
    let client;

    const start = async () => {
      // 1. Service worker (required for in-browser streaming).
      if (!("serviceWorker" in navigator)) {
        setError("This browser doesn't support the streaming service worker.");
        setStatus("error");
        return;
      }
      let registration;
      try {
        await navigator.serviceWorker.register("/sw.min.js", { scope: "/" });
        registration = await navigator.serviceWorker.ready; // resolves once active
      } catch {
        setError("Could not start the streaming service worker.");
        setStatus("error");
        return;
      }
      if (cancelled) return;

      // 2. P2P client + its browser server.
      try {
        client = new WebTorrent();
      } catch {
        setError("Could not start the P2P client in this browser.");
        setStatus("error");
        return;
      }
      clientRef.current = client;
      client.on("error", (err) => {
        if (cancelled) return;
        setError(typeof err === "string" ? err : err?.message || "Torrent error.");
        setStatus("error");
      });

      try {
        client.createServer({ controller: registration });
      } catch {
        setError("Could not create the streaming server.");
        setStatus("error");
        return;
      }

      // 3. Add the magnet and stream the chosen file.
      client.add(magnetUri, (torrent) => {
        if (cancelled) return;
        torrentRef.current = torrent;

        const file = pickVideoFile(torrent.files);
        if (!file) {
          setError("No browser-playable video file found in this torrent.");
          setStatus("error");
          return;
        }
        setFileName(file.name);

        try {
          file.streamTo(videoRef.current); // sets <video>.src to the SW server URL
          setStatus("playing");
          videoRef.current?.play?.().catch(() => {
            /* autoplay may be blocked; user can press play */
          });
        } catch {
          setError("Failed to attach the video stream.");
          setStatus("error");
          return;
        }

        torrent.on("error", (err) => {
          if (cancelled) return;
          setError(err?.message || "Torrent error.");
          setStatus("error");
        });

        // Poll progress/peers/speed for the status overlay.
        pollRef.current = setInterval(() => {
          if (cancelled || !torrentRef.current) return;
          setProgress(Math.min(100, Math.round(torrent.progress * 100)));
          setPeers(torrent.numPeers || 0);
          setSpeed(torrent.downloadSpeed || 0);
        }, 1000);
      });
    };

    start();

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
      pollRef.current = null;
      torrentRef.current = null;
      try {
        client?.destroy();
      } catch {
        /* noop */
      }
      clientRef.current = null;
    };
  }, [magnetUri]);

  // --- Keyboard + scroll lock ------------------------------------------------
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
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 p-3 bg-gradient-to-b from-black/70 to-transparent">
          {isDevTest && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-black text-[10px] font-bold uppercase tracking-wide">
              Dev test stream
            </span>
          )}
          <div className="flex-1" />
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

        {/* Stage */}
        {status === "error" ? (
          <div className="aspect-video flex items-center justify-center text-white">
            <div className="text-center px-6">
              <AlertTriangle className="mx-auto mb-3 text-amber-400" size={28} />
              <p className="text-lg font-semibold mb-2">Playback unavailable</p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full aspect-video bg-black"
              controls
              playsInline
            />
            {status === "connecting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <Loader2 className="mx-auto mb-3 animate-spin" size={28} />
                  <p className="text-sm font-medium">Connecting to peers…</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Finding a video file in the torrent
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom bar — title + live P2P stats */}
        <div className="px-4 py-3 bg-black/80 flex items-center justify-between gap-4">
          <span className="text-white font-semibold text-sm truncate">
            {title || fileName || "Now Playing"}
          </span>
          {status !== "error" && (
            <div className="flex items-center gap-4 shrink-0 text-xs text-gray-300">
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> {peers} {peers === 1 ? "peer" : "peers"}
              </span>
              <span>{fmtSpeed(speed)}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
