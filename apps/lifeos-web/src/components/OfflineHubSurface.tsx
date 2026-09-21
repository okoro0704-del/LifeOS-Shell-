import { IconBroadcast, IconTv } from "@lifeos/ui";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";

export function OfflineHubSurface() {
  const { surface, setSurface } = useLifeOsSurface();
  if (surface !== "OFFLINE_HUB") return null;

  return (
    <section className="offline-hub" aria-label="Offline">
      <h1>Offline</h1>
      <div className="offline-hub__choices">
        <button type="button" onClick={() => setSurface("TV")}>
          <IconTv size={30} />
          <span>TV</span>
        </button>
        <button type="button" onClick={() => setSurface("RADIO")}>
          <IconBroadcast size={30} />
          <span>Radio</span>
        </button>
      </div>
    </section>
  );
}
