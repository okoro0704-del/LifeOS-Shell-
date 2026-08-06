import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  Chip,
  EmptyState,
  OfferingCard,
  SearchBar,
  SectionHeader,
  Sheet,
  Skeleton,
} from "@lifeos/ui";
import { ExperienceViewer } from "../components/ExperienceViewer";
import { PermissionConsent } from "../components/PermissionConsent";
import { PermissionRequestSheet } from "../components/PermissionRequestSheet";
import { StatusBanner } from "../components/StatusBanner";
import { AskLifeOSTrigger } from "../components/CommandOverlay";
import { useCommandLayer } from "../hooks/useCommandLayer";
import { ActionPreview } from "../components/ActionPreview";
import { SlotPicker } from "../components/SlotPicker";
import { actionService, discoverService } from "../lib/services";
import { ApiError } from "../lib/api";

type Listing = ExperienceRecord & { loadable: boolean; availability?: string };

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
  if (a === "BUY") return "Buy";
  return "Book";
}

const CATEGORY_CHIPS = [
  { id: "All", label: "All" },
  { id: "Stay", label: "Stay" },
  { id: "Eat", label: "Eat" },
  { id: "Wellness", label: "Wellness" },
  { id: "Fitness", label: "Fitness" },
  { id: "Events", label: "Events" },
  { id: "Cinema", label: "Cinema" },
  { id: "Activities", label: "Activities" },
  { id: "More", label: "More" },
] as const;

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const { openCommand } = useCommandLayer();
  const [offerings, setOfferings] = useState<DiscoverableOffering[]>([]);
  const [experiences, setExperiences] = useState<Listing[]>([]);
  const [category, setCategory] = useState<string>(params.get("category") || "All");
  const [query, setQuery] = useState(params.get("q") || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOffering, setSelectedOffering] = useState<DiscoverableOffering | null>(null);
  const [moreFromBusiness, setMoreFromBusiness] = useState<DiscoverableOffering[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotPicker, setSlotPicker] = useState<SlotPickerConfig | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(false);
  const [checkoutPreview, setCheckoutPreview] = useState<ActionPreviewResponse | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<OrchestratedAction>("BOOK");
  const [selectedBusiness, setSelectedBusiness] = useState<{
    business: DiscoverableBusiness;
    offerings: DiscoverableOffering[];
  } | null>(null);
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

  const openId = params.get("open");
  const offeringId = params.get("offering");
  const businessId = params.get("business");

  useEffect(() => {
    const cat = params.get("category");
    if (cat) setCategory(cat);
  }, [params]);

  useEffect(() => {
    void discoverService
      .get()
      .then((d) => {
        setOfferings(d.offerings ?? []);
        setExperiences(d.items);
      })
      .catch(() => setError("We couldn't load discovery. Try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!offeringId) {
      setSelectedOffering(null);
      setMoreFromBusiness([]);
      return;
    }
    void discoverService
      .getOffering(offeringId)
      .then((res) => {
        setSelectedOffering(res.offering);
        setMoreFromBusiness(res.moreFromBusiness);
        setSlots(res.availability?.slots ?? []);
        setSlotPicker(res.slotPicker ?? null);
        setSaved(Boolean(res.saved));
        setSelectedSlotId(null);
        setCheckoutPreview(null);
        setCheckoutError(null);
        setSelectedBusiness(null);
      })
      .catch(() => setError("We couldn't open that offering."));
  }, [offeringId]);

  useEffect(() => {
    if (!businessId) return;
    void discoverService
      .getBusiness(businessId)
      .then((res) => {
        setSelectedBusiness({ business: res.business, offerings: res.offerings });
        setSelectedOffering(null);
      })
      .catch(() => setError("We couldn't open that business."));
  }, [businessId]);

  useEffect(() => {
    if (!openId || !experiences.length) return;
    const experience = experiences.find((i) => i.id === openId);
    if (!experience) return;
    void (async () => {
      try {
        const perms = await discoverService.permissions(openId);
        if (perms.connected) {
          const { session: exSession } = await discoverService.session(openId);
          setSession({ experience, session: exSession });
        } else {
          setPending({ experience, requestable: perms.requestable });
        }
      } catch {
        setError("We couldn't open this experience. Try again.");
      }
    })();
  }, [openId, experiences]);

  const filtered = useMemo(() => {
    let list = offerings;
    if (category !== "All") list = list.filter((o) => o.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.businessName.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q) ||
          o.type.toLowerCase().includes(q),
      );
    }
    return list;
  }, [offerings, category, query]);

  const popular = useMemo(
    () => offerings.filter((o) => o.featured).slice(0, 8),
    [offerings],
  );
  const nearYou = useMemo(
    () => offerings.filter((o) => o.distanceKm != null).slice(0, 8),
    [offerings],
  );
  const showFiltered = category !== "All" || query.trim().length > 0;

  function setParam(key: string, value: string | null) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value == null) next.delete(key);
      else next.set(key, value);
      return next;
    });
  }

  function openOffering(id: string) {
    setParam("business", null);
    setParam("offering", id);
  }

  function openBusiness(id: string) {
    setParam("offering", null);
    setParam("business", id);
  }

  function openExperience(id: string) {
    setParam("open", id);
  }

  function clearOpen() {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("open");
      return next;
    });
    setPending(null);
    setSession(null);
    setExtraPerms(null);
  }

  function closeOffering() {
    setParam("offering", null);
    setSelectedOffering(null);
  }

  function closeBusiness() {
    setParam("business", null);
    setSelectedBusiness(null);
  }

  function selectCategory(id: string) {
    setCategory(id);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === "All") next.delete("category");
      else next.set("category", id);
      return next;
    });
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
        if (result.metadata?.recovery === "choose_another_time") {
          const fresh = await discoverService.offeringAvailability(selectedOffering.id, { quantity });
          setSlots(fresh.availability.slots);
          setSelectedSlotId(null);
        }
        return;
      }
      if (result.launchExperienceId) {
        openExperience(result.launchExperienceId);
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

  const INTENT_CARDS = [
    { id: "eat", label: "Eat tonight", detail: "Tables & meals nearby", category: "Eat", query: "restaurants tonight" },
    { id: "reset", label: "Reset", detail: "Spa & wellness", category: "Wellness", query: "massage" },
    { id: "stay", label: "Stay nearby", detail: "Rooms & hotels", category: "Stay", query: "hotel" },
    { id: "fun", label: "Something fun", detail: "Cinema & events", category: "Cinema", query: "cinema tickets" },
  ] as const;

  return (
    <div className="page">
      <SectionHeader title="Discover" subtitle="What can you do today?" />

      {error ? <StatusBanner title={error} /> : null}

      <AskLifeOSTrigger />

      <section className="intent-grid" aria-label="Start with an intent">
        {INTENT_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            className="intent-card"
            onClick={() => {
              selectCategory(card.category);
              setQuery("");
              openCommand(card.query);
            }}
          >
            <strong>{card.label}</strong>
            <span className="muted small">{card.detail}</span>
          </button>
        ))}
      </section>

      <SearchBar
        id="discover-search"
        placeholder="Massage, dinner, room, movie…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        aria-label="Search offerings"
        style={{ marginTop: "0.75rem" }}
      />

      <div className="chip-row" role="group" aria-label="Categories">
        {CATEGORY_CHIPS.map((c) => (
          <Chip
            key={c.id}
            active={category === c.id}
            onClick={() => selectCategory(c.id)}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <>
          <Skeleton height={180} label="Loading offerings" />
          <Skeleton height={180} />
        </>
      ) : showFiltered ? (
        <>
          <SectionHeader
            title={query.trim() ? "Results" : CATEGORY_CHIPS.find((c) => c.id === category)?.label || category}
            subtitle={`${filtered.length} offerings`}
          />
          {filtered.length === 0 ? (
            <EmptyState
              title="No offerings match"
              detail="Try another category, or ask LifeOS."
              action={
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setQuery("");
                    selectCategory("All");
                    openCommand("Find something to do");
                  }}
                >
                  Ask LifeOS
                </button>
              }
            />
          ) : (
            <div className="exp-grid">
              {filtered.map((o) => (
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
                  onClick={() => openOffering(o.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <SectionHeader title="Popular near you" />
          <div className="exp-rail">
            {(popular.length ? popular : offerings.slice(0, 6)).map((o) => (
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
                onClick={() => openOffering(o.id)}
              />
            ))}
          </div>

          <SectionHeader title="Nearby" subtitle="Based on tagged locations" />
          {nearYou.length === 0 ? (
            <EmptyState title="Nothing nearby yet" />
          ) : (
            <div className="exp-rail">
              {nearYou.map((o) => (
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
                  onClick={() => openOffering(o.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedOffering ? (
        <Sheet title={selectedOffering.name} onClose={closeOffering}>
          <div className="offering-detail">
            <p className="muted">{selectedOffering.businessName}</p>
            {selectedOffering.rating != null ? (
              <p className="offering-detail__rating">★ {selectedOffering.rating.toFixed(1)}</p>
            ) : null}
            <p className="offering-detail__price">
              {[selectedOffering.duration, selectedOffering.priceFormatted].filter(Boolean).join(" · ")}
            </p>
            <p>{selectedOffering.description}</p>
            {selectedOffering.location ? (
              <p className="muted small">Location: {selectedOffering.location}</p>
            ) : null}
            {selectedOffering.cancellationPolicy ? (
              <p className="muted small">Policy: {selectedOffering.cancellationPolicy}</p>
            ) : null}

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
                  <Button variant="ghost" onClick={() => openBusiness(selectedOffering.businessId)}>
                    View {selectedOffering.businessName}
                  </Button>
                  <Button variant="soft" onClick={() => openExperience(selectedOffering.experienceId)}>
                    Open experience
                  </Button>
                </div>
              </>
            )}

            {moreFromBusiness.length > 0 ? (
              <>
                <SectionHeader title={`More from ${selectedOffering.businessName}`} />
                <div className="exp-grid">
                  {moreFromBusiness.slice(0, 6).map((o) => (
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
                      onClick={() => openOffering(o.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </Sheet>
      ) : null}

      {selectedBusiness ? (
        <Sheet title={selectedBusiness.business.businessName} onClose={closeBusiness}>
          <div className="offering-detail">
            {selectedBusiness.business.rating != null ? (
              <p className="offering-detail__rating">★ {selectedBusiness.business.rating.toFixed(1)}</p>
            ) : null}
            <p>{selectedBusiness.business.description}</p>
            {selectedBusiness.business.location ? (
              <p className="muted small">Location: {selectedBusiness.business.location}</p>
            ) : null}
            {selectedBusiness.business.hours ? (
              <p className="muted small">Hours: {selectedBusiness.business.hours}</p>
            ) : null}
            {selectedBusiness.business.contact ? (
              <p className="muted small">Contact: {selectedBusiness.business.contact}</p>
            ) : null}
            <div className="row-actions">
              <Button onClick={() => openExperience(selectedBusiness.business.experienceId)}>
                Open experience
              </Button>
            </div>
            <SectionHeader title="Services & offerings" subtitle={`${selectedBusiness.offerings.length} available`} />
            <div className="exp-grid">
              {selectedBusiness.offerings.map((o) => (
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
                  onClick={() => openOffering(o.id)}
                />
              ))}
            </div>
          </div>
        </Sheet>
      ) : null}

      {pending ? (
        <PermissionConsent
          experience={pending.experience}
          requestable={pending.requestable}
          onCancel={clearOpen}
          onConnected={(exSession) => {
            setPending(null);
            setSession({ experience: pending.experience, session: exSession });
          }}
        />
      ) : null}

      {session ? (
        <ExperienceViewer
          experience={session.experience}
          session={session.session}
          onClose={clearOpen}
          onPermissionRequest={(p) => void handlePermissionRequest(p)}
        />
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
