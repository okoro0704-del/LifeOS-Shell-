import type { AvailabilitySlot, SlotPickerConfig } from "@lifeos/shared";

export function SlotPicker({
  config,
  slots,
  selectedId,
  onSelect,
  quantity,
  onQuantityChange,
  busy,
  error,
}: {
  config: SlotPickerConfig;
  slots: AvailabilitySlot[];
  selectedId?: string | null;
  onSelect: (slot: AvailabilitySlot) => void;
  quantity?: number;
  onQuantityChange?: (n: number) => void;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <div className="slot-picker" aria-label="Availability">
      <div className="slot-picker__head">
        <strong>{config.labels.primary ?? "Choose a time"}</strong>
        {config.labels.quantity && onQuantityChange ? (
          <label className="slot-picker__qty">
            {config.labels.quantity}
            <input
              type="number"
              min={1}
              max={12}
              value={quantity ?? 1}
              onChange={(e) => onQuantityChange(Number(e.target.value) || 1)}
            />
          </label>
        ) : null}
      </div>
      {error ? <p className="slot-picker__error">{error}</p> : null}
      {busy ? <p className="muted small">Checking availability…</p> : null}
      <div className="slot-picker__grid" role="listbox" aria-label="Available slots">
        {slots.map((s) => (
          <button
            key={s.id}
            type="button"
            role="option"
            aria-selected={selectedId === s.id}
            disabled={!s.available}
            className={`slot-chip${selectedId === s.id ? " active" : ""}${!s.available ? " taken" : ""}`}
            onClick={() => onSelect(s)}
          >
            <span>{s.label}</span>
            {!s.available ? <span className="slot-chip__meta">Taken</span> : null}
            {s.available && s.remaining != null ? (
              <span className="slot-chip__meta">{s.remaining} left</span>
            ) : null}
          </button>
        ))}
      </div>
      {!slots.length && !busy ? <p className="muted small">No slots for this selection.</p> : null}
    </div>
  );
}
