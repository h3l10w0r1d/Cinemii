import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { discoverMovies } from '../../core/tmdb';
import { MovieCard } from '../movie/MovieCard';
import { MovieCardSkeleton } from '../ui/Skeleton';
import { useWatch } from '../../hooks/useWatch';

// Each mood maps to a TMDB discover query — a curated "AI" pick.
// Genres are OR-joined ('|') so every mood returns a rich result set.
const MOODS = [
  { key: 'cozy',       emoji: '🛋️', label: 'Cozy night in',   params: { with_genres: '10751|35|16', 'vote_average.gte': 6.5 } },
  { key: 'intense',    emoji: '🔥', label: 'Edge of my seat', params: { with_genres: '28|53|80', 'vote_average.gte': 6.5 } },
  { key: 'mindbend',   emoji: '🧠', label: 'Mind-bending',    params: { with_genres: '878|9648', 'vote_average.gte': 6.5 } },
  { key: 'feelgood',   emoji: '😄', label: 'Feel-good',       params: { with_genres: '35|10749|10402', 'vote_average.gte': 6.5 } },
  { key: 'romantic',   emoji: '💕', label: 'Romantic',        params: { with_genres: '10749|18', 'vote_average.gte': 6.5 } },
  { key: 'scary',      emoji: '😱', label: 'Spooky',          params: { with_genres: '27|53', 'vote_average.gte': 6 } },
  { key: 'adventure',  emoji: '🗺️', label: 'Adventurous',     params: { with_genres: '12|14', 'vote_average.gte': 6.5 } },
  { key: 'tearjerker', emoji: '😢', label: 'A good cry',      params: { with_genres: '18', 'vote_average.gte': 7 } },
  { key: 'nostalgic',  emoji: '📼', label: 'Nostalgic',       params: { 'primary_release_date.lte': '2005-12-31', 'vote_average.gte': 7, 'vote_count.gte': 500 } },
  { key: 'epic',       emoji: '⚔️', label: 'Epic & grand',    params: { with_genres: '12|36|10752', 'vote_average.gte': 6.8 } },
];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor((i + 1) * ((Date.now() % 9973) / 9973));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function MoodRecommender({ onClose }) {
  const [mood, setMood]       = useState(null);
  const [movies, setMovies]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    pick(MOODS[0]); // load a default mood so the modal is never empty
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = async (m) => {
    setMood(m.key); setLoading(true);
    try {
      let data = await discoverMovies({ ...m.params, page: 1 });
      let results = (data.results || []).filter(x => x.poster_path);
      // Fallback: if a strict filter returned little, relax the rating gate.
      if (results.length < 6) {
        const { ['vote_average.gte']: _drop, ...relaxed } = m.params;
        data = await discoverMovies({ ...relaxed, page: 1 });
        results = (data.results || []).filter(x => x.poster_path);
      }
      setMovies(shuffle(results).slice(0, 18));
    } catch { setMovies([]); }
    setLoading(false);
  };

  const watch = useWatch();
  const handleWatch = (movie, type) => { onClose(); watch(movie, type); };

  return (
    <div className="fixed inset-0 z-[9996] bg-black/85 backdrop-blur-md overflow-y-auto animate-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-w-screen-xl mx-auto px-6 py-10 animate-pop">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-accent/30">
              <Sparkles size={22} className="text-white" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white">What's the mood?</h1>
              <p className="text-muted text-sm">Pick a vibe and I'll find something for you.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-white/10 transition">
            <X size={18} />
          </button>
        </div>

        {/* Mood chips */}
        <div className="flex flex-wrap gap-2.5 mb-8">
          {MOODS.map(m => (
            <button
              key={m.key}
              onClick={() => pick(m)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                mood === m.key ? 'gradient-accent text-white shadow-lg shadow-accent/30' : 'glass text-white hover:bg-white/10'
              }`}
            >
              <span>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {!mood ? (
          <div className="text-center py-20 text-muted">
            <Sparkles size={42} className="mx-auto mb-4 opacity-20" />
            <p>Choose a mood above to get personalized picks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {loading
              ? Array.from({ length: 12 }).map((_, i) => <MovieCardSkeleton key={i} />)
              : movies.map(m => <MovieCard key={m.id} movie={m} onWatchClick={handleWatch} />)
            }
          </div>
        )}

        {!loading && mood && movies.length === 0 && (
          <p className="text-center text-muted py-10">No picks found — try another mood.</p>
        )}
      </div>

    </div>
  );
}
