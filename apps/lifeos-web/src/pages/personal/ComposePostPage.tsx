import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  creatorEarnHint,
  publishUserPost,
  type ContentTier,
} from "../../lib/personalMonetization";
import type { MediaItem } from "../../lib/personalCatalog";

const KINDS: MediaItem["kind"][] = ["post", "picture", "video", "reel", "book", "course"];

/**
 * Compose — creators pick Free / Premium / VIP when posting.
 * Free earns from ads, Premium from subscription, VIP from credit spend.
 */
export function ComposePostPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState<MediaItem["kind"]>("post");
  const [tier, setTier] = useState<ContentTier>("free");
  const [posted, setPosted] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    publishUserPost({ title, detail, kind, tier, vipCreditRate: kind === "book" ? 2 : 5 });
    setPosted(true);
    window.setTimeout(() => {
      if (tier === "free") navigate("/app/personal/free/post");
      else navigate("/app/personal/post");
    }, 700);
  }

  return (
    <div className="page personal-page compose-page">
      <header className="page-header page-header--compact">
        <h1>New post</h1>
        <p className="muted small">Choose Free, Premium, or VIP. Creators earn from all three.</p>
      </header>

      <form className="compose-form" onSubmit={submit}>
        <label className="compose-form__field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you posting?"
            required
          />
        </label>

        <label className="compose-form__field">
          <span>Detail</span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Short description"
            rows={3}
          />
        </label>

        <label className="compose-form__field">
          <span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as MediaItem["kind"])}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="compose-form__tiers">
          <legend>Monetization</legend>
          {(
            [
              {
                id: "free" as const,
                label: "Free",
                blurb: "Runs in Free kernel with ads. Viewers interrupted; you earn from ads.",
              },
              {
                id: "premium" as const,
                label: "Premium",
                blurb: "Main only, no ads. Earn from Premium subscriptions.",
              },
              {
                id: "vip" as const,
                label: "VIP",
                blurb: "Books, courses, movies. LifeOS credits drain while they watch.",
              },
            ] as const
          ).map((opt) => (
            <label key={opt.id} className={`compose-form__tier${tier === opt.id ? " is-active" : ""}`}>
              <input
                type="radio"
                name="tier"
                value={opt.id}
                checked={tier === opt.id}
                onChange={() => setTier(opt.id)}
              />
              <strong>{opt.label}</strong>
              <span className="muted small">{opt.blurb}</span>
              <span className="compose-form__earn">{creatorEarnHint(opt.id)}</span>
            </label>
          ))}
        </fieldset>

        <button type="submit" className="los-btn los-btn--primary" disabled={posted}>
          {posted ? "Posted…" : "Publish"}
        </button>
      </form>

      <p>
        <Link to="/app/personal/post" className="text-link">
          Cancel
        </Link>
      </p>
    </div>
  );
}
