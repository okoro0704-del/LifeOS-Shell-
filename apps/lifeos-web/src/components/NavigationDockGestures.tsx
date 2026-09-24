import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigationDock } from "../context/NavigationDockContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { attachNavDockDoubleTap } from "../lib/navDockGesture";
import { useAuth } from "../hooks/useAuth";
import { useSpaceRuntime } from "../lib/useSpaceRuntime";
import { SpaceControls } from "../lib/SpaceControls";
import type { SpaceDefinition } from "../lib/space-runtime";
import type { LifeOsSurface } from "../context/LifeOsSurfaceContext";
import { SpacePresentationContext } from "../context/SpacePresentationContext";
import { isSpaceExperience, nextExperienceMode, type ExperienceMode } from "../lib/experienceMode";
import { trustStateFor } from "../lib/trustBoundary";

/**
 * TV/Radio: double tap on broadcast → PROGRAM_INFO_REVEALED (creator + NOW/NEXT).
 * Single tap on broadcast does nothing — remote opens only via the edge reveal handle.
 * Offline hub and Business toggle shell; Living toggles its surface switcher.
 */
export function NavigationDockGestures({ children }: { children: ReactNode }) {
  const { toggle, expanded, close } = useNavigationDock();
  const { mode } = useWorkspace();
  const {
    toggleSwitcher,
    switcherVisible,
    closeSwitcher,
    surface,
    broadcastUiMode,
    closeBroadcastUi,
    openProgramInfo,
    setSurface,
  } = useLifeOsSurface();
  const { user } = useAuth();
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>('APP');
  // Public Space consumption is guest-safe. Identity gates only identity-required actions.
  const enabled = isSpaceExperience(experienceMode) && mode === "PERSONAL";
  const trustState = trustStateFor(user?.trustId);
  const definition = useMemo<SpaceDefinition>(() => ({
    id: `space.lifeos.${user?.trustId || 'guest'}`, owner: user?.trustId || 'guest',
    defaultExperienceId: 'LIVING_LIFEOS',
    experiences: [
      { id: 'LIVING_LIFEOS', title: 'LifeOS' }, { id: 'TV', title: 'TV' },
      { id: 'RADIO', title: 'Radio' }, { id: 'OFFLINE_HUB', title: 'Offline library' },
    ].map(item => ({ ...item, type: item.id, lifecyclePolicy: 'retained', offlinePolicy: 'cached' })),
  }), [user?.trustId]);
  const runtime = useSpaceRuntime(definition, id => setSurface(id as LifeOsSurface), enabled);
  const spaceRef = useRef({ enabled, dispatch: runtime.dispatch });
  spaceRef.current = { enabled, dispatch: runtime.dispatch };
  const rootRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const switcherRef = useRef(switcherVisible);
  switcherRef.current = switcherVisible;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const uiModeRef = useRef(broadcastUiMode);
  uiModeRef.current = broadcastUiMode;
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return attachNavDockDoubleTap(
      root,
      (x, y) => {
        if (spaceRef.current.enabled) {
          spaceRef.current.dispatch({ type: 'DOUBLE_TAP_CANVAS' });
          return;
        }
        setRipple({ x, y, id: Date.now() });
        if (modeRef.current === "PERSONAL") {
          if (surfaceRef.current === "TV" || surfaceRef.current === "RADIO") {
            if (expandedRef.current) close();
            openProgramInfo();
          } else if (surfaceRef.current === "OFFLINE_HUB") {
            if (switcherRef.current) closeSwitcher();
            if (uiModeRef.current !== "HIDDEN") closeBroadcastUi();
            if (expandedRef.current) close();
            else toggle();
          } else {
            if (expandedRef.current) close();
            if (uiModeRef.current !== "HIDDEN") closeBroadcastUi();
            toggleSwitcher();
          }
        } else {
          if (switcherRef.current) closeSwitcher();
          if (uiModeRef.current !== "HIDDEN") closeBroadcastUi();
          toggle();
        }
        window.setTimeout(() => setRipple(null), 420);
      },
      // No single-tap broadcast action — edge handle owns REMOTE_REVEALED.
    );
  }, [
    toggle,
    toggleSwitcher,
    close,
    closeSwitcher,
    closeBroadcastUi,
    openProgramInfo,
  ]);

  return (
    <SpacePresentationContext.Provider value={{ experienceMode: enabled ? 'SPACE' : 'APP', spaceMode: enabled, interactionsOpen: enabled && runtime.state.presentationState === 'INTERACTION' }}>
    <div
      className="lifeos-nav-dock-gesture-root"
      ref={rootRef}
      data-lifeos-surface={surface}
      data-broadcast-ui={broadcastUiMode}
      data-space-mode={enabled ? 'SPACE' : 'APP'}
      data-experience-mode={enabled ? 'SPACE' : 'APP'}
      data-trust-state={trustState}
      data-current-space-id={enabled ? runtime.state.currentSpaceId : undefined}
      data-current-experience-id={enabled ? runtime.state.currentExperienceId : undefined}
      data-space-presentation={enabled ? runtime.state.presentationState : undefined}
    >
      {children}
      {enabled ? <SpaceControls state={runtime.state} definition={definition} dispatch={runtime.dispatch} interactionsAvailable={surface === 'TV' || surface === 'LIVING_LIFEOS'}>
        {surface === 'TV' || surface === 'RADIO' ? <button type="button" onClick={openProgramInfo}>Programme information</button> : null}
        <button type="button" onClick={() => { closeBroadcastUi(); setExperienceMode(current => nextExperienceMode(current, 'APP')); }}>App mode</button>
      </SpaceControls> : mode === 'PERSONAL' ? <button type="button"
        style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 90 }}
        data-space-entry="true"
        onClick={() => { close(); closeSwitcher(); closeBroadcastUi(); setExperienceMode(current => nextExperienceMode(current, 'SPACE')); }}>Space mode</button> : null}
      {ripple ? (
        <span
          className="lifeos-cmd-nav__ripple"
          style={{ left: ripple.x, top: ripple.y }}
          key={ripple.id}
          aria-hidden
        />
      ) : null}
    </div>
    </SpacePresentationContext.Provider>
  );
}
