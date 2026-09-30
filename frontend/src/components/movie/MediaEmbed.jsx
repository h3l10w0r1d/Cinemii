import { MonitorPlay } from 'lucide-react';
import { movieEmbedUrl, tvEmbedUrl } from '../../core/config';

/**
 * Inline Cinemii embed player, addressed by TMDB id.
 * Movies: /embed/movie/{id}. TV: /embed/tv/{id}/{season}/{episode}.
 * @param {{ mediaType?: 'movie'|'tv', tmdbId: string|number, season?: number, episode?: number, title?: string }} props
 */
export function MediaEmbed({ mediaType = 'movie', tmdbId, season = 1, episode = 1, title }) {
  if (!tmdbId) return null;

  const isTV = mediaType === 'tv';
  const src  = isTV ? tvEmbedUrl(tmdbId, season, episode) : movieEmbedUrl(tmdbId);

  return (
    <section id="watch" className="mt-14 scroll-mt-24">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MonitorPlay size={18} className="text-accent" /> Watch
          {isTV && <span className="text-muted text-sm font-semibold">S{season} · E{episode}</span>}
        </h2>
        <span className="text-muted text-xs">TMDB: {tmdbId}</span>
      </div>
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black ring-1 ring-white/5">
        <iframe
          key={src}
          src={src}
          title={title ? `${title} — player` : 'Player'}
          className="absolute inset-0 w-full h-full"
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="origin"
        />
      </div>
    </section>
  );
}
