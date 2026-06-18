import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Edit3,
  Check,
  X,
  Film,
  Clock,
  Heart,
  Trophy,
  Settings,
  Users,
  Search,
  UserPlus,
  MessageCircle,
  UserCheck,
  UserX,
  Wifi,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { api } from '../core/backend';
import { imgUrl } from '../core/tmdb';
import { MovieCard } from '../components/movie/MovieCard';
import { Skeleton } from '../components/ui/Skeleton';

export function Profile() {
  const { user, loggedIn, logout, login } = useAuth();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [sentRequests, setSentRequests] = useState({});

  useEffect(() => {
    if (!loggedIn) {
      navigate('/');
      return;
    }

    Promise.all([
      api.listFavorites(),
      api.listProgress(),
      api.listFriends(),
      api.listFriendRequests(),
    ])
      .then(([favs, prog, friendsList, requests]) => {
        setFavorites(favs || []);
        setProgress((prog || []).filter((p) => p.position_seconds > 0));
        setFriends(friendsList || []);
        setFriendRequests(requests || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loggedIn, navigate]);

  const startEdit = () => {
    setEditName(user?.name || '');
    setEditing(true);
    setSaveMsg(null);
  };

  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    if (!editName.trim()) return;

    setSaving(true);

    try {
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

const searchUsers = async () => {
  const q = searchQuery.trim();

  if (!q) {
    setSearchResults([]);
    setHasSearched(false);
    setSearchError('');
    return;
  }

  setSearching(true);
  setHasSearched(true);
  setSearchError('');

  try {
    const result = await api.searchUsers(q);
    console.log('SEARCH RESULT:', result);
    setSearchResults(Array.isArray(result) ? result : []);
  } catch (err) {
    console.error('SEARCH ERROR:', err);
    setSearchResults([]);
    setSearchError(err.message || 'Search failed');
  } finally {
    setSearching(false);
  }
};

  const addFriend = async (userId) => {
    try {
      const res = await api.sendFriendRequest(userId);

      setSentRequests((prev) => ({
        ...prev,
        [userId]: res?.status || 'pending',
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  const acceptRequest = async (id) => {
    try {
      await api.acceptFriendRequest(id);

      const [friendsList, requests] = await Promise.all([
        api.listFriends(),
        api.listFriendRequests(),
      ]);

      setFriends(friendsList || []);
      setFriendRequests(requests || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const rejectRequest = async (id) => {
    try {
      await api.rejectFriendRequest(id);
      setFriendRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const hoursWatched = Math.round(
    progress.reduce((a, p) => a + (p.position_seconds || 0), 0) / 3600
  );

  const completed = progress.filter(
    (p) => p.duration_seconds && p.position_seconds >= p.duration_seconds * 0.9
  ).length;

  const avatar = user?.picture;
  const initials = user?.name?.[0]?.toUpperCase() || '?';

  const STATS = [
    { label: 'Favorites', value: favorites.length, icon: Heart },
    { label: 'Hours Watched', value: hoursWatched, icon: Clock },
    { label: 'In Progress', value: progress.length, icon: Film },
    { label: 'Completed', value: completed, icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-bg pt-24 pb-20">
      <div className="max-w-screen-xl mx-auto px-6 md:px-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-12">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-accent/40 shadow-2xl shadow-accent/10">
              {avatar ? (
                <img src={avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-accent flex items-center justify-center text-white text-3xl font-black">
                  {initials}
                </div>
              )}
            </div>

            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full ring-2 ring-bg" />
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveProfile();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                  className="glass rounded-xl px-4 py-2 text-white text-xl font-bold focus:outline-none focus:border-accent/40 border border-white/10 transition w-52"
                />

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="gradient-accent text-white rounded-xl p-2.5 hover:opacity-90 transition active:scale-95"
                >
                  <Check size={16} />
                </button>

                <button
                  onClick={cancelEdit}
                  className="glass text-muted rounded-xl p-2.5 hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black text-white">{user?.name}</h1>

                <button
                  onClick={startEdit}
                  className="glass p-2 rounded-lg text-muted hover:text-white transition"
                >
                  <Edit3 size={15} />
                </button>
              </div>
            )}

            {saveMsg && (
              <p className={`text-xs mt-1 ${saveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                {saveMsg.text}
              </p>
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass rounded-2xl p-5 text-center">
              <Icon size={20} className="text-accent mx-auto mb-2 opacity-80" />
              <p className="text-3xl font-black text-white">{value}</p>
              <p className="text-muted text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <SectionSkeleton />
        ) : (
          progress.length > 0 && (
            <section className="mb-14">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <Clock size={18} className="text-accent" /> Continue Watching
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {progress.slice(0, 6).map((item) => {
                  const pct = item.duration_seconds
                    ? Math.min(100, (item.position_seconds / item.duration_seconds) * 100)
                    : 0;

                  return (
                    <button
                      key={`${item.media_type}-${item.media_id}`}
                      onClick={() =>
                        navigate(`/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.media_id}`)
                      }
                      className="flex gap-4 glass rounded-2xl p-4 text-left hover:bg-white/5 transition group"
                    >
                      <div className="w-14 h-20 rounded-xl overflow-hidden bg-surface flex-shrink-0">
                        {item.poster_path ? (
                          <img
                            src={imgUrl(item.poster_path, 'w92')}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film size={20} className="text-muted" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="text-white font-semibold text-sm line-clamp-2">
                            {item.title}
                          </p>
                          <p className="text-muted text-xs mt-1">
                            {Math.floor(item.position_seconds / 60)}m
                            {item.duration_seconds
                              ? ` / ${Math.floor(item.duration_seconds / 60)}m`
                              : ''}
                          </p>
                        </div>

                        <div className="w-full h-1 bg-white/10 rounded-full mt-3">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )
        )}

        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-accent text-xs font-bold uppercase tracking-[0.25em] mb-2">
                Social Hub
              </p>

              <h2 className="text-3xl font-black text-white flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-accent/20">
                  <Users size={22} className="text-white" />
                </span>
                Friends
              </h2>

              <p className="text-muted text-sm mt-3">
                Find friends, send requests, and build your Cinemii circle.
              </p>
            </div>
          </div>

          <div className="glass rounded-3xl p-5 mb-5 border border-white/10 shadow-2xl shadow-black/20">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') searchUsers();
                  }}
                  placeholder="Search users by name, username, or email..."
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-muted rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:border-accent/50 transition"
                />
              </div>

              <button
                type="button"
                onClick={searchUsers}
                disabled={searching}
                className="gradient-accent px-7 py-4 rounded-2xl text-white font-bold hover:opacity-90 transition active:scale-95 disabled:opacity-60"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchError && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center">
                <p className="text-red-300 font-bold">{searchError}</p>
              </div>
            )}

            {hasSearched && !searching && !searchError && searchResults.length === 0 && (
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-muted" />
                </div>

                <p className="text-white text-lg font-black">No users found</p>
                <p className="text-muted text-sm mt-2">
                  Try another name, username, or email.
                </p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((result) => {
                  const alreadyFriend = friends.some((f) => f.id === result.id);
                  const requestStatus = sentRequests[result.id];

                  return (
                    <div
                      key={result.id}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08] hover:border-accent/30 transition-all duration-300"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-accent/10 via-transparent to-white/5 pointer-events-none" />

                      <div className="relative flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface flex items-center justify-center text-white font-black ring-1 ring-white/10">
                          {result.picture ? (
                            <img
                              src={result.picture}
                              alt={result.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            result.name?.[0]?.toUpperCase() || '?'
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-black truncate">{result.name}</p>
                          <p className="text-xs text-muted truncate">
                            @{result.username || 'cinemii-user'}
                          </p>
                          <p className="text-xs text-muted/70 truncate">{result.email}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => addFriend(result.id)}
                          disabled={alreadyFriend || requestStatus === 'pending'}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 ${
                            alreadyFriend || requestStatus === 'pending'
                              ? 'bg-white/10 text-muted cursor-default'
                              : 'gradient-accent text-white hover:opacity-90'
                          }`}
                        >
                          {alreadyFriend ? (
                            <>
                              <UserCheck size={15} />
                              Friend
                            </>
                          ) : requestStatus === 'pending' ? (
                            <>
                              <Sparkles size={15} />
                              Sent
                            </>
                          ) : (
                            <>
                              <UserPlus size={15} />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {friendRequests.length > 0 && (
            <div className="glass rounded-3xl p-5 mb-5 border border-white/10">
              <h3 className="text-white text-xl font-black mb-4">Friend Requests</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {friendRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface flex items-center justify-center text-white font-black">
                        {req.from_user?.picture ? (
                          <img
                            src={req.from_user.picture}
                            alt={req.from_user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          req.from_user?.name?.[0]?.toUpperCase() || '?'
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-white font-bold truncate">{req.from_user?.name}</p>
                        <p className="text-xs text-muted truncate">wants to connect</p>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-3">
                      <button
                        type="button"
                        onClick={() => acceptRequest(req.id)}
                        className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white hover:opacity-90 transition"
                      >
                        <UserCheck size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => rejectRequest(req.id)}
                        className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition"
                      >
                        <UserX size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass rounded-3xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white text-xl font-black">Friends Network</h3>
                <p className="text-muted text-sm mt-1">
                  {friends.length} connected {friends.length === 1 ? 'friend' : 'friends'}
                </p>
              </div>
            </div>

            {friends.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <p className="text-white font-bold">No friends yet</p>
                <p className="text-muted text-sm mt-2">
                  Search for users above and send your first request.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-4 hover:bg-white/[0.08] transition"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface flex items-center justify-center text-white font-black">
                        {friend.picture ? (
                          <img
                            src={friend.picture}
                            alt={friend.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          friend.name?.[0]?.toUpperCase() || '?'
                        )}
                      </div>

                      <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-xl bg-green-500 ring-2 ring-bg flex items-center justify-center">
                        <Wifi size={10} className="text-white" />
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{friend.name}</p>
                      <p className="text-xs text-muted truncate">
                        @{friend.username || 'cinemii-user'}
                      </p>
                    </div>

                    <button
  type="button"
  onClick={() => navigate(`/messages?friend=${friend.id}`)}
  className="flex items-center gap-2 bg-white/10 hover:bg-accent text-white px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95"
>
  <MessageCircle size={14} />
  Chat
</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <SectionSkeleton />
        ) : favorites.length > 0 ? (
          <section>
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Heart size={18} className="text-accent" /> Favorites
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {favorites.map((fav) => (
                <MovieCard
                  key={`${fav.media_type}-${fav.media_id}`}
                  movie={{
                    id: fav.media_id,
                    title: fav.title,
                    poster_path: fav.poster_path,
                    media_type: fav.media_type,
                  }}
                  mediaType={fav.media_type}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-20 text-muted">
            <Heart size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-white">No favorites yet</p>
            <p className="text-sm mt-1">Browse movies and save ones you love</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="mb-14">
      <Skeleton className="h-6 w-40 mb-5" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
        ))}
      </div>
    </div>
  );
}