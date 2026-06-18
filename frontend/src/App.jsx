import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useToast, setExternalToast } from './contexts/ToastContext';
import { RouteProgress } from './components/layout/RouteProgress';
import { Navbar } from './components/layout/Navbar';
import { Home } from './pages/Home';
import { Movie } from './pages/Movie';
import { Profile } from './pages/Profile';
import { Person } from './pages/Person';
import { Room } from './pages/Room';
import { Search } from './pages/Search';
import { Genre } from './pages/Genre';
import { Settings } from './pages/Settings';
import { ResetPassword } from './pages/ResetPassword';
import { Movies, TVShows, TopRated } from './pages/Browse';
import { Messages } from './pages/Messages';

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

export default function App() {
  const { toast } = useToast();
  // Let non-component code (api client, etc.) raise toasts.
  useEffect(() => { setExternalToast(toast); }, [toast]);

  return (
    <>
      <RouteProgress />
      <Navbar />
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
        <Route path="/settings"    element={<Settings />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/room"        element={<Room />} />
        <Route path="*"            element={<NotFound />} />
      </Routes>
    </>
  );
}
