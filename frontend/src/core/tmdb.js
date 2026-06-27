import { TMDB_BASE } from './config';

// All TMDB reads go through a proxy so the API key stays server-side.
// TMDB_BASE may be absolute (dev) or relative (prod '/api/tmdb'), so build the
// query string by hand rather than with `new URL` (which rejects relative bases).
export const imgUrl      = (path, size = 'w500') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
export const backdropUrl = (path) => imgUrl(path, 'original');

async function tmdb(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${TMDB_BASE}${path}${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export const fetchTrending     = ()   => tmdb('/trending/movie/week');
export const fetchPopular      = ()   => tmdb('/movie/popular');
export const fetchTopRated     = ()   => tmdb('/movie/top_rated');
export const fetchNowPlaying   = ()   => tmdb('/movie/now_playing');
export const fetchPopularTV    = ()   => tmdb('/tv/popular');
export const fetchTopRatedTV   = ()   => tmdb('/tv/top_rated');
export const fetchByGenre      = (id) => tmdb('/discover/movie', { with_genres: id, sort_by: 'popularity.desc' });
export const fetchTVByGenre    = (id) => tmdb('/discover/tv', { with_genres: id, sort_by: 'popularity.desc' });
export const fetchByGenrePaged = (id, page = 1) => tmdb('/discover/movie', { with_genres: id, sort_by: 'popularity.desc', page });
export const discoverMovies    = (params = {}) => tmdb('/discover/movie', { sort_by: 'popularity.desc', 'vote_count.gte': 200, ...params });
export const fetchMovie        = (id) => tmdb(`/movie/${id}`, { append_to_response: 'videos,credits,recommendations,similar' });
export const fetchTV           = (id) => tmdb(`/tv/${id}`,    { append_to_response: 'videos,credits,recommendations' });
export const fetchTVSeason     = (id, season) => tmdb(`/tv/${id}/season/${season}`);
export const fetchVideos       = (type, id) => tmdb(`/${type === 'tv' ? 'tv' : 'movie'}/${id}/videos`);
export const fetchPerson       = (id) => tmdb(`/person/${id}`, { append_to_response: 'movie_credits,tv_credits,images' });
export const fetchRecsForMovie = (id) => tmdb(`/movie/${id}/recommendations`);
export const searchMulti       = (q)  => tmdb('/search/multi', { query: q });

export const GENRES = [
  { id: 28,    name: 'Action'     },
  { id: 35,    name: 'Comedy'     },
  { id: 878,   name: 'Sci-Fi'     },
  { id: 53,    name: 'Thriller'   },
  { id: 27,    name: 'Horror'     },
  { id: 16,    name: 'Animation'  },
  { id: 10749, name: 'Romance'    },
  { id: 18,    name: 'Drama'      },
  { id: 80,    name: 'Crime'      },
  { id: 9648,  name: 'Mystery'    },
  { id: 14,    name: 'Fantasy'    },
  { id: 10751, name: 'Family'     },
];
