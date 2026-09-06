import { Link } from "react-router-dom";

/** Floating ElCom — opens full-page Messages + Connect. */
export function ElComFloat() {
  return (
    <Link to="/app/elcom" className="elcom-float" aria-label="Open ElCom">
      ElCom
    </Link>
  );
}
