import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Play, Calendar, Check, CheckCircle2 } from 'lucide-react';
import { fetchTVSeason, imgUrl } from '../../core/tmdb';
import { api, isLoggedIn } from '../../core/backend';
import { Skeleton } from '../ui/Skeleton';

export function SeasonPicker({ tvId, seasons, onPlay }) {
  const [selected, setSelected]   = useState(seasons[0]?.season_number ?? 1);
  const [episodes, setEpisodes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(false);
  const [watched, setWatched]     = useState(() => new Set()); // "s:e"

  const key = (s, e) => `${s}:${e}`;

  // Load watched episodes once.
  useEffect(() => {
    if (!isLoggedIn()) return;
    api.listEpisodes(tvId)
      .then(list => setWatched(new Set((list || []).map(x => key(x.season, x.episode)))))
      .catch(() => {});
  }, [tvId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTVSeason(tvId, selected)
      .then((data) => { if (!cancelled) setEpisodes(data.episodes || []); })
      .catch(() => { if (!cancelled) setEpisodes([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tvId, selected]);

  const current = seasons.find(s => s.season_number === selected);
  const watchedInSeason = episodes.filter(ep => watched.has(key(selected, ep.episode_number))).length;
  const nextUp = episodes.find(ep => !watched.has(key(selected, ep.episode_number)));

  const toggleWatched = useCallback(async (ep) => {
    if (!isLoggedIn()) return;
    const k = key(selected, ep.episode_number);
    const isWatched = watched.has(k);
    setWatched(prev => { const n = new Set(prev); isWatched ? n.delete(k) : n.add(k); return n; });
    try {
      if (isWatched) await api.unmarkEpisode(tvId, selected, ep.episode_number);
      else await api.markEpisode(tvId, selected, ep.episode_number);
    } catch {
      setWatched(prev => { const n = new Set(prev); isWatched ? n.add(k) : n.delete(k); return n; });
    }
  }, [tvId, selected, watched]);

  return (
    <div>
      {/* Header with season dropdown + progress */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">Episodes</h2>
          {isLoggedIn() && episodes.length > 0 && (
            <span className="text-xs text-muted">{watchedInSeason}/{episodes.length} watched</span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 glass rounded-xl px-4 py-2 text-white text-sm font-semibold hover:bg-white/10 transition"
          >
            {current?.name || `Season ${selected}`}
            <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-48 glass-dark rounded-xl shadow-xl overflow-hidden z-20 max-h-64 overflow-y-auto border border-white/5">
              {seasons.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s.season_number); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between ${s.season_number === selected ? 'text-accent bg-accent/10' : 'text-white hover:bg-white/5'}`}
                >
                  <span>{s.name}</span>
                  <span className="text-muted text-xs">{s.episode_count} ep</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Season progress bar */}
      {isLoggedIn() && episodes.length > 0 && (
        <div className="w-full h-1 bg-white/10 rounded-full mb-5">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(watchedInSeason / episodes.length) * 100}%` }} />
        </div>
      )}

      {/* Episode list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {episodes.map(ep => {
            const isWatched = watched.has(key(selected, ep.episode_number));
            const isNext = nextUp && ep.episode_number === nextUp.episode_number;
            return (
              <div key={ep.id} className={`flex gap-4 glass rounded-xl p-3 transition group ${isWatched ? 'opacity-60' : ''}`}>
                {/* Thumbnail → play */}
                <button onClick={() => onPlay?.(selected, ep.episode_number)} className="relative w-36 h-20 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                  {ep.still_path
                    ? <img src={imgUrl(ep.still_path, 'w300')} alt={ep.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-muted text-xs">No preview</div>
                  }
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Play size={24} className="text-white" fill="white" />
                  </div>
                  {isNext && <span className="absolute top-1 left-1 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded">NEXT UP</span>}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-accent font-bold text-sm">E{ep.episode_number}</span>
                    <span className="text-white font-semibold text-sm line-clamp-1">{ep.name}</span>
                  </div>
                  <p className="text-muted text-xs line-clamp-2 mb-1">{ep.overview || 'No description available.'}</p>
                  <div className="flex items-center gap-3 text-muted text-xs">
                    {ep.air_date && <span className="flex items-center gap-1"><Calendar size={11} /> {ep.air_date}</span>}
                    {ep.vote_average > 0 && <span>★ {ep.vote_average.toFixed(1)}</span>}
                    {ep.runtime && <span>{ep.runtime}m</span>}
                  </div>
                </div>

                {/* Watched toggle */}
                {isLoggedIn() && (
                  <button
                    onClick={() => toggleWatched(ep)}
                    title={isWatched ? 'Mark unwatched' : 'Mark watched'}
                    className={`self-center flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition ${isWatched ? 'text-accent' : 'text-muted hover:text-white border-2 border-white/20 hover:border-white'}`}
                  >
                    {isWatched ? <CheckCircle2 size={22} fill="currentColor" className="text-accent" /> : <Check size={16} />}
                  </button>
                )}
              </div>
            );
          })}
          {episodes.length === 0 && (
            <p className="text-muted text-sm text-center py-8">No episode information available for this season.</p>
          )}
        </div>
      )}
    </div>
  );
}
