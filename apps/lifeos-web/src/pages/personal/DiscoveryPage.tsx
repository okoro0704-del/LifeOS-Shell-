import { MediaFeed } from "../../components/MediaFeed";
import { freeCatalog } from "../../lib/personalCatalog";

/**
 * Free kernel — creator-marked free music, videos, and content only.
 * Double-tap right on the app body to enter.
 */
export function DiscoveryPage() {
  return (
    <div className="page personal-page">
      <header className="page-header">
        <p className="personal-kernel-badge muted small">Personal · Free</p>
        <h1>Free</h1>
        <p className="muted">
          Only free music, videos, and content creators marked for free consumption. Double-tap the
          left half twice for Offline.
        </p>
      </header>
      <MediaFeed items={freeCatalog()} empty="No free creator content right now." />
    </div>
  );
}
