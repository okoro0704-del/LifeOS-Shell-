import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DigiconomyApiError,
  personalApi,
  type PersonalFinanceSummary,
} from "../../lib/digiconomyClient";
import { StatusBanner } from "../../components/StatusBanner";

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Personal finance — Digiconomy ledger summary, isolated from Business FinanceOS. */
export function FinancePage() {
  const [summary, setSummary] = useState<PersonalFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await personalApi.finance.summary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof DigiconomyApiError ? err.message : "Could not load personal finance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page personal-page">
      <header className="page-header">
        <h1>Personal finance</h1>
        <p className="muted">
          Individual net worth and private ledger activity. Business FinanceOS remains under Business
          space.
        </p>
      </header>

      {error ? <StatusBanner title="Ledger unavailable" detail={error} /> : null}

      {loading ? (
        <p className="muted">Loading personal ledger…</p>
      ) : summary ? (
        <>
          <div className="personal-finance-hero">
            <div>
              <p className="muted small">Net worth</p>
              <p className="personal-finance-hero__value">
                {money(summary.netWorth, summary.currency)}
              </p>
              <p className="muted small">
                {summary.ledgerLabel} · source {summary.source}
              </p>
            </div>
            <div>
              <p className="muted small">Available</p>
              <p className="personal-finance-hero__sub">
                {money(summary.available, summary.currency)}
              </p>
            </div>
          </div>

          <div className="row-actions" style={{ marginBottom: "1rem" }}>
            <Link to="/app/wallet" className="los-btn los-btn--soft los-btn--sm">
              Open shared TrustID wallet
            </Link>
            <button type="button" className="los-btn los-btn--ghost los-btn--sm" onClick={() => void load()}>
              Refresh
            </button>
          </div>

          <h2 className="personal-section-title">Recent activity</h2>
          {summary.transactions.length === 0 ? (
            <p className="muted">
              No personal ledger entries yet
              {summary.source === "lifeos"
                ? ". Connect Digiconomy Core (DIGICONOMY_API_URL) to stream wallet transactions."
                : "."}
            </p>
          ) : (
            <ul className="personal-list">
              {summary.transactions.map((tx) => (
                <li key={tx.id} className="personal-list__static">
                  <span className={`personal-tx ${tx.direction}`}>{tx.direction}</span>
                  <span className="personal-list__title">{tx.label}</span>
                  <span className="mono">
                    {tx.direction === "out" ? "−" : "+"}
                    {money(tx.amount, tx.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
