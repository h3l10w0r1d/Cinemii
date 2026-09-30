import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Clapperboard, Star, Award, Tv, Swords, Laugh, Rocket,
  Eye, Ghost, Drama, Search, Wand2, Heart, Film,
} from 'lucide-react';
import { Hero } from '../components/home/Hero';
import { MovieSection } from '../components/home/MovieSection';
import { RankedRow } from '../components/home/RankedRow';
import { LiveStreams } from '../components/home/LiveStreams';
import { ContinueWatching } from '../components/home/ContinueWatching';
import { BecauseYouWatched } from '../components/home/BecauseYouWatched';
import { GenreRow } from '../components/home/GenreRow';
import { TastePicker } from '../components/home/TastePicker';
import { useWatch } from '../hooks/useWatch';
import { getTaste, hasChosenTaste, genreName } from '../core/taste';
import { useTMDB } from '../hooks/useTMDB';
import { useLazyTMDB } from '../hooks/useLazyTMDB';
import { usePersonalizedRecs } from '../hooks/usePersonalizedRecs';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchTrending, fetchNowPlaying, fetchPopular,
  fetchTopRated, fetchPopularTV, fetchTopRatedTV, fetchByGenre,
} from '../core/tmdb';

const fetchAction   = () => fetchByGenre(28);
const fetchComedy   = () => fetchByGenre(35);
const fetchScifi    = () => fetchByGenre(878);
const fetchThriller = () => fetchByGenre(53);
const fetchHorror   = () => fetchByGenre(27);
const fetchDrama    = () => fetchByGenre(18);
const fetchCrime    = () => fetchByGenre(80);
const fetchFantasy  = () => fetchByGenre(14);
const fetchAnim     = () => fetchByGenre(16);
const fetchRomance  = () => fetchByGenre(10749);

const slice = (data, n = 14) => (data?.results || []).slice(0, n);

export function Home() {
  const navigate            = useNavigate();
  const { loggedIn }        = useAuth();
  const { movies: recs, loading: recsLoading } = usePersonalizedRecs();
  const [showTaste, setShowTaste] = useState(() => !hasChosenTaste());
  const [taste, setTasteState]    = useState(() => getTaste());

  // Above-the-fold: eager
  const trending   = useTMDB(fetchTrending);
  const nowPlaying = useTMDB(fetchNowPlaying);

  // Below-the-fold: lazy
  const popular    = useLazyTMDB(fetchPopular);
  const topRated   = useLazyTMDB(fetchTopRated);
  const tv         = useLazyTMDB(fetchPopularTV);
  const topRatedTV = useLazyTMDB(fetchTopRatedTV);
  const action     = useLazyTMDB(fetchAction);
  const comedy     = useLazyTMDB(fetchComedy);
  const scifi      = useLazyTMDB(fetchScifi);
  const thriller   = useLazyTMDB(fetchThriller);
  const horror     = useLazyTMDB(fetchHorror);
  const drama      = useLazyTMDB(fetchDrama);
  const crime      = useLazyTMDB(fetchCrime);
  const fantasy    = useLazyTMDB(fetchFantasy);
  const anim       = useLazyTMDB(fetchAnim);
  const romance    = useLazyTMDB(fetchRomance);

  const handleWatch = useWatch();

  const genre = (id) => () => navigate(`/genre/${id}`);
  const toMovies = () => navigate('/movies');
  const toTV     = () => navigate('/tv-shows');

  return (
    <div className="min-h-screen">
      <Hero movies={slice(trending.data, 8)} loading={trending.loading} onWatchClick={handleWatch} />

      <div className="max-w-screen-2xl mx-auto px-6 md:px-10 pb-24 flex flex-col gap-10 mt-10">

        {loggedIn && <ContinueWatching onWatchClick={handleWatch} />}

        <LiveStreams />

        {loggedIn && (recs.length > 0 || recsLoading) && (
          <MovieSection title="Recommended For You" icon={Sparkles} movies={recs} loading={recsLoading} onWatchClick={handleWatch} />
        )}

        {/* Because you watched … */}
        {loggedIn && <BecauseYouWatched onWatchClick={handleWatch} />}

        {/* Taste-based picks (from the first-run genre picker) */}
        {taste.slice(0, 4).map(id => (
          <GenreRow key={`taste-${id}`} genreId={id} title={`${genreName(id)} picks for you`} icon={Sparkles} onWatchClick={handleWatch} />
        ))}

        <MovieSection title="Now Playing"   icon={Clapperboard} movies={slice(nowPlaying.data)} loading={nowPlaying.loading} onWatchClick={handleWatch} onSeeAll={toMovies} />

        {/* Netflix-style ranked row */}
        <RankedRow title="Top 10 This Week" movies={trending.data?.results || []} loading={trending.loading} />

        <MovieSection title="Popular Movies" icon={Star}  movies={slice(popular.data)}    loading={popular.loading}    onWatchClick={handleWatch} sectionRef={popular.ref}    onSeeAll={toMovies} />
        <MovieSection title="Top Rated"      icon={Award} movies={slice(topRated.data)}   loading={topRated.loading}   onWatchClick={handleWatch} sectionRef={topRated.ref}   onSeeAll={() => navigate('/top-rated')} />
        <MovieSection title="Popular TV Shows" icon={Tv}  movies={slice(tv.data)}         loading={tv.loading}         onWatchClick={handleWatch} sectionRef={tv.ref} mediaType="tv" onSeeAll={toTV} />
        <MovieSection title="Top Rated TV"   icon={Star}  movies={slice(topRatedTV.data)} loading={topRatedTV.loading} onWatchClick={handleWatch} sectionRef={topRatedTV.ref} mediaType="tv" onSeeAll={toTV} />
        <MovieSection title="Action"      icon={Swords} movies={slice(action.data)}   loading={action.loading}   onWatchClick={handleWatch} sectionRef={action.ref}   onSeeAll={genre(28)} />
        <MovieSection title="Comedy"      icon={Laugh}  movies={slice(comedy.data)}   loading={comedy.loading}   onWatchClick={handleWatch} sectionRef={comedy.ref}   onSeeAll={genre(35)} />
        <MovieSection title="Sci-Fi"      icon={Rocket} movies={slice(scifi.data)}    loading={scifi.loading}    onWatchClick={handleWatch} sectionRef={scifi.ref}    onSeeAll={genre(878)} />
        <MovieSection title="Thriller"    icon={Eye}    movies={slice(thriller.data)} loading={thriller.loading} onWatchClick={handleWatch} sectionRef={thriller.ref} onSeeAll={genre(53)} />
        <MovieSection title="Horror"      icon={Ghost}  movies={slice(horror.data)}   loading={horror.loading}   onWatchClick={handleWatch} sectionRef={horror.ref}   onSeeAll={genre(27)} />
        <MovieSection title="Drama"       icon={Drama}  movies={slice(drama.data)}    loading={drama.loading}    onWatchClick={handleWatch} sectionRef={drama.ref}    onSeeAll={genre(18)} />
        <MovieSection title="Crime"       icon={Search} movies={slice(crime.data)}    loading={crime.loading}    onWatchClick={handleWatch} sectionRef={crime.ref}    onSeeAll={genre(80)} />
        <MovieSection title="Fantasy"     icon={Wand2}  movies={slice(fantasy.data)}  loading={fantasy.loading}  onWatchClick={handleWatch} sectionRef={fantasy.ref}  onSeeAll={genre(14)} />
        <MovieSection title="Animation"   icon={Film}   movies={slice(anim.data)}     loading={anim.loading}     onWatchClick={handleWatch} sectionRef={anim.ref}     onSeeAll={genre(16)} />
        <MovieSection title="Romance"     icon={Heart}  movies={slice(romance.data)}  loading={romance.loading}  onWatchClick={handleWatch} sectionRef={romance.ref}  onSeeAll={genre(10749)} />
      </div>

      {showTaste && (
        <TastePicker onDone={(ids) => { setTasteState(ids); setShowTaste(false); }} />
      )}
    </div>
  );
}
