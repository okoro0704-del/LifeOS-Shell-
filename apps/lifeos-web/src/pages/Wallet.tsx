import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ActivityRow,
  Button,
  Chip,
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
  symbol?: string;
  currency?: string;
  counterparty: string;
  memo?: string;
  createdAt: string;
  status: string;
  rail?: "fiat" | "token";
};

type Mode = "idle" | "send" | "receive" | "pay";
type Rail = "fiat" | "token";

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

function unit(tx: Tx) {
  return tx.symbol || tx.currency || "";
}

export function WalletPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof walletService.get>> | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [rail, setRail] = useState<Rail>("fiat");
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
    const railParam = params.get("rail");
    if (railParam === "token" || railParam === "fiat") setRail(railParam);
    if (action === "send" || action === "pay" || action === "receive") {
      setMode(action);
      params.delete("action");
      params.delete("rail");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const fiatTxs: Tx[] = useMemo(
    () =>
      (data?.fiat?.transactions ?? []).map((t) => ({
        ...t,
        symbol: t.currency,
        rail: "fiat" as const,
      })),
    [data],
  );

  const tokenTxs: Tx[] = useMemo(
    () =>
      (data?.token?.transactions ?? data?.transactions ?? []).map((t) => ({
        ...t,
        rail: "token" as const,
      })),
    [data],
  );

  const activeTxs = rail === "fiat" ? fiatTxs : tokenTxs;

  const grouped = useMemo(() => {
    const map = new Map<string, Tx[]>();
    for (const tx of activeTxs) {
      const key = dayLabel(tx.createdAt);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [activeTxs]);

  async function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rail === "fiat") {
      setError("Cash transfers are coming soon. Switch to Tokens to send in preview.");
      return;
    }
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
    if (rail === "fiat") {
      setError("Cash payments are coming soon. Switch to Tokens to pay in preview.");
      return;
    }
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

  const fiat = data?.fiat;
  const tokenBalance = data?.token?.balance ?? data?.balance;
  const tokenWallet = data?.token?.wallet ?? data?.wallet;

  return (
    <div className="page">
      <SectionHeader
        title="Wallet"
        subtitle="Cash for everyday money · Tokens for the ecosystem"
      />
      {error ? <StatusBanner title={error} /> : null}
      {success ? (
        <div className="success-banner" role="status">
          {success}
        </div>
      ) : null}

      <div className="chip-row" role="tablist" aria-label="Wallet type">
        <Chip active={rail === "fiat"} onClick={() => setRail("fiat")} role="tab" aria-selected={rail === "fiat"}>
          Cash
        </Chip>
        <Chip active={rail === "token"} onClick={() => setRail("token")} role="tab" aria-selected={rail === "token"}>
          Tokens
        </Chip>
      </div>

      {loading ? (
        <Skeleton height={180} label="Loading wallet" />
      ) : rail === "fiat" ? (
        <WalletCard
          variant="fiat"
          label="Cash"
          subtitle={fiat?.label ?? "LifeOS Cash"}
          balance={fiat?.balance.formatted}
          mask={fiat?.accountMask}
          actions={
            <>
              <button type="button" className="los-wallet__action" onClick={() => setMode("pay")}>
                Pay
              </button>
              <button type="button" className="los-wallet__action" onClick={() => setMode("send")}>
                Send
              </button>
              <button type="button" className="los-wallet__action" onClick={() => setMode("receive")}>
                Add
              </button>
            </>
          }
        />
      ) : (
        <WalletCard
          variant="token"
          label="Tokens"
          subtitle="LifeOS Token"
          balance={tokenBalance?.formatted}
          mask={maskAddress(tokenWallet?.address)}
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

      {rail === "fiat" && fiat?.notice ? (
        <p className="muted small wallet-rail-note">{fiat.notice}</p>
      ) : null}

      {mode === "send" ? (
        <form className="panel-form" onSubmit={onSend}>
          <h3>Send {rail === "fiat" ? "cash" : "tokens"}</h3>
          {rail === "fiat" ? (
            <p className="muted small">Bank transfers will land here. Preview only for now.</p>
          ) : null}
          <label>
            To
            <input
              name="to"
              required
              placeholder={rail === "fiat" ? "Account or phone" : "Address or TrustID"}
              autoComplete="off"
            />
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
          <h3>Pay with {rail === "fiat" ? "cash" : "tokens"}</h3>
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
          <h3>{rail === "fiat" ? "Add cash" : "Receive tokens"}</h3>
          {rail === "fiat" ? (
            <>
              <p className="muted small">
                Bank top-ups and card funding will appear here. Your cash account mask is{" "}
                <span className="mono">{fiat?.accountMask ?? "••••"}</span>.
              </p>
              <EmptyState
                title="Funding coming soon"
                detail="Physical fiat rails are not connected yet — this is a preview of your cash wallet."
              />
            </>
          ) : tokenWallet?.address ? (
            <div className="mono receive-box">{tokenWallet.address}</div>
          ) : (
            <EmptyState title="Address unavailable" />
          )}
          <Button variant="ghost" onClick={() => setMode("idle")}>
            Done
          </Button>
        </div>
      ) : null}

      <SectionHeader
        title="Recent activity"
        subtitle={rail === "fiat" ? "Cash movements" : "Token movements"}
      />
      {loading ? (
        <>
          <Skeleton height={48} />
          <Skeleton height={48} />
        </>
      ) : grouped.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          detail={
            rail === "fiat"
              ? "Cash payments and transfers will show here."
              : "Pay, send, or receive tokens to see activity here."
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
                  kind={tx.kind === "receive" || tx.kind === "deposit" ? "wallet_transfer" : "payment"}
                  title={tx.counterparty}
                  detail={`${tx.kind} · ${rail === "fiat" ? "Cash" : "Token"}`}
                  time={formatTime(tx.createdAt)}
                  amount={`${tx.kind === "receive" || tx.kind === "deposit" ? "+" : "−"}${tx.amount} ${unit(tx)}`}
                  onClick={() => setSelected(tx)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <section className="wallet-status">
        <SectionHeader title="Status" />
        <div className="surface-block padded">
          <p className="muted small">
            {data?.notice ??
              "Cash is your physical fiat wallet preview. Tokens connect to the ecosystem Token Network when it goes live."}
          </p>
        </div>
      </section>

      {selected ? (
        <Sheet title="Transaction" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div>
              <div className="label">Amount</div>
              <div className="mono">
                {selected.kind === "receive" || selected.kind === "deposit" ? "+" : "−"}
                {selected.amount} {unit(selected)}
              </div>
            </div>
            <div>
              <div className="label">Wallet</div>
              <div>{selected.rail === "fiat" ? "Cash (fiat)" : "Tokens"}</div>
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
