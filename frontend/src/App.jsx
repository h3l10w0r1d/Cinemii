import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useToast, setExternalToast } from './contexts/ToastContext';
import { RouteProgress } from './components/layout/RouteProgress';
import { Navbar } from './components/layout/Navbar';
import { Home } from './pages/Home'; // eager — above the fold

// Lazy-load the rest so the initial bundle stays small.
const named = (p, key) => lazy(() => p().then(m => ({ default: m[key] })));
const Movie         = named(() => import('./pages/Movie'), 'Movie');
const Person        = named(() => import('./pages/Person'), 'Person');
const Search        = named(() => import('./pages/Search'), 'Search');
const Genre         = named(() => import('./pages/Genre'), 'Genre');
const Profile       = named(() => import('./pages/Profile'), 'Profile');
const Settings      = named(() => import('./pages/Settings'), 'Settings');
const ResetPassword = named(() => import('./pages/ResetPassword'), 'ResetPassword');
const Room          = named(() => import('./pages/Room'), 'Room');
const Movies        = named(() => import('./pages/Browse'), 'Movies');
const TVShows       = named(() => import('./pages/Browse'), 'TVShows');
const TopRated      = named(() => import('./pages/Browse'), 'TopRated');
const PublicProfile = named(() => import('./pages/PublicProfile'), 'PublicProfile');
const Feed          = named(() => import('./pages/Feed'), 'Feed');
const Admin         = named(() => import('./pages/Admin'), 'Admin');
const Messages      = named(() => import('./pages/Messages'), 'Messages');

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
      <p className="text-5xl font-black text-white/10">404</p>
      <h1 className="text-2xl font-black text-white">Page not found</h1>
      <p className="text-muted">This scene didn't make the cut.</p>
      <a href="/" className="gradient-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition">
        Back to Home
      </a>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const { toast } = useToast();
  // Let non-component code (api client, etc.) raise toasts.
  useEffect(() => { setExternalToast(toast); }, [toast]);

  return (
    <>
      <RouteProgress />
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/movie/:id"   element={<Movie />} />
          <Route path="/tv/:id"      element={<Movie />} />
          <Route path="/person/:id"  element={<Person />} />
          <Route path="/messages"    element={<Messages />} />
          <Route path="/search"      element={<Search />} />
          <Route path="/genre/:id"   element={<Genre />} />
          <Route path="/movies"      element={<Movies />} />
          <Route path="/tv-shows"    element={<TVShows />} />
          <Route path="/top-rated"   element={<TopRated />} />
          <Route path="/profile"     element={<Profile />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/feed"        element={<Feed />} />
          <Route path="/settings"    element={<Settings />} />
          <Route path="/admin"       element={<Admin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/room"        element={<Room />} />
          <Route path="*"            element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
