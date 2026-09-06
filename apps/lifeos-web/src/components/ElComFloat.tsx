import { Link } from "react-router-dom";

/** Floating ElCom chat above the bottom nav. */
export function ElComFloat() {
  return (
    <Link to="/app/messages" className="elcom-float" aria-label="Open ElCom chat">
      ElCom
    </Link>
  );
}
