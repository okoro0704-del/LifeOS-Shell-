import { Button } from "@lifeos/ui";
import type { ActionPreviewPayload, PaymentPreview } from "@lifeos/shared";

type PreviewLike = ActionPreviewPayload & {
  payment?: PaymentPreview;
  policy?: string;
};

export function ActionPreview({
  preview,
  busy,
  onCancel,
  onConfirm,
  error,
  asSection = false,
}: {
  preview: PreviewLike;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  error?: string | null;
  /** When nested in a page (not a modal), render as a labelled region. */
  asSection?: boolean;
}) {
  return (
    <div
      className="action-preview"
      role={asSection ? "region" : "dialog"}
      aria-labelledby="action-preview-title"
      {...(asSection ? {} : { "aria-modal": true })}
    >
      <p className="action-preview__eyebrow">
        {/book|pay|purchase|cancel/i.test(preview.confirmLabel)
          ? "Review carefully — confirmation required"
          : "Confirm to continue"}
      </p>
      <h3 id="action-preview-title">{preview.title}</h3>
      {preview.subtitle ? <p className="muted">{preview.subtitle}</p> : null}
      <dl className="action-preview__lines">
        {preview.lines.map((line) => (
          <div key={line.label} className="action-preview__row">
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
      {preview.payment ? (
        <div className="payment-preview">
          {preview.payment.lines.map((l) => (
            <div key={l.label} className="payment-preview__row">
              <span>{l.label}</span>
              <span className="mono">{l.formatted}</span>
            </div>
          ))}
          <div className="payment-preview__total">
            <span>Total</span>
            <strong className="mono">{preview.payment.totalFormatted}</strong>
          </div>
          <p className="muted small">Pay with {preview.payment.methodLabel}</p>
        </div>
      ) : preview.amount ? (
        <div className="action-preview__amount mono">{preview.amount}</div>
      ) : null}
      {preview.policy ? <p className="muted small">{preview.policy}</p> : null}
      {error ? <p className="action-preview__error">{error}</p> : null}
      <div className="row-actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" onClick={onConfirm} disabled={busy}>
          {busy ? "Working…" : preview.confirmLabel}
        </Button>
      </div>
    </div>
  );
}
