import { useLocation, useNavigate } from "react-router-dom";
import { IconMessage } from "@lifeos/ui";

/** Fixed chat float — icon only; same place across Personal pages / kernels. */
export function ElComFloat() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/app/elcom") return null;

  return (
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
      <IconMessage size={22} />
    </button>
  );
}
