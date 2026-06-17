import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Edit3, Check, X, Film, Clock, Heart, Trophy, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../core/backend';
import { imgUrl } from '../core/tmdb';
import { MovieCard } from '../components/movie/MovieCard';
import { Skeleton } from '../components/ui/Skeleton';

export function Profile() {
  const { user, loggedIn, logout, login } = useAuth();
  const navigate                           = useNavigate();
  const [favorites,  setFavorites]         = useState([]);
  const [progress,   setProgress]          = useState([]);
  const [loading,    setLoading]           = useState(true);

  // Edit mode
  const [editing,    setEditing]           = useState(false);
  const [editName,   setEditName]          = useState('');
  const [saving,     setSaving]            = useState(false);
  const [saveMsg,    setSaveMsg]           = useState(null);

  useEffect(() => {
    if (!loggedIn) { navigate('/'); return; }
    Promise.all([api.listFavorites(), api.listProgress()])
      .then(([favs, prog]) => {
        setFavorites(favs || []);
        setProgress((prog || []).filter(p => p.position_seconds > 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loggedIn, navigate]);

  const startEdit = () => { setEditName(user?.name || ''); setEditing(true); setSaveMsg(null); };
  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      // Optimistic update — update stored session data
      const updated = { ...user, name: editName.trim() };
      const token = localStorage.getItem('cinemii_token');
      login(token, updated);
      setEditing(false);
      setSaveMsg({ ok: true, text: 'Profile updated!' });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const hoursWatched = Math.round(progress.reduce((a, p) => a + (p.position_seconds || 0), 0) / 3600);
  const completed    = progress.filter(p => p.duration_seconds && p.position_seconds >= p.duration_seconds * 0.9).length;
  const avatar       = user?.picture;
  const initials     = user?.name?.[0]?.toUpperCase() || '?';

  const STATS = [
    { label: 'Favorites',     value: favorites.length, icon: Heart },
    { label: 'Hours Watched', value: hoursWatched,     icon: Clock },
    { label: 'In Progress',   value: progress.length,  icon: Film  },
    { label: 'Completed',     value: completed,         icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-bg pt-24 pb-20">
      <div className="max-w-screen-xl mx-auto px-6 md:px-10">

        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-12">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-accent/40">
              {avatar
                ? <img src={avatar} alt={user.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full gradient-accent flex items-center justify-center text-white text-3xl font-black">{initials}</div>
              }
            </div>
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full ring-2 ring-bg" />
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveProfile(); if (e.key === 'Escape') cancelEdit(); }}
                  autoFocus
                  className="glass rounded-xl px-4 py-2 text-white text-xl font-bold focus:outline-none focus:border-accent/40 border border-white/10 transition w-52"
                />
                <button onClick={saveProfile} disabled={saving} className="gradient-accent text-white rounded-xl p-2.5 hover:opacity-90 transition active:scale-95">
                  <Check size={16} />
                </button>
                <button onClick={cancelEdit} className="glass text-muted rounded-xl p-2.5 hover:text-white transition">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black text-white">{user?.name}</h1>
                <button onClick={startEdit} className="glass p-2 rounded-lg text-muted hover:text-white transition">
                  <Edit3 size={15} />
                </button>
              </div>
            )}
            {saveMsg && (
              <p className={`text-xs mt-1 ${saveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{saveMsg.text}</p>
            )}
            <p className="text-muted text-sm mt-1">{user?.email}</p>
            <p className="text-muted text-xs mt-0.5 capitalize">
              {user?.provider === 'google' ? 'Signed in with Google' : 'Email account'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 glass text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition active:scale-95"
            >
              <Settings size={15} /> Settings
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 glass text-accent border border-accent/20 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-accent/10 transition active:scale-95"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass rounded-2xl p-5 text-center">
              <Icon size={20} className="text-accent mx-auto mb-2 opacity-80" />
              <p className="text-3xl font-black text-white">{value}</p>
              <p className="text-muted text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Continue Watching */}
        {loading
          ? <SectionSkeleton />
          : progress.length > 0 && (
            <section className="mb-14">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <Clock size={18} className="text-accent" /> Continue Watching
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {progress.slice(0, 6).map(item => {
                  const pct = item.duration_seconds
                    ? Math.min(100, (item.position_seconds / item.duration_seconds) * 100)
                    : 0;
                  return (
                    <button
                      key={`${item.media_type}-${item.media_id}`}
                      onClick={() => navigate(`/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.media_id}`)}
                      className="flex gap-4 glass rounded-2xl p-4 text-left hover:bg-white/5 transition group"
                    >
                      <div className="w-14 h-20 rounded-xl overflow-hidden bg-surface flex-shrink-0">
                        {item.poster_path
                          ? <img src={imgUrl(item.poster_path, 'w92')} alt={item.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Film size={20} className="text-muted" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="text-white font-semibold text-sm line-clamp-2">{item.title}</p>
                          <p className="text-muted text-xs mt-1">
                            {Math.floor(item.position_seconds / 60)}m
                            {item.duration_seconds ? ` / ${Math.floor(item.duration_seconds / 60)}m` : ''}
                          </p>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full mt-3">
                          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )
        }

        {/* Favorites */}
        {loading
          ? <SectionSkeleton />
          : favorites.length > 0
            ? (
              <section>
                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Heart size={18} className="text-accent" /> Favorites
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {favorites.map(fav => (
                    <MovieCard
                      key={`${fav.media_type}-${fav.media_id}`}
                      movie={{ id: fav.media_id, title: fav.title, poster_path: fav.poster_path, media_type: fav.media_type }}
                      mediaType={fav.media_type}
                    />
                  ))}
                </div>
              </section>
            )
            : !loading && (
              <div className="text-center py-20 text-muted">
                <Heart size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-white">No favorites yet</p>
                <p className="text-sm mt-1">Browse movies and save ones you love</p>
              </div>
            )
        }
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="mb-14">
      <Skeleton className="h-6 w-40 mb-5" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl" />)}
      </div>
    </div>
  );
}
