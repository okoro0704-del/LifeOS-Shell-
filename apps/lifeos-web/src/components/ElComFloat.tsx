import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import type { InstalledAppManifest } from "@lifeos/shared";
import { hasDeployedMyBrandOS } from "../lib/mybrandOS";

/** Chat float — only for owners with a deployed mybrandOS white-label app. */
export function ElComFloat({ apps = [] }: { apps?: InstalledAppManifest[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/app/elcom") return null;
  if (!hasDeployedMyBrandOS(apps)) return null;

  const btn = (
    <button
      type="button"
      className="elcom-float"
      aria-label="Open messages"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate("/app/elcom");
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5z"
          stroke="#ecfdf5"
          strokeWidth="1.85"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  if (typeof document === "undefined") return btn;
  return createPortal(btn, document.body);
}
