import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Bell, User, LogOut, Menu, X, Tv, Star, Users, MessageCircle, Search, Settings, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { HeaderSearch } from './HeaderSearch';
import { SearchOverlay } from '../search/SearchOverlay';
import { NotificationPanel } from './NotificationPanel';
import { CommunityChat } from '../chat/CommunityChat';
import { MoodRecommender } from '../ai/MoodRecommender';
import { BottomNav } from './BottomNav';
import { buildNotifications, countUnread } from '../../core/notifications';

const NAV = [
  { label: 'Home',      path: '/' },
  { label: 'Movies',    path: '/movies' },
  { label: 'TV Shows',  path: '/tv-shows' },
  { label: 'Top Rated', path: '/top-rated' },
  { label: 'Room',      path: '/room' },
];

export function Navbar() {
  const { user, loggedIn, logout }    = useAuth();
  const navigate                      = useNavigate();
  const location                      = useLocation();
  const [showAuth,   setShowAuth]     = useState(false);
  const [showNotifs, setShowNotifs]   = useState(false);
  const [showChat,   setShowChat]     = useState(false);
  const [showMood,   setShowMood]     = useState(false);
  const [showSearch, setShowSearch]   = useState(false); // mobile overlay
  const [unread,     setUnread]       = useState(0);
  const [menuOpen,   setMenuOpen]     = useState(false);
  const [scrolled,   setScrolled]     = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Real unread count for the bell dot.
  const refreshUnread = useCallback(() => {
    buildNotifications().then(list => setUnread(countUnread(list))).catch(() => {});
  }, []);
  useEffect(() => { refreshUnread(); }, [refreshUnread, loggedIn]);

  // Global keyboard shortcuts: "/" search, "g h/m/t/r/p" navigate.
  useEffect(() => {
    let gPending = false, gTimer = null;
    const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    const onKey = (e) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); setShowSearch(true); return; }
      if (e.key === 'g') { gPending = true; clearTimeout(gTimer); gTimer = setTimeout(() => { gPending = false; }, 900); return; }
      if (gPending) {
        const dest = { h: '/', m: '/movies', t: '/tv-shows', r: '/top-rated', p: '/profile' }[e.key];
        gPending = false;
        if (dest) { e.preventDefault(); navigate(dest); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(gTimer); };
  }, [navigate]);

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-[900] transition-all duration-300 ${
        scrolled ? 'glass-dark border-b border-white/[0.06]' : 'bg-gradient-to-b from-black/70 via-black/30 to-transparent'
      }`}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-5">

          {/* Brand */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2 flex-shrink-0 group">
            <span className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center shadow-lg shadow-accent/30 group-hover:scale-105 transition-transform">
              <Play size={15} className="text-white ml-0.5" fill="white" />
            </span>
            <span className="text-lg font-black tracking-tight text-white hidden sm:block">
              CINE<span className="text-accent">MII</span>
            </span>
          </button>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(path) ? 'text-white' : 'text-muted hover:text-white'
                }`}
              >
                {label}
                {isActive(path) && (
                  <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-accent" />
                )}
              </button>
            ))}
          </nav>

          {/* Inline search — takes the middle space */}
          <div className="hidden md:block flex-1 max-w-md ml-auto">
            <HeaderSearch />
          </div>

          {/* Mobile: push actions right */}
          <div className="flex-1 md:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Mobile search */}
            <button
              onClick={() => setShowSearch(true)}
              className="md:hidden w-9 h-9 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-muted hover:text-white transition"
              aria-label="Search"
            >
              <Search size={17} />
            </button>

            {/* AI mood picker */}
            <button
              onClick={() => setShowMood(true)}
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-full gradient-accent text-white text-sm font-semibold hover:opacity-90 transition ring-1 ring-accent/30"
              aria-label="AI recommendations"
            >
              <Sparkles size={15} /> For You
            </button>

            {/* Chat */}
            <button
              onClick={() => setShowChat(c => !c)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition ring-1 ${
                showChat ? 'text-accent bg-accent/10 ring-accent/30' : 'text-muted hover:text-white bg-white/5 ring-white/10'
              }`}
              aria-label="Community chat"
            >
              <MessageCircle size={17} />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(n => !n)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition relative ring-1 ${
                  showNotifs ? 'text-accent bg-accent/10 ring-accent/30' : 'text-muted hover:text-white bg-white/5 ring-white/10'
                }`}
                aria-label="Notifications"
              >
                <Bell size={17} />
                {unread > 0 && <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-accent rounded-full ring-2 ring-bg" />}
              </button>
              {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} onRead={refreshUnread} />}
            </div>

            {/* Profile / Auth */}
            {loggedIn ? (
              <div className="relative group ml-0.5">
                <button className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition">
                  {user?.picture
                    ? <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                    : <div className="w-7 h-7 rounded-full gradient-accent flex items-center justify-center text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</div>
                  }
                  <span className="text-sm font-medium text-white hidden lg:block max-w-[90px] truncate">{user?.name}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-44 glass-dark rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0 border border-white/10">
                  <button onClick={() => navigate('/profile')} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition flex items-center gap-2.5">
                    <User size={14} className="text-muted" /> Profile
                  </button>
                  <button onClick={() => navigate('/feed')} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition flex items-center gap-2.5 border-t border-white/5">
                    <Users size={14} className="text-muted" /> Activity
                  </button>
                  <button onClick={() => navigate('/settings')} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition flex items-center gap-2.5 border-t border-white/5">
                    <Settings size={14} className="text-muted" /> Settings
                  </button>
                  {user?.is_admin && (
                    <button onClick={() => navigate('/admin')} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition flex items-center gap-2.5 border-t border-white/5">
                      <ShieldCheck size={14} className="text-accent" /> Licensing CMS
                    </button>
                  )}
                  <button onClick={() => navigate('/room')} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition flex items-center gap-2.5 border-t border-white/5">
                    <Users size={14} className="text-muted" /> Watch Together
                  </button>
                  <button onClick={logout} className="w-full text-left px-4 py-3 text-sm text-accent hover:bg-white/5 transition flex items-center gap-2.5 border-t border-white/5">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="gradient-accent text-white text-sm font-bold px-5 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent/20 ml-0.5">
                Sign In
              </button>
            )}

            {/* Mobile menu */}
            <button className="md:hidden w-9 h-9 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-muted hover:text-white transition" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {menuOpen && (
          <div className="md:hidden glass-dark border-t border-white/5 px-5 py-4 flex flex-col gap-1">
            {NAV.map(({ label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive(path) ? 'bg-white/10 text-white' : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      <BottomNav onSearch={() => setShowSearch(true)} onFor={() => setShowMood(true)} />

      {showAuth   && <AuthModal onClose={() => setShowAuth(false)} />}
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      {showChat   && <CommunityChat onClose={() => setShowChat(false)} />}
      {showMood   && <MoodRecommender onClose={() => setShowMood(false)} />}
    </>
  );
}
