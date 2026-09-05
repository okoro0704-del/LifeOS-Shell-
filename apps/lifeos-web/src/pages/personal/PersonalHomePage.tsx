import { Link } from "react-router-dom";
import { AskLifeOSTrigger } from "../../components/CommandOverlay";

const MEDIA_RAILS: { title: string; detail: string; href: string }[] = [
  {
    title: "Music",
    detail: "Albums, playlists, and Ask LifeOS to play",
    href: "/app/search?q=music",
  },
  {
    title: "Video streams",
    detail: "Live and on-demand streams",
    href: "/app/search?q=video%20stream",
  },
  {
    title: "Podcasts",
    detail: "Shows and episodes for you",
    href: "/app/search?q=podcast",
  },
  {
    title: "Movies",
    detail: "Feature films and watchlists",
    href: "/app/search?q=movies",
  },
  {
    title: "Cinema",
    detail: "Showtimes and cinema bookings",
    href: "/app/services/explore",
  },
  {
    title: "Posts",
    detail: "Updates from people you follow",
    href: "/app/personal/free",
  },
];

/**
 * Personal Main — media-first home (music, video, podcasts, cinema).
 * Kernels: double-tap left half → Offline · double-tap right half → Free.
 */
export function PersonalHomePage() {
  return (
    <div className="page personal-page">
      <header className="page-header">
        <p className="personal-kernel-badge muted small">Personal · Main</p>
        <h1>LifeOS</h1>
        <p className="muted">
          Music, streams, podcasts, and cinema first. Double-tap the left side of the screen for
          Offline, right side for Free. Tap Space for Business.
        </p>
      </header>

      <div className="personal-ask-slot">
        <AskLifeOSTrigger />
      </div>

      <section aria-label="Media">
        <h2 className="personal-section-title">For you</h2>
        <ul className="personal-home-grid personal-home-grid--media">
          {MEDIA_RAILS.map((item) => (
            <li key={item.title}>
              <Link to={item.href} className="personal-home-card personal-home-card--media">
                <strong>{item.title}</strong>
                <span className="muted small">{item.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
