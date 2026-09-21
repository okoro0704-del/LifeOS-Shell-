import { IconBroadcast, IconKernel, IconTv } from "@lifeos/ui";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { personalKernelPath } from "./shell/nav";

/**
 * Offline hub — pick TV or Radio, or return Online to Main/Free LifeOS.
 * No edge reveal on this surface.
 */
export function OfflineHubSurface() {
  const { surface, setSurface, exitBroadcast } = useLifeOsSurface();
  const { setMode } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  if (surface !== "OFFLINE_HUB") return null;

  function goOnline() {
    setMode("PERSONAL");
    setLastSelectedKernel("main", user?.trustId);
    exitBroadcast();
    setSurface("LIVING_LIFEOS");
    navigate(personalKernelPath("main"));
  }

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
      <button type="button" className="offline-hub__online" onClick={goOnline}>
        <IconKernel size={22} />
        <span>Online</span>
      </button>
    </section>
  );
}
