import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// "Watch" opens the title's detail page and jumps to the embedded player (#watch).
export function useWatch() {
  const navigate = useNavigate();
  return useCallback((movie, type = 'movie') => {
    navigate(`/${type === 'tv' ? 'tv' : 'movie'}/${movie.id}#watch`);
  }, [navigate]);
}
