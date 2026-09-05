import { useCallback, useEffect, useRef, useState } from "react";
import {
  DigiconomyApiError,
  personalApi,
  type PersonalVaultItem,
  type VaultItemKind,
} from "../../lib/digiconomyClient";
import { StatusBanner } from "../../components/StatusBanner";

function formatBytes(n?: number | null) {
  if (n == null || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Secure personal vault — Digiconomy Kernel 1 port under LifeOS Personal. */
export function VaultPage() {
  const [items, setItems] = useState<PersonalVaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PersonalVaultItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await personalApi.vault.list();
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof DigiconomyApiError ? err.message : "Could not load vault");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onDropFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        const kind: VaultItemKind = file.type.startsWith("image/") || file.type.startsWith("video/")
          ? "media"
          : file.name.toLowerCase().includes("key")
            ? "key"
            : "document";
        await personalApi.vault.create({
          title: file.name,
          kind,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          previewHint: `Encrypted local metadata · ${file.type || "file"}`,
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page personal-page">
      <header className="page-header">
        <h1>Vault</h1>
        <p className="muted">
          Encrypted personal documents, keys, and assets. Metadata only — TrustID session stays
          local to LifeOS.
        </p>
      </header>

      {error ? <StatusBanner title="Vault unavailable" detail={error} /> : null}

      <div
        className={`personal-dropzone${uploading ? " is-busy" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("is-drag");
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove("is-drag")}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("is-drag");
          void onDropFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <strong>{uploading ? "Encrypting & registering…" : "Drop files to vault"}</strong>
        <span className="muted small">or click to choose — contents stay encrypted at rest</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void onDropFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {loading ? (
        <p className="muted">Loading vault…</p>
      ) : items.length === 0 ? (
        <p className="muted">No vault items yet. Add a document or secret key to get started.</p>
      ) : (
        <ul className="personal-list">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="personal-list__row" onClick={() => setPreview(item)}>
                <span className="personal-list__kind">{item.kind}</span>
                <span className="personal-list__title">{item.title}</span>
                <span className="muted small">{formatBytes(item.sizeBytes)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {preview ? (
        <div className="personal-modal" role="dialog" aria-modal="true" aria-label="Vault preview">
          <div className="personal-modal__panel">
            <header className="personal-modal__head">
              <h2>{preview.title}</h2>
              <button type="button" className="los-btn los-btn--ghost los-btn--sm" onClick={() => setPreview(null)}>
                Close
              </button>
            </header>
            <dl className="personal-meta">
              <div>
                <dt>Kind</dt>
                <dd>{preview.kind}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{preview.mimeType || "—"}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{formatBytes(preview.sizeBytes)}</dd>
              </div>
              <div>
                <dt>Encryption</dt>
                <dd>{preview.encrypted ? "Protected metadata" : "Open"}</dd>
              </div>
            </dl>
            {preview.previewHint ? <p className="muted">{preview.previewHint}</p> : null}
            <p className="muted small">
              Payload bytes are not streamed to the browser in Phase 2 — Digiconomy vault decryption
              lands with Kernel 1 offline sync.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
