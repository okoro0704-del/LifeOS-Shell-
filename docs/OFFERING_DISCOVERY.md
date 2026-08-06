# Offering-first discovery

LifeOS Discover is a marketplace of **things you can do**, not a business directory.

```
Offering → Business (provider) → Other offerings
```

## Principle

Primary object: **OFFERING / EXPERIENCE**  
Business: provider context behind the offering.

## APIs

| Method | Path |
|--------|------|
| GET | `/discover` (includes `offerings`, `featuredOfferings`) |
| GET | `/discover/offerings` |
| GET | `/discover/offerings/:id` |
| GET | `/discover/offerings/:id/business` |
| GET | `/discover/businesses` |
| GET | `/discover/businesses/:id` |

## Boundaries

- HospitalityOS (and peers) remain catalog / pricing / booking source of truth.
- LifeOS uses `OfferingProvider` — currently `MockOfferingProvider` as a **discovery projection** (`source: hospitalityos-catalog-projection`).
- No second commerce/catalog database in LifeOS.
- Booking confirmation records LifeOS activity intent, then launches the owning experience session to complete commerce.

## Ranking

`OfferingRankingService` scores relevance, featured, rating, availability, distance, and soft preferences — not hard-coded in UI cards.

## Search

Action-oriented queries (`massage`, `pizza`, `gym`, `movie`) boost `OFFERING` results above businesses.
