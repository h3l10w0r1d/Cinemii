import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Gauge, Captions, Maximize, Keyboard } from 'lucide-react';
import { API_BASE } from '../../core/config';
import { api, isLoggedIn } from '../../core/backend';

const SAVE_EVERY = 5000;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const VOL_KEY = 'cinemii_player_volume';
const RATE_KEY = 'cinemii_player_rate';

function resolveSource(src) {
  if (!src) return src;
  return src.startsWith('/') ? `${API_BASE}${src}` : src;
}

export function CinemaPlayer({ mediaType, mediaId, title, onClose }) {
  const boxRef   = useRef(null);
  const timerRef = useRef(null);
  const [info, setInfo]       = useState(null);
  const [error, setError]     = useState(null);
  const [rate, setRate]       = useState(() => Number(localStorage.getItem(RATE_KEY)) || 1);
  const [speedOpen, setSpeed] = useState(false);
  const [captions, setCaps]   = useState(false);
  const [showHelp, setHelp]   = useState(false);
  const localKey = `cinemii_progress_${mediaType}_${mediaId}`;

  useEffect(() => {
    api.streamInfo(mediaType, mediaId).then(setInfo).catch((e) => setError(e.message));
  }, [mediaType, mediaId]);

  // Load source + restore resume position, volume, rate

  const persist = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.currentTime <= 0) return;
    localStorage.setItem(localKey, String(video.currentTime));
    localStorage.setItem(VOL_KEY, String(video.volume));
    if (isLoggedIn()) {
      api.saveProgress({
        media_type: mediaType, media_id: mediaId, title,
        position_seconds: video.currentTime,
        duration_seconds: Number.isFinite(video.duration) ? video.duration : 0,
      }).catch(() => {});
    }
  }, [localKey, mediaType, mediaId, title]);

  useEffect(() => {
    timerRef.current = setInterval(persist, SAVE_EVERY);
    return () => clearInterval(timerRef.current);
  }, [persist]);

  const applyRate = (r) => {
    setRate(r); setSpeed(false);
    localStorage.setItem(RATE_KEY, String(r));
    if (videoRef.current) videoRef.current.playbackRate = r;
  };

  const toggleFullscreen = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  const toggleCaptions = useCallback(() => {
    const v = videoRef.current;
    const track = v?.textTracks?.[0];
    if (!track) return;
    const next = track.mode !== 'showing';
    track.mode = next ? 'showing' : 'disabled';
    setCaps(next);
  }, []);

const handleClose = useCallback(() => {
  clearInterval(timerRef.current);
  onClose();
}, [onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const v = videoRef.current;
      if (e.key === 'Escape') { handleClose(); return; }
      if (!v) return;
      switch (e.key.toLowerCase()) {
        case ' ': case 'k': e.preventDefault(); v.paused ? v.play() : v.pause(); break;
        case 'arrowright': v.currentTime += 5; break;
        case 'arrowleft':  v.currentTime -= 5; break;
        case 'l': v.currentTime += 10; break;
        case 'j': v.currentTime -= 10; break;
        case 'arrowup':   e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); break;
        case 'arrowdown': e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); break;
        case 'm': v.muted = !v.muted; break;
        case 'f': toggleFullscreen(); break;
        case 'c': toggleCaptions(); break;
        default: break;
      }
    };
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [handleClose, toggleFullscreen, toggleCaptions]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div ref={boxRef} className="relative w-full max-w-5xl mx-4 rounded-2xl overflow-hidden bg-black shadow-2xl">
        {/* Top control bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end gap-1.5 p-3 bg-gradient-to-b from-black/70 to-transparent">
          {/* Speed */}
          <div className="relative">
            <button onClick={() => setSpeed(s => !s)} className="flex items-center gap-1 px-2.5 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white text-xs font-semibold transition" title="Playback speed">
              <Gauge size={14} /> {rate}×
            </button>
            {speedOpen && (
              <div className="absolute right-0 top-full mt-1 glass-dark rounded-lg overflow-hidden shadow-xl">
                {SPEEDS.map(s => (
                  <button key={s} onClick={() => applyRate(s)} className={`block w-full text-left px-4 py-1.5 text-xs transition ${s === rate ? 'text-accent bg-accent/10' : 'text-white hover:bg-white/10'}`}>
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Captions */}
          <button onClick={toggleCaptions} className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${captions ? 'bg-accent text-white' : 'bg-black/50 hover:bg-black/70 text-white'}`} title="Captions (c)">
            <Captions size={15} />
          </button>
          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition" title="Fullscreen (f)">
            <Maximize size={15} />
          </button>
          {/* Shortcuts help */}
          <button onClick={() => setHelp(h => !h)} className="w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition" title="Keyboard shortcuts">
            <Keyboard size={15} />
          </button>
          {/* Close */}
          <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-black/50 hover:bg-accent text-white flex items-center justify-center transition" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts overlay */}
        {showHelp && (
          <div className="absolute top-14 right-3 z-20 glass-dark rounded-xl p-4 text-xs text-white shadow-xl w-52" onClick={() => setHelp(false)}>
            <p className="font-bold mb-2">Keyboard shortcuts</p>
            {[['Space / K', 'Play / pause'], ['← / →', 'Seek 5s'], ['J / L', 'Seek 10s'], ['↑ / ↓', 'Volume'], ['M', 'Mute'], ['F', 'Fullscreen'], ['C', 'Captions'], ['Esc', 'Close']].map(([k, d]) => (
              <div key={k} className="flex justify-between py-0.5"><span className="text-muted">{d}</span><kbd className="bg-white/10 px-1.5 rounded">{k}</kbd></div>
            ))}
          </div>
        )}

        {/* Video */}
        {error ? (
          <div className="aspect-video flex items-center justify-center text-muted">
            <div className="text-center">
              <p className="text-lg font-semibold text-white mb-2">Playback unavailable</p>
              <p className="text-sm text-muted">{error}</p>
            </div>
          </div>
        ) : !info ? (
          <div className="aspect-video flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
<iframe src="https://www.2embed.online/embed/movie/{mediaId}"
        width="100%" height="100%"
        frameborder="0" allowfullscreen></iframe>
        )}

        {/* Bottom bar */}
        {info && (
          <div className="px-4 py-3 bg-black/80 flex items-center justify-between gap-4">
            <span className="text-white font-semibold text-sm truncate">{title || 'Now Playing'}</span>
            {info.license && <span className="text-muted text-xs shrink-0">{info.license}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
