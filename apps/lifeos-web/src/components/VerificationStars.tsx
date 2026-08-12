import { useMemo, useState } from "react";
import { Sheet } from "@lifeos/ui";
import { useAuth } from "../hooks/useAuth";

export type VerificationLevel = {
  id: string;
  label: string;
  detail: string;
};

export const VERIFICATION_LEVELS: VerificationLevel[] = [
  {
    id: "email",
    label: "Email",
    detail: "A verified email address on your LifeOS identity.",
  },
  {
    id: "phone",
    label: "Phone",
    detail: "A verified mobile number linked to your identity.",
  },
  {
    id: "address",
    label: "Address",
    detail: "A confirmed residential or mailing address.",
  },
  {
    id: "bvn",
    label: "BVN",
    detail: "Bank Verification Number for financial trust.",
  },
  {
    id: "gov_id",
    label: "Government ID",
    detail: "Passport, national ID, or driver’s license.",
  },
];

function useVerificationStatus() {
  const { user } = useAuth();
  return useMemo(() => {
    const tier = user?.trustTier ?? 0;
    const verifiedIdentity =
      user?.zkVerified ||
      user?.identityStatus === "verified" ||
      (typeof tier === "number" && tier >= 2);
    // Light stars from non-PII trust tier / ZK status — never from raw email columns.
    return VERIFICATION_LEVELS.map((level, index) => ({
      ...level,
      verified: index < Math.max(verifiedIdentity ? Math.min(tier || 1, 5) : tier, 0),
    }));
  }, [user?.trustTier, user?.identityStatus, user?.zkVerified]);
}

type Props = {
  className?: string;
};

/** Five identity stars in the top bar — tap any star for verified / not verified. */
export function VerificationStars({ className }: Props) {
  const levels = useVerificationStatus();
  const litCount = levels.filter((l) => l.verified).length;
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  function openSheet(levelId: string) {
    setFocusId(levelId);
    setOpen(true);
  }

  return (
    <>
      <div
        className={`verify-stars verify-stars--header${className ? ` ${className}` : ""}`}
        role="group"
        aria-label={`${litCount} of 5 identity levels verified`}
      >
        {levels.map((level, i) => (
          <button
            key={level.id}
            type="button"
            className={`verify-star-btn${level.verified ? " verify-star-btn--on" : ""}`}
            aria-label={`${level.label}: ${level.verified ? "verified" : "not verified"}`}
            onClick={() => openSheet(level.id)}
          >
            <span className="verify-star" aria-hidden>
              ★
            </span>
            <span className="sr-only">
              {i + 1}. {level.label}
            </span>
          </button>
        ))}
      </div>

      {open ? (
        <Sheet
          title="Identity verification"
          placement="center"
          onClose={() => setOpen(false)}
        >
          <p className="muted small verify-sheet__intro">
            Stars show what LifeOS has verified for you. Tap a star anytime to review status.
          </p>
          <ul className="verify-sheet__list">
            {levels.map((level) => {
              const focused = level.id === focusId;
              return (
                <li
                  key={level.id}
                  className={`verify-sheet__row${focused ? " verify-sheet__row--focus" : ""}`}
                >
                  <span
                    className={`verify-star${level.verified ? " verify-star--on" : ""}`}
                    aria-hidden
                  >
                    ★
                  </span>
                  <div className="verify-sheet__copy">
                    <strong>{level.label}</strong>
                    <span className="muted small">{level.detail}</span>
                  </div>
                  <span
                    className={`verify-sheet__badge${level.verified ? " verify-sheet__badge--ok" : ""}`}
                  >
                    {level.verified ? "Verified" : "Not verified"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Sheet>
      ) : null}
    </>
  );
}
