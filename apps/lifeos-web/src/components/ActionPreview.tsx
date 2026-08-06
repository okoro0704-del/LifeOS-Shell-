import { Button } from "@lifeos/ui";
import type { ActionPreviewPayload } from "@lifeos/shared";

export function ActionPreview({
  preview,
  busy,
  onCancel,
  onConfirm,
}: {
  preview: ActionPreviewPayload;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="action-preview" role="dialog" aria-labelledby="action-preview-title">
      <p className="action-preview__eyebrow">Confirm to continue</p>
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
      {preview.amount ? (
        <div className="action-preview__amount mono">{preview.amount}</div>
      ) : null}
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
