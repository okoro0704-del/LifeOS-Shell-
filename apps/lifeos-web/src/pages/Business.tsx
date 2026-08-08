import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type {
  ActionPreviewResponse,
  AvailabilitySlot,
  DiscoverableBusiness,
  DiscoverableOffering,
  ExperiencePermission,
  ExperienceRecord,
  ExperienceSessionPublic,
  OrchestratedAction,
  SlotPickerConfig,
} from "@lifeos/shared";
import {
  Button,
  EmptyState,
  OfferingCard,
  SectionHeader,
  Skeleton,
} from "@lifeos/ui";
import { ExperienceViewer } from "../components/ExperienceViewer";
import { PermissionConsent } from "../components/PermissionConsent";
import { PermissionRequestSheet } from "../components/PermissionRequestSheet";
import { StatusBanner } from "../components/StatusBanner";
import { ActionPreview } from "../components/ActionPreview";
import { SlotPicker } from "../components/SlotPicker";
import { actionService, bookingService, discoverService } from "../lib/services";
import { ApiError } from "../lib/api";
import type { ExperiencePaymentRequest } from "../components/ExperienceViewer";

type Listing = ExperienceRecord & { loadable: boolean; availability?: string };

const COVERS: Record<string, string> = {
  Stay: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  Eat: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  Wellness: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
  Fitness: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  Cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
  Events: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
  Activities: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
  Travel: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
};

function primaryAction(o: DiscoverableOffering): OrchestratedAction {
  if (o.capabilities.includes("PURCHASE_TICKET")) return "PURCHASE_TICKET";
  if (o.capabilities.includes("JOIN")) return "JOIN";
  if (o.capabilities.includes("RESERVE") && o.type === "MEAL") return "RESERVE";
  if (o.capabilities.includes("BOOK")) return "BOOK";
  if (o.capabilities.includes("BUY")) return "BUY";
  return "BOOK";
}

function primaryLabel(o: DiscoverableOffering): string {
  const a = primaryAction(o);
  if (a === "PURCHASE_TICKET") return "Buy ticket";
  if (a === "JOIN") return "Join";
  if (a === "RESERVE") return "Reserve";
  if (a === "BUY" || o.type === "MEAL" || o.category === "Eat") return "Order";
  return "Book";
}

function isOrderStyle(o: DiscoverableOffering): boolean {
  if (o.type === "MEAL" || o.category === "Eat") return true;
  if (o.capabilities.includes("BUY") || o.capabilities.includes("PURCHASE_TICKET")) return true;
  return false;
}

function firstOfferingOfKind(
  offerings: DiscoverableOffering[],
  kind: "order" | "book",
): DiscoverableOffering | null {
  return (
    offerings.find((o) => (kind === "order" ? isOrderStyle(o) : !isOrderStyle(o))) ?? null
  );
}

/** Client safety net when API still returns localhost tenant URLs. */
function normalizeExperienceUrls<T extends ExperienceRecord>(exp: T): T {
  if (typeof window === "undefined") return exp;
  try {
    const u = new URL(exp.experienceUrl);
    if (!/localhost|127\.0\.0\.1/i.test(u.hostname)) return exp;
    const path = u.pathname === "/" ? "/" : u.pathname;
    const hosPath = path.startsWith("/hos") ? path : `/hos${path === "/" ? "/" : path}`;
    return {
      ...exp,
      experienceUrl: `${window.location.origin}${hosPath}`.replace(/([^:]\/)\/+/g, "$1"),
      approvedOrigin: window.location.origin,
    };
  } catch {
    return exp;
  }
}

/** Full-app business catalog: services first, then Visit → PWA. */
export function BusinessPage() {
  const { businessId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const offeringId = params.get("offering");
  const openExperienceFlag = params.get("open") === "1" || params.get("open") === "experience";

  const [business, setBusiness] = useState<DiscoverableBusiness | null>(null);
  const [offerings, setOfferings] = useState<DiscoverableOffering[]>([]);
  const [experience, setExperience] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedOffering, setSelectedOffering] = useState<DiscoverableOffering | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotPicker, setSlotPicker] = useState<SlotPickerConfig | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState<ActionPreviewResponse | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<OrchestratedAction>("BOOK");
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [pending, setPending] = useState<{
    experience: Listing;
    requestable: { id: ExperiencePermission; label: string }[];
  } | null>(null);
  const [session, setSession] = useState<{
    experience: Listing;
    session: ExperienceSessionPublic;
  } | null>(null);
  const [extraPerms, setExtraPerms] = useState<{
    requested: ExperiencePermission[];
    alreadyGranted: ExperiencePermission[];
  } | null>(null);
  const [pwaPayment, setPwaPayment] = useState<ExperiencePaymentRequest | null>(null);
  const [pwaPayBusy, setPwaPayBusy] = useState(false);
  const [pwaPayError, setPwaPayError] = useState<string | null>(null);
  const [bookingUpdate, setBookingUpdate] = useState<{ bookingId: string; status: string } | null>(
    null,
  );

  const cover = useMemo(() => {
    if (!business) return COVERS.Stay;
    return business.logo || COVERS[business.category] || COVERS.Stay;
  }, [business]);

  const orderOffering = useMemo(() => firstOfferingOfKind(offerings, "order"), [offerings]);
  const bookOffering = useMemo(() => firstOfferingOfKind(offerings, "book"), [offerings]);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    void discoverService
      .getBusiness(businessId)
      .then((res) => {
        setBusiness(res.business);
        setOfferings(res.offerings ?? []);
        if (res.experience) {
          setExperience({
            ...res.experience,
            loadable: true,
            availability:
              typeof res.experience.metadata?.availability === "string"
                ? res.experience.metadata.availability
                : undefined,
          });
        } else {
          setExperience(null);
        }
      })
      .catch(() => setError("We couldn't load this business."))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (!offeringId) {
      setSelectedOffering(null);
      setCheckoutPreview(null);
      setCheckoutError(null);
      return;
    }
    void discoverService
      .getOffering(offeringId)
      .then((res) => {
        setSelectedOffering(res.offering);
        setSlots(res.availability?.slots ?? []);
        setSlotPicker(res.slotPicker ?? null);
        setSaved(Boolean(res.saved));
        setSelectedSlotId(null);
        setCheckoutPreview(null);
        setCheckoutError(null);
      })
      .catch(() => setError("We couldn't open that service."));
  }, [offeringId]);

  const autoLaunchDone = useRef(false);

  useEffect(() => {
    autoLaunchDone.current = false;
  }, [businessId]);

  useEffect(() => {
    if (!openExperienceFlag || !business?.experienceId || autoLaunchDone.current) return;
    autoLaunchDone.current = true;
    const experienceId = business.experienceId;
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("open");
      return next;
    }, { replace: true });
    void (async () => {
      setError(null);
      setSession(null);
      setExtraPerms(null);
      try {
        let listing = experience;
        if (!listing || listing.id !== experienceId) {
          const res = await discoverService.getExperience(experienceId);
          listing = {
            ...res.experience,
            loadable: true,
            availability:
              typeof res.experience.metadata?.availability === "string"
                ? res.experience.metadata.availability
                : undefined,
          };
          setExperience(listing);
        }
        const perms = await discoverService.permissions(experienceId);
        if (perms.connected) {
          const { session: exSession } = await discoverService.session(experienceId);
          setPending(null);
          setSession({ experience: listing, session: exSession });
        } else {
          setPending({ experience: listing, requestable: perms.requestable });
        }
      } catch {
        setError("We couldn't open this experience. Try again.");
      }
    })();
  }, [openExperienceFlag, business?.experienceId, experience, setParams]);

  function setOfferingParam(id: string | null) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("offering", id);
      else next.delete("offering");
      next.delete("open");
      return next;
    });
  }

  async function launchExperience(experienceId: string) {
    setError(null);
    setSession(null);
    setExtraPerms(null);
    try {
      let listing = experience;
      if (!listing || listing.id !== experienceId) {
        const res = await discoverService.getExperience(experienceId);
        listing = {
          ...res.experience,
          loadable: true,
          availability:
            typeof res.experience.metadata?.availability === "string"
              ? res.experience.metadata.availability
              : undefined,
        };
      }
      listing = {
        ...normalizeExperienceUrls(listing),
        loadable: true,
      };
      setExperience(listing);
      const perms = await discoverService.permissions(experienceId);
      if (perms.connected) {
        const { session: exSession } = await discoverService.session(experienceId);
        setPending(null);
        setSession({ experience: listing, session: exSession });
      } else {
        setPending({ experience: listing, requestable: perms.requestable });
      }
    } catch {
      setError("We couldn't open this experience. Try again.");
    }
  }

  function clearExperience() {
    setPending(null);
    setSession(null);
    setExtraPerms(null);
    setPwaPayment(null);
    setPwaPayError(null);
    setBookingUpdate(null);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("open");
      return next;
    });
  }

  async function confirmPwaPayment() {
    if (!pwaPayment) return;
    setPwaPayBusy(true);
    setPwaPayError(null);
    try {
      const { booking } = await bookingService.confirm(pwaPayment.bookingId, {
        idempotencyKey: `ui-confirm:${pwaPayment.bookingId}`,
      });
      setBookingUpdate({ bookingId: booking.id, status: booking.status });
      setPwaPayment(null);
    } catch (err) {
      setPwaPayError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPwaPayBusy(false);
    }
  }

  async function startAction(action: OrchestratedAction) {
    if (!selectedOffering) return;
    setPendingAction(action);
    setCheckoutError(null);
    if (!selectedSlotId && action !== "SAVE" && action !== "VIEW" && action !== "OPEN_EXPERIENCE") {
      setCheckoutError("Choose an available time first.");
      return;
    }
    setConfirmBusy(true);
    try {
      const { preview } = await actionService.preview({
        action,
        offeringId: selectedOffering.id,
        slotId: selectedSlotId ?? undefined,
        quantity,
        partySize: quantity,
      });
      setCheckoutPreview(preview);
    } catch (err) {
      if (err instanceof ApiError && /slot|unavailable|taken/i.test(err.message + err.code)) {
        setCheckoutError(err.message || "That time was just taken. Choose another time.");
        const fresh = await discoverService.offeringAvailability(selectedOffering.id, { quantity });
        setSlots(fresh.availability.slots);
      } else {
        setCheckoutError("Couldn't prepare that action. Try again.");
      }
    } finally {
      setConfirmBusy(false);
    }
  }

  async function confirmCheckout() {
    if (!selectedOffering || !checkoutPreview) return;
    setConfirmBusy(true);
    setCheckoutError(null);
    try {
      const { result } = await actionService.confirm({
        action: pendingAction,
        offeringId: selectedOffering.id,
        slotId: selectedSlotId ?? undefined,
        quantity,
        partySize: quantity,
        confirmed: true,
        expectedTotal: checkoutPreview.serverQuotedTotal,
        authorizationToken: checkoutPreview.params.authorizationToken
          ? String(checkoutPreview.params.authorizationToken)
          : undefined,
      });
      setCheckoutPreview(null);
      if (result.status === "FAILED") {
        setCheckoutError(result.message);
        return;
      }
      if (result.launchExperienceId) {
        void launchExperience(result.launchExperienceId);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setCheckoutError(err.message || "Action failed.");
      } else {
        setCheckoutError("Action failed. Try again.");
      }
    } finally {
      setConfirmBusy(false);
    }
  }

  async function toggleSave() {
    if (!selectedOffering) return;
    if (saved) {
      await actionService.unsave(selectedOffering.id);
      setSaved(false);
    } else {
      await actionService.save(selectedOffering.id);
      setSaved(true);
    }
  }

  async function handlePermissionRequest(permissions: string[]) {
    if (!session) return;
    try {
      const perms = await discoverService.permissions(session.experience.id);
      const requested = permissions.filter((p): p is ExperiencePermission =>
        perms.requestable.some((r) => r.id === p),
      );
      const alreadyGranted = perms.granted;
      const novel = requested.filter((p) => !alreadyGranted.includes(p));
      if (!novel.length) return;
      setExtraPerms({ requested: novel, alreadyGranted });
    } catch {
      setError("We couldn't update permissions. Try again.");
    }
  }

  if (loading) {
    return (
      <div className="page business-page">
        <Skeleton height={220} label="Loading business" />
        <Skeleton height={120} />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="page business-page">
        {error ? <StatusBanner title={error} /> : null}
        <EmptyState
          title="Business not found"
          detail="It may have been removed from LifeOS."
          action={
            <Button variant="soft" onClick={() => navigate("/app/discover")}>
              Back to Explore
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page business-page">
      {error ? <StatusBanner title={error} /> : null}

      <div className="business-hero">
        <img className="business-hero__img" src={cover} alt="" />
        <div className="business-hero__shade" aria-hidden />
        <div className="business-hero__copy">
          <p className="business-hero__os muted small">
            {(experience?.metadata?.osLabel as string) || business.category}
          </p>
          <h1 className="business-hero__title">{business.businessName}</h1>
          <p className="business-hero__meta">
            {business.category}
            {business.location ? ` · ${business.location}` : ""}
            {business.rating != null ? ` · ★ ${business.rating.toFixed(1)}` : ""}
          </p>
        </div>
      </div>

      <p className="business-page__desc">{business.description}</p>
      {business.hours ? <p className="muted small">Hours: {business.hours}</p> : null}
      {business.contact ? <p className="muted small">Contact: {business.contact}</p> : null}

      <div className="business-page__cta row-actions">
        <Button
          onClick={() => {
            if (business.experienceId) void launchExperience(business.experienceId);
          }}
          disabled={!business.experienceId}
        >
          Visit {business.businessName}
        </Button>
        {bookOffering ? (
          <Button variant="soft" onClick={() => setOfferingParam(bookOffering.id)}>
            Book
          </Button>
        ) : null}
        {orderOffering ? (
          <Button variant="soft" onClick={() => setOfferingParam(orderOffering.id)}>
            Order
          </Button>
        ) : null}
        {!bookOffering && !orderOffering && offerings[0] ? (
          <Button variant="soft" onClick={() => setOfferingParam(offerings[0].id)}>
            {primaryLabel(offerings[0])}
          </Button>
        ) : null}
      </div>

      {selectedOffering ? (
        <section className="business-offering-panel" aria-label={selectedOffering.name}>
          <button
            type="button"
            className="text-link business-offering-panel__back"
            onClick={() => setOfferingParam(null)}
          >
            ← All services
          </button>
          <h2>{selectedOffering.name}</h2>
          <p className="muted">{selectedOffering.businessName}</p>
          <p className="offering-detail__price">
            {[selectedOffering.duration, selectedOffering.priceFormatted].filter(Boolean).join(" · ")}
          </p>
          <p>{selectedOffering.description}</p>

          {checkoutPreview ? (
            <ActionPreview
              preview={{
                actionId: "BOOK_SERVICE",
                title: checkoutPreview.title,
                subtitle: checkoutPreview.subtitle,
                lines: checkoutPreview.lines,
                amount: checkoutPreview.amount,
                params: checkoutPreview.params,
                confirmLabel: checkoutPreview.confirmLabel,
                payment: checkoutPreview.payment,
                policy: checkoutPreview.policy,
              }}
              busy={confirmBusy}
              error={checkoutError}
              onCancel={() => {
                setCheckoutPreview(null);
                setCheckoutError(null);
              }}
              onConfirm={() => void confirmCheckout()}
            />
          ) : (
            <>
              {slotPicker ? (
                <SlotPicker
                  config={slotPicker}
                  slots={slots}
                  selectedId={selectedSlotId}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  error={checkoutError}
                  onSelect={(s) => {
                    setSelectedSlotId(s.id);
                    setCheckoutError(null);
                  }}
                />
              ) : null}
              <div className="row-actions">
                {selectedOffering.capabilities.includes("BOOK") ||
                selectedOffering.capabilities.includes("RESERVE") ||
                selectedOffering.capabilities.includes("JOIN") ||
                selectedOffering.capabilities.includes("PURCHASE_TICKET") ? (
                  <Button onClick={() => void startAction(primaryAction(selectedOffering))}>
                    {primaryLabel(selectedOffering)}
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={() => void toggleSave()}>
                  {saved ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="soft"
                  onClick={() => {
                    if (business.experienceId) void launchExperience(business.experienceId);
                  }}
                >
                  Visit {business.businessName}
                </Button>
              </div>
            </>
          )}
        </section>
      ) : (
        <>
          <SectionHeader
            title="Services & products"
            subtitle={`${offerings.length} available`}
          />
          {offerings.length === 0 ? (
            <EmptyState
              title="No listed services yet"
              detail="Open the business experience to browse inside their app."
              action={
                <Button
                  variant="soft"
                  onClick={() => {
                    if (business.experienceId) void launchExperience(business.experienceId);
                  }}
                >
                  Visit {business.businessName}
                </Button>
              }
            />
          ) : (
            <div className="exp-grid">
              {offerings.map((o) => (
                <OfferingCard
                  key={o.id}
                  name={o.name}
                  businessName={o.businessName}
                  category={o.category}
                  price={o.priceFormatted}
                  priceUnit={o.priceUnit}
                  duration={o.duration}
                  location={o.location}
                  availability={o.availability}
                  badge={o.badge}
                  rating={o.rating}
                  image={o.image}
                  onClick={() => setOfferingParam(o.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {pending ? (
        <PermissionConsent
          experience={pending.experience}
          requestable={pending.requestable}
          onCancel={clearExperience}
          onConnected={(exSession) => {
            const exp = pending.experience;
            setPending(null);
            setSession({ experience: exp, session: exSession });
          }}
        />
      ) : null}

      {session && !pending ? (
        <ExperienceViewer
          key={session.session.sessionId}
          experience={session.experience}
          session={session.session}
          onClose={clearExperience}
          onPermissionRequest={(p) => void handlePermissionRequest(p)}
          onPaymentRequest={(req) => {
            setPwaPayment(req);
            setPwaPayError(null);
          }}
          bookingUpdate={bookingUpdate}
        />
      ) : null}

      {pwaPayment ? (
        <div className="experience-overlay" style={{ zIndex: 95 }} role="dialog" aria-modal="true">
          <div className="experience-panel">
            <h2>Confirm payment</h2>
            <p>
              {pwaPayment.title ?? "Booking"} ·{" "}
              {pwaPayment.amount != null
                ? `${pwaPayment.currency ?? "NGN"} ${pwaPayment.amount.toLocaleString()}`
                : "Amount from hold"}
            </p>
            <p className="muted small">
              Pay in LifeOS so this reservation syncs to Activity and the business app.
            </p>
            {pwaPayError ? <p className="error">{pwaPayError}</p> : null}
            <div className="row-actions">
              <Button onClick={() => void confirmPwaPayment()} disabled={pwaPayBusy}>
                {pwaPayBusy ? "Confirming…" : "Confirm & pay"}
              </Button>
              <Button variant="ghost" onClick={() => setPwaPayment(null)} disabled={pwaPayBusy}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {session && extraPerms ? (
        <PermissionRequestSheet
          experience={session.experience}
          requested={extraPerms.requested}
          alreadyGranted={extraPerms.alreadyGranted}
          onCancel={() => setExtraPerms(null)}
          onResolved={(exSession) => {
            setExtraPerms(null);
            if (exSession) {
              setSession({ experience: session.experience, session: exSession });
            }
          }}
        />
      ) : null}
    </div>
  );
}
