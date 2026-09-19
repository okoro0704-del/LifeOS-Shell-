import { useState } from "react";
import { isKernelSwipeEnabled, setKernelSwipeEnabled } from "../lib/kernelNavigation";

/** Profile preference: 2-finger kernel swipe (fixed — avoids Android screenshot gesture). */
export function KernelNavigationPrefs({ trustId }: { trustId?: string | null }) {
  const [enabled, setEnabled] = useState(() => isKernelSwipeEnabled(trustId));

  return (
    <div className="prefs surface-block padded kernel-nav-prefs" style={{ marginTop: "0.75rem" }}>
      <strong>Kernel Navigation</strong>
      <p className="muted small" style={{ margin: 0 }}>
        Swipe left or right with 2 fingers to move between LifeOS kernels.
      </p>
      <label className="toggle-row">
        <span>2-finger swipe</span>
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
    </div>
  );
}
