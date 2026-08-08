import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
  /** Optional right-side control (keeps title centered). */
  trail?: ReactNode;
};

/** Sticky page chrome for every non-Home screen — centered title + back. */
export function PageTopBar({ title, subtitle, trail }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  function goBack() {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }
    navigate("/app");
  }

  return (
    <header className="page-topbar">
      <button type="button" className="page-topbar__back" onClick={goBack} aria-label="Go back">
        <span className="page-topbar__back-icon" aria-hidden>
          ←
        </span>
      </button>
      <div className="page-topbar__center">
        <h1 className="page-topbar__title">{title}</h1>
        {subtitle ? <p className="page-topbar__sub">{subtitle}</p> : null}
      </div>
      <div className="page-topbar__trail">{trail ?? null}</div>
    </header>
  );
}
