# Recommendations

Deterministic `RecommendationProvider` — **not** machine learning.

## Signals (allowed)

- Recent searches
- Saved offerings
- Past actions / preferred categories & businesses
- Upcoming schedule (exclude already booked offerings)
- Frequently used experiences
- Time of day
- Availability / featured flags on catalog projections

## Signals (forbidden)

- Sensitive attributes or inferences (health, finance hardship, biometrics, etc.)
- TrustID security data
- Payment credentials

## Behavior

- Soft ranking boosts on Discover (`preferredCategories`, `preferredBusinessIds`)
- Discover remains **offering-first** and fully explorable without personalization
- Home “For you” explains reason text (“Based on your activity”, “Good for evening”, …)

## Location

`apps/lifeos-api/src/services/recommendations.ts`
