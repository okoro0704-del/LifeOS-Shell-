import { useState } from "react";
import {
  getKernelSwipeFingers,
  isKernelSwipeEnabled,
  setKernelSwipeEnabled,
  setKernelSwipeFingers,
  type KernelSwipeFingers,
} from "../lib/kernelNavigation";

/** Profile preference: multi-finger kernel swipe accelerator. */
export function KernelNavigationPrefs({ trustId }: { trustId?: string | null }) {
  const [enabled, setEnabled] = useState(() => isKernelSwipeEnabled(trustId));
  const [fingers, setFingers] = useState<KernelSwipeFingers>(() => getKernelSwipeFingers(trustId));

  return (
    <div className="prefs surface-block padded kernel-nav-prefs" style={{ marginTop: "0.75rem" }}>
      <strong>Kernel Navigation</strong>
      <p className="muted small" style={{ margin: 0 }}>
        Swipe left or right with the selected number of fingers to move between LifeOS kernels.
        Double-tap always opens the kernel chooser.
      </p>
      <label className="toggle-row">
        <span>Multi-finger swipe</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => {
            const next = !enabled;
            setEnabled(next);
            setKernelSwipeEnabled(next, trustId);
          }}
        />
      </label>
      <div className="kernel-nav-prefs__fingers" role="group" aria-label="Fingers">
        {([2, 3, 4] as KernelSwipeFingers[]).map((n) => (
          <button
            key={n}
            type="button"
            className={`kernel-nav-prefs__finger${fingers === n ? " is-on" : ""}`}
            aria-pressed={fingers === n}
            disabled={!enabled}
            onClick={() => {
              setFingers(n);
              setKernelSwipeFingers(n, trustId);
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
