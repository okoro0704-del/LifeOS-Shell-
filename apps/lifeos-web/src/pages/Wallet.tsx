import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, EmptyState, SectionHeader, Sheet, Skeleton } from "@lifeos/ui";
import { userFacingMessage } from "../lib/api";
import { walletService } from "../lib/services";
import { StatusBanner } from "../components/StatusBanner";

type Tx = {
  id: string;
  kind: string;
  amount: number;
  symbol: string;
  counterparty: string;
  memo?: string;
  createdAt: string;
  status: string;
};

type Mode = "idle" | "send" | "receive" | "pay";

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function WalletPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof walletService.get>> | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const payload = await walletService.get();
    setData(payload);
  }

  useEffect(() => {
    void load()
      .catch((e) => setError(userFacingMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const action = params.get("action");
    if (action === "send" || action === "pay" || action === "receive") {
      setMode(action);
      params.delete("action");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tx[]>();
    for (const tx of data?.transactions ?? []) {
      const key = dayLabel(tx.createdAt);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [data]);

  async function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await walletService.send({
        to: String(fd.get("to")),
        amount: Number(fd.get("amount")),
        memo: String(fd.get("memo") || "") || undefined,
      });
      setMode("idle");
      await load();
    } catch (err) {
      setError(userFacingMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await walletService.pay({
        merchant: String(fd.get("merchant")),
        amount: Number(fd.get("amount")),
        reference: String(fd.get("reference") || "") || undefined,
      });
      setMode("idle");
      await load();
    } catch (err) {
      setError(userFacingMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionHeader title="Wallet" subtitle="Mock Token Network — not real settlement" />
      {error ? <StatusBanner title={error} /> : null}

      <div className="wallet-card">
        <div className="label">Balance · mock</div>
        {loading ? (
          <Skeleton height={40} />
        ) : (
          <div className="wallet-amount">{data?.balance.formatted ?? "…"}</div>
        )}
        <div className="muted small mono">{data?.wallet.address}</div>
        {data?.notice ? <p className="wallet-notice">{data.notice}</p> : null}
      </div>

      <div className="action-row">
        <Button variant="ghost" onClick={() => setMode("send")}>
          Send
        </Button>
        <Button variant="ghost" onClick={() => setMode("receive")}>
          Receive
        </Button>
        <Button onClick={() => setMode("pay")}>Pay</Button>
      </div>

      {mode === "send" ? (
        <form className="panel-form" onSubmit={onSend}>
          <h3>Send (mock)</h3>
          <label>
            To
            <input name="to" required placeholder="Address or TrustID" />
          </label>
          <label>
            Amount
            <input name="amount" type="number" min="1" step="1" required />
          </label>
          <label>
            Memo
            <input name="memo" />
          </label>
          <div className="row-actions">
            <Button type="submit" disabled={busy}>
              Confirm
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "pay" ? (
        <form className="panel-form" onSubmit={onPay}>
          <h3>Pay (mock)</h3>
          <label>
            Merchant
            <input name="merchant" required defaultValue="Sunrise Hotel" />
          </label>
          <label>
            Amount
            <input name="amount" type="number" min="1" step="1" required />
          </label>
          <label>
            Reference
            <input name="reference" />
          </label>
          <div className="row-actions">
            <Button type="submit" disabled={busy}>
              Confirm
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "receive" ? (
        <div className="panel-form">
          <h3>Receive (mock)</h3>
          <div className="mono receive-box">{data?.wallet.address}</div>
          <Button variant="ghost" onClick={() => setMode("idle")}>
            Done
          </Button>
        </div>
      ) : null}

      <SectionHeader title="Transactions" subtitle="Grouped mock history" />
      {loading ? (
        <Skeleton height={120} />
      ) : grouped.length === 0 ? (
        <EmptyState title="No transactions yet." />
      ) : (
        grouped.map(([day, txs]) => (
          <div key={day} className="tx-group">
            <div className="tx-day">{day}</div>
            <ul className="list">
              {txs.map((tx) => (
                <li
                  key={tx.id}
                  className="list-row clickable"
                  onClick={() => setSelected(tx)}
                >
                  <div>
                    <strong className="capitalize">{tx.counterparty}</strong>
                    <div className="muted small capitalize">{tx.kind} · mock</div>
                  </div>
                  <span className="mono">
                    {tx.kind === "receive" ? "+" : "−"}
                    {tx.amount} {tx.symbol}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {selected ? (
        <Sheet title="Transaction" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div>
              <div className="label">Amount</div>
              <div className="mono">
                {selected.kind === "receive" ? "+" : "−"}
                {selected.amount} {selected.symbol}
              </div>
            </div>
            <div>
              <div className="label">Type</div>
              <div className="capitalize">{selected.kind}</div>
            </div>
            <div>
              <div className="label">Status</div>
              <div>{selected.status}</div>
            </div>
            <div>
              <div className="label">Counterparty</div>
              <div>{selected.counterparty}</div>
            </div>
            <div>
              <div className="label">Reference</div>
              <div>{selected.memo || "—"}</div>
            </div>
            <div>
              <div className="label">Date</div>
              <div>{new Date(selected.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="label">Source</div>
              <div>Token Network (mock)</div>
            </div>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
