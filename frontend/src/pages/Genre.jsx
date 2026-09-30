import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { GENRES, fetchByGenrePaged } from '../core/tmdb';
import { MovieCard } from '../components/movie/MovieCard';
import { useWatch } from '../hooks/useWatch';
import { MovieCardSkeleton } from '../components/ui/Skeleton';

const discover = (genreId, page) => fetchByGenrePaged(genreId, page);

export function Genre() {
  const { id }                = useParams();
  const [movies, setMovies]   = useState([]);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLM]  = useState(false);
  const genre                 = GENRES.find(g => String(g.id) === String(id));

  // Reset when genre changes
  useEffect(() => {
    setMovies([]);
    setPage(1);
    setLoading(true);
    discover(id, 1)
      .then(data => setMovies((data.results || []).filter(m => m.poster_path)))
      .catch(() => {})
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [id]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setLM(true);
    discover(id, next)
      .then(data => {
        setMovies(prev => [...prev, ...(data.results || []).filter(m => m.poster_path)]);
        setPage(next);
      })
      .catch(() => {})
      .finally(() => setLM(false));
  }, [id, page]);

  const handleWatch = useWatch();

  return (
    <div className="min-h-screen bg-bg pt-24 pb-20">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-10">
        <h1 className="text-3xl font-black text-white mb-2">{genre?.name || 'Genre'}</h1>
        <p className="text-muted text-sm mb-8">Browse {genre?.name?.toLowerCase() || ''} movies</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {loading
            ? Array.from({ length: 18 }).map((_, i) => <MovieCardSkeleton key={i} />)
            : movies.map(m => (
                <MovieCard key={m.id} movie={m} mediaType="movie" onWatchClick={handleWatch} />
              ))
          }
        </div>

        {!loading && movies.length > 0 && (
          <div className="flex justify-center mt-10">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="gradient-accent text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition active:scale-95 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load More'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
