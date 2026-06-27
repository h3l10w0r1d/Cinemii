import { useState } from 'react';
import { Star, Award, Clapperboard, Swords, Laugh, Rocket, Eye, Ghost, Tv } from 'lucide-react';
import { MovieSection } from '../components/home/MovieSection';
import { CinemaPlayer } from '../components/player/CinemaPlayer';
import { useTMDB } from '../hooks/useTMDB';
import {
  fetchPopular, fetchTopRated, fetchNowPlaying,
  fetchPopularTV, fetchTopRatedTV, fetchByGenre, fetchTVByGenre,
  discoverMovies,
} from '../core/tmdb';

function WatchPage({ title, subtitle, children, player, onClose }) {
  return (
    <div className="min-h-screen bg-bg pt-24 pb-20">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-10 flex flex-col gap-14">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">{title}</h1>
          {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
        </div>
        {children}
      </div>
      {player && <CinemaPlayer {...player} onClose={onClose} />}
    </div>
  );
}

export function Movies() {
  const [player, setPlayer] = useState(null);
  const popular   = useTMDB(fetchPopular);
  const topRated  = useTMDB(fetchTopRated);
  const now       = useTMDB(fetchNowPlaying);
  const action    = useTMDB(() => fetchByGenre(28),  []);
  const comedy    = useTMDB(() => fetchByGenre(35),  []);
  const scifi     = useTMDB(() => fetchByGenre(878), []);
  const thriller  = useTMDB(() => fetchByGenre(53),  []);
  const horror    = useTMDB(() => fetchByGenre(27),  []);

  const handleWatch = (movie, type) =>
    setPlayer({ mediaType: type || 'movie', mediaId: String(movie.id), title: movie.title || movie.name || '' });

  return (
    <WatchPage title="Movies" subtitle="Browse the full catalog" player={player} onClose={() => setPlayer(null)}>
      <MovieSection title="Popular"    icon={Star}        movies={popular.data?.results  || []} loading={popular.loading}  onWatchClick={handleWatch} />
      <MovieSection title="Top Rated"  icon={Award}       movies={topRated.data?.results || []} loading={topRated.loading} onWatchClick={handleWatch} />
      <MovieSection title="Now Playing" icon={Clapperboard} movies={now.data?.results    || []} loading={now.loading}      onWatchClick={handleWatch} />
      <MovieSection title="Action"     icon={Swords}      movies={action.data?.results   || []} loading={action.loading}   onWatchClick={handleWatch} />
      <MovieSection title="Comedy"     icon={Laugh}       movies={comedy.data?.results   || []} loading={comedy.loading}   onWatchClick={handleWatch} />
      <MovieSection title="Sci-Fi"     icon={Rocket}      movies={scifi.data?.results    || []} loading={scifi.loading}    onWatchClick={handleWatch} />
      <MovieSection title="Thriller"   icon={Eye}         movies={thriller.data?.results || []} loading={thriller.loading} onWatchClick={handleWatch} />
      <MovieSection title="Horror"     icon={Ghost}       movies={horror.data?.results   || []} loading={horror.loading}   onWatchClick={handleWatch} />
    </WatchPage>
  );
}

export function TVShows() {
  const [player, setPlayer] = useState(null);

  const popular  = useTMDB(fetchPopularTV);
  const topRated = useTMDB(fetchTopRatedTV);
  const action   = useTMDB(() => fetchTVByGenre(10759), []);
  const comedy   = useTMDB(() => fetchTVByGenre(35), []);
  const scifi    = useTMDB(() => fetchTVByGenre(10765), []);
  const drama    = useTMDB(() => fetchTVByGenre(18), []);
  const crime    = useTMDB(() => fetchTVByGenre(80), []);
  const mystery  = useTMDB(() => fetchTVByGenre(9648), []);

  const handleWatch = (movie) =>
    setPlayer({ mediaType: 'tv', mediaId: String(movie.id), title: movie.name || '' });

  return (
    <WatchPage title="TV Shows" subtitle="Binge-worthy series" player={player} onClose={() => setPlayer(null)}>
      <MovieSection title="Popular" icon={Tv} movies={popular.data?.results || []} loading={popular.loading} mediaType="tv" onWatchClick={handleWatch} />
      <MovieSection title="Top Rated" icon={Award} movies={topRated.data?.results || []} loading={topRated.loading} mediaType="tv" onWatchClick={handleWatch} />
      <MovieSection title="Action & Adventure" icon={Swords} movies={action.data?.results || []} loading={action.loading} mediaType="tv" onWatchClick={handleWatch} />
      <MovieSection title="Comedy" icon={Laugh} movies={comedy.data?.results || []} loading={comedy.loading} mediaType="tv" onWatchClick={handleWatch} />
      <MovieSection title="Sci-Fi & Fantasy" icon={Rocket} movies={scifi.data?.results || []} loading={scifi.loading} mediaType="tv" onWatchClick={handleWatch} />
      <MovieSection title="Drama" icon={Clapperboard} movies={drama.data?.results || []} loading={drama.loading} mediaType="tv" onWatchClick={handleWatch} />
      <MovieSection title="Crime" icon={Eye} movies={crime.data?.results || []} loading={crime.loading} mediaType="tv" onWatchClick={handleWatch} />
      <MovieSection title="Mystery" icon={Ghost} movies={mystery.data?.results || []} loading={mystery.loading} mediaType="tv" onWatchClick={handleWatch} />
    </WatchPage>
  );
}

export function TopRated() {
  const [player, setPlayer] = useState(null);

  const all      = useTMDB(fetchTopRated);
  const action   = useTMDB(() => discoverMovies({ with_genres: 28,  sort_by: 'vote_average.desc', 'vote_count.gte': 500 }), []);
  const comedy   = useTMDB(() => discoverMovies({ with_genres: 35,  sort_by: 'vote_average.desc', 'vote_count.gte': 500 }), []);
  const drama    = useTMDB(() => discoverMovies({ with_genres: 18,  sort_by: 'vote_average.desc', 'vote_count.gte': 500 }), []);
  const crime    = useTMDB(() => discoverMovies({ with_genres: 80,  sort_by: 'vote_average.desc', 'vote_count.gte': 500 }), []);
  const mystery  = useTMDB(() => discoverMovies({ with_genres: 9648, sort_by: 'vote_average.desc', 'vote_count.gte': 500 }), []);
  const horror   = useTMDB(() => discoverMovies({ with_genres: 27,  sort_by: 'vote_average.desc', 'vote_count.gte': 300 }), []);
  const thriller = useTMDB(() => discoverMovies({ with_genres: 53,  sort_by: 'vote_average.desc', 'vote_count.gte': 500 }), []);

  const handleWatch = (movie, type) =>
    setPlayer({
      mediaType: type || 'movie',
      mediaId: String(movie.id),
      title: movie.title || movie.name || '',
    });

  return (
    <WatchPage title="Top Rated" subtitle="The highest-rated films by category" player={player} onClose={() => setPlayer(null)}>
      <MovieSection title="Top Rated All Time" icon={Award} movies={all.data?.results || []} loading={all.loading} onWatchClick={handleWatch} />
      <MovieSection title="Top Rated Action" icon={Swords} movies={action.data?.results || []} loading={action.loading} onWatchClick={handleWatch} />
      <MovieSection title="Top Rated Comedy" icon={Laugh} movies={comedy.data?.results || []} loading={comedy.loading} onWatchClick={handleWatch} />
      <MovieSection title="Top Rated Drama" icon={Clapperboard} movies={drama.data?.results || []} loading={drama.loading} onWatchClick={handleWatch} />
      <MovieSection title="Top Rated Crime" icon={Eye} movies={crime.data?.results || []} loading={crime.loading} onWatchClick={handleWatch} />
      <MovieSection title="Top Rated Mystery" icon={Ghost} movies={mystery.data?.results || []} loading={mystery.loading} onWatchClick={handleWatch} />
      <MovieSection title="Top Rated Horror" icon={Ghost} movies={horror.data?.results || []} loading={horror.loading} onWatchClick={handleWatch} />
      <MovieSection title="Top Rated Thriller" icon={Eye} movies={thriller.data?.results || []} loading={thriller.loading} onWatchClick={handleWatch} />
    </WatchPage>
  );
}
