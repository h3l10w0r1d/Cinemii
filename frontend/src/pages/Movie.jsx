import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Heart, Clapperboard, Star, Clock, Calendar, Tag, User, Bookmark, BookmarkCheck } from 'lucide-react';
import { fetchMovie, fetchTV, imgUrl, backdropUrl } from '../core/tmdb';
import { useFavorites } from '../contexts/FavoritesContext';
import { useToast } from '../contexts/ToastContext';
import { api, isLoggedIn } from '../core/backend';
import { MovieSection } from '../components/home/MovieSection';
import { CinemaPlayer } from '../components/player/CinemaPlayer';
import { TrailerModal } from '../components/player/TrailerModal';
import { SeasonPicker } from '../components/movie/SeasonPicker';
import { RatingReview } from '../components/movie/RatingReview';
import { Skeleton } from '../components/ui/Skeleton';

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white ${className}`}>
      {children}
    </span>
  );
}

export function Movie() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const loc       = useLocation();
  const isTV      = loc.pathname.startsWith('/tv/');
  const mediaType = isTV ? 'tv' : 'movie';
  const { isFavorite, toggleFavorite } = useFavorites();
  const { success, error: toastError } = useToast();

  const [movie,    setMovie]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [player,   setPlayer]   = useState(false);
  const [trailer,  setTrailer]  = useState(null);
  const [inWatchlist, setInWL]  = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setMovie(null);
    const fetcher = isTV ? fetchTV : fetchMovie;
    fetcher(id).then(setMovie).catch(console.error).finally(() => setLoading(false));
  }, [id, isTV]);

  // Initial watchlist membership
  useEffect(() => {
  if (!isLoggedIn() || typeof api.listWatchlist !== 'function') {
    setInWL(false);
    return;
  }

  api.listWatchlist()
    .then(list => {
      setInWL(
        (list || []).some(
          w => String(w.media_id) === String(id) && w.media_type === mediaType
        )
      );
    })
    .catch(() => setInWL(false));
}, [id, mediaType]);

  const toggleWatchlist = async () => {
  if (!isLoggedIn()) return;

  if (
    typeof api.listWatchlist !== 'function' ||
    typeof api.addWatchlist !== 'function' ||
    typeof api.removeWatchlist !== 'function'
  ) {
    toastError('Watchlist is not ready yet.');
    return;
  }

  try {
    if (inWatchlist) {
      await api.removeWatchlist(mediaType, id);
      success('Removed from your watchlist');
    } else {
      await api.addWatchlist({
        media_type: mediaType,
        media_id: String(id),
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
      });
      success('Added to your watchlist');
    }

    setInWL(v => !v);
  } catch {
    toastError('Could not update watchlist.');
  }
};

  if (loading) return <DetailSkeleton />;
  if (!movie)  return <div className="min-h-screen flex items-center justify-center text-muted">Not found.</div>;

  const favd        = isFavorite(mediaType, id);
  const title       = movie.title || movie.name || '';
  const overview    = movie.overview || '';
  const rating      = movie.vote_average?.toFixed(1);
  const runtime     = movie.runtime ? `${movie.runtime}m` : movie.episode_run_time?.[0] ? `${movie.episode_run_time[0]}m/ep` : null;
  const year        = (movie.release_date || movie.first_air_date || '').slice(0, 4);
  const genres      = (movie.genres || []).slice(0, 4);
  const cast        = (movie.credits?.cast || []).slice(0, 12);
  const crew        = movie.credits?.crew || [];
  const director    = crew.find(c => c.job === 'Director')?.name;
  const writer      = crew.find(c => c.job === 'Writer' || c.job === 'Screenplay')?.name;
  const recs        = (movie.recommendations?.results || []).filter(r => r.poster_path).slice(0, 20);
  const similar     = (movie.similar?.results || []).filter(r => r.poster_path).slice(0, 20);
  const trailerKey  = movie.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key;
  const seasons     = (movie.seasons || []).filter(s => s.season_number > 0);

  return (
    <div className="min-h-screen bg-bg">
      {/* Backdrop */}
      <div className="relative w-full h-[55vh] min-h-[400px] overflow-hidden">
        {movie.backdrop_path
          ? <img src={backdropUrl(movie.backdrop_path)} alt="" className="w-full h-full object-cover object-top" />
          : <div className="w-full h-full bg-surface" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-20 left-6 md:left-10 z-10 flex items-center gap-2 glass rounded-xl px-4 py-2 text-white text-sm font-medium hover:bg-white/10 transition"
        >
          <ArrowLeft size={15} /> Back
        </button>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 -mt-52 relative z-10 pb-24">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <img
              src={imgUrl(movie.poster_path, 'w342')}
              alt={title}
              className="w-44 md:w-60 rounded-2xl shadow-2xl shadow-black/80 ring-1 ring-white/10 rotate-1"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 md:pt-16">
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">{title}</h1>

            <div className="flex flex-wrap items-center gap-2">
              {rating && <Badge><Star size={11} className="text-yellow-400" /> {rating}</Badge>}
              {year   && <Badge><Calendar size={11} /> {year}</Badge>}
              {runtime && <Badge><Clock size={11} /> {runtime}</Badge>}
              {isTV && movie.number_of_seasons && <Badge>{movie.number_of_seasons} Season{movie.number_of_seasons > 1 ? 's' : ''}</Badge>}
              {genres.map(g => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/genre/${g.id}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-accent hover:text-white transition"
                >
                  <Tag size={11} /> {g.name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {director && <p className="text-muted">Directed by <span className="text-white font-semibold">{director}</span></p>}
              {writer   && <p className="text-muted">Written by <span className="text-white font-semibold">{writer}</span></p>}
            </div>

            <p className="text-white/80 leading-relaxed text-base line-clamp-4 max-w-2xl">{overview}</p>

            <div className="flex flex-wrap gap-3 mt-1">
              <button
                onClick={() => setPlayer(true)}
                className="gradient-accent text-white font-bold px-7 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent/30 flex items-center gap-2"
              >
                <Play size={17} fill="white" /> Watch Now
              </button>
              {trailerKey && (
                <button
                  onClick={() => setTrailer(trailerKey)}
                  className="glass text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/10 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Clapperboard size={17} /> Trailer
                </button>
              )}
              <button
                onClick={() => toggleFavorite(movie, mediaType)}
                className={`glass font-semibold px-5 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${favd ? 'text-accent border border-accent/40' : 'text-white hover:bg-white/10'}`}
              >
                <Heart size={17} fill={favd ? 'currentColor' : 'none'} /> {favd ? 'Saved' : 'Favorite'}
              </button>
              {isLoggedIn() && (
                <button
                  onClick={toggleWatchlist}
                  className={`glass font-semibold px-5 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${inWatchlist ? 'text-accent border border-accent/40' : 'text-white hover:bg-white/10'}`}
                >
                  {inWatchlist ? <BookmarkCheck size={17} /> : <Bookmark size={17} />} {inWatchlist ? 'In Watchlist' : 'Watchlist'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rating & review */}
        <RatingReview mediaType={mediaType} mediaId={id} title={movie.title || movie.name} posterPath={movie.poster_path} />

        {/* TV seasons / episodes */}
        {isTV && seasons.length > 0 && (
          <div className="mt-14">
            <SeasonPicker tvId={id} seasons={seasons} onPlay={() => setPlayer(true)} />
          </div>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <div className="mt-14">
            <h2 className="text-lg font-bold text-white mb-5">Cast</h2>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {cast.map(person => (
                <button
                  key={person.id}
                  onClick={() => navigate(`/person/${person.id}`)}
                  className="flex-shrink-0 w-24 text-center group"
                >
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-surface ring-2 ring-white/10 mb-2 group-hover:ring-accent/60 transition">
                    {person.profile_path
                      ? <img src={imgUrl(person.profile_path, 'w185')} alt={person.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-muted"><User size={24} /></div>
                    }
                  </div>
                  <p className="text-white text-xs font-semibold leading-tight line-clamp-2 group-hover:text-accent transition">{person.name}</p>
                  <p className="text-muted text-xs mt-0.5 line-clamp-1">{person.character}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {recs.length > 0 && (
          <div className="mt-14">
            <MovieSection title="More Like This" movies={recs} mediaType={mediaType} />
          </div>
        )}
        {similar.length > 0 && recs.length === 0 && (
          <div className="mt-14">
            <MovieSection title="Similar" movies={similar} mediaType={mediaType} />
          </div>
        )}
      </div>

      {player  && <CinemaPlayer mediaType={mediaType} mediaId={String(id)} title={title} onClose={() => setPlayer(false)} />}
      {trailer && <TrailerModal youtubeKey={trailer} onClose={() => setTrailer(null)} />}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-bg">
      <Skeleton className="w-full h-[55vh]" />
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 -mt-40 relative z-10 pb-20">
        <div className="flex gap-10">
          <Skeleton className="w-56 h-80 rounded-2xl flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-4 pt-20">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-36 rounded-xl" />
              <Skeleton className="h-12 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
