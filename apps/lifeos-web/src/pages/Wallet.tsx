import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ActivityRow,
  Button,
  EmptyState,
  SectionHeader,
  Sheet,
  Skeleton,
  WalletCard,
} from "@lifeos/ui";
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

function maskAddress(address?: string) {
  if (!address || address.length < 8) return "••••";
  return `•••• ${address.slice(-4)}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WalletPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof walletService.get>> | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const payload = await walletService.get();
    setData(payload);
  }

  useEffect(() => {
    void load()
      .catch(() => setError("We couldn't load your wallet. Try again."))
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
    setSuccess(null);
    try {
      await walletService.send({
        to: String(fd.get("to")),
        amount: Number(fd.get("amount")),
        memo: String(fd.get("memo") || "") || undefined,
      });
      setMode("idle");
      setSuccess("Sent successfully.");
      await load();
    } catch {
      setError("Couldn't complete send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await walletService.pay({
        merchant: String(fd.get("merchant")),
        amount: Number(fd.get("amount")),
        reference: String(fd.get("reference") || "") || undefined,
      });
      setMode("idle");
      setSuccess("Payment recorded.");
      await load();
    } catch {
      setError("Couldn't complete payment. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionHeader title="Wallet" />
      {error ? <StatusBanner title={error} /> : null}
      {success ? (
        <div className="success-banner" role="status">
          {success}
        </div>
      ) : null}

      {loading ? (
        <Skeleton height={180} label="Loading wallet" />
      ) : (
        <WalletCard
          balance={data?.balance.formatted}
          mask={maskAddress(data?.wallet.address)}
          actions={
            <>
              <button type="button" className="los-wallet__action" onClick={() => setMode("pay")}>
                Pay
              </button>
              <button type="button" className="los-wallet__action" onClick={() => setMode("send")}>
                Send
              </button>
              <button type="button" className="los-wallet__action" onClick={() => setMode("receive")}>
                Receive
              </button>
            </>
          }
        />
      )}

      {mode === "send" ? (
        <form className="panel-form" onSubmit={onSend}>
          <h3>Send</h3>
          <label>
            To
            <input name="to" required placeholder="Address or TrustID" autoComplete="off" />
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
              {busy ? "Sending…" : "Confirm"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "pay" ? (
        <form className="panel-form" onSubmit={onPay}>
          <h3>Pay</h3>
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
              {busy ? "Paying…" : "Confirm"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "receive" ? (
        <div className="panel-form">
          <h3>Receive</h3>
          {data?.wallet.address ? (
            <div className="mono receive-box">{data.wallet.address}</div>
          ) : (
            <EmptyState title="Address unavailable" />
          )}
          <Button variant="ghost" onClick={() => setMode("idle")}>
            Done
          </Button>
        </div>
      ) : null}

      <SectionHeader title="Recent transactions" />
      {loading ? (
        <>
          <Skeleton height={48} />
          <Skeleton height={48} />
        </>
      ) : grouped.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          detail="Pay, send, or receive to see activity here."
          action={
            <Button size="sm" variant="soft" onClick={() => setMode("pay")}>
              Make a payment →
            </Button>
          }
        />
      ) : (
        grouped.map(([day, txs]) => (
          <div key={day} className="tx-group">
            <div className="tx-day">{day}</div>
            <div className="surface-block">
              {txs.map((tx) => (
                <ActivityRow
                  key={tx.id}
                  kind={tx.kind === "receive" ? "wallet_transfer" : "payment"}
                  title={tx.counterparty}
                  detail={tx.kind}
                  time={formatTime(tx.createdAt)}
                  amount={`${tx.kind === "receive" ? "+" : "−"}${tx.amount} ${tx.symbol}`}
                  onClick={() => setSelected(tx)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <section className="wallet-status">
        <SectionHeader title="Network" subtitle="Token settlement status" />
        <div className="surface-block padded">
          <p className="muted small">
            Connected to the LifeOS wallet provider. Settlement is simulated until Token Network
            goes live.
          </p>
        </div>
      </section>

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
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
