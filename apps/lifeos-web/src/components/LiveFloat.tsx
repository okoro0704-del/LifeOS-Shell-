import { Link } from "react-router-dom";

/** Blinking Live entry — persistent above bottom nav across Personal kernels. */
export function LiveFloat() {
  return (
    <Link to="/app/live" className="live-float" aria-label="Live streams">
      <span className="live-float__dot" aria-hidden />
      <span>LIVE</span>
    </Link>
  );
}
