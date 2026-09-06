import { MediaFeed } from "../../components/MediaFeed";
import { offlineCatalog } from "../../lib/personalCatalog";

/**
 * Offline kernel — only items you bought or already consumed.
 * Double-tap left on the app body to enter.
 */
export function VaultPage() {
  return (
    <div className="page personal-page">
      <header className="page-header">
        <p className="personal-kernel-badge muted small">Personal · Offline</p>
        <h1>Offline</h1>
        <p className="muted">
          Only what you have bought or already consumed — available without the network. Double-tap
          the right half twice for Free.
        </p>
      </header>
      <MediaFeed
        items={offlineCatalog()}
        empty="Nothing in Offline yet. Buy or finish content on Main to keep it here."
      />
    </div>
  );
}
