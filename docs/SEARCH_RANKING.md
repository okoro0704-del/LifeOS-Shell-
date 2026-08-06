# Search Ranking

Deterministic scoring (no ML):

| Signal | Effect |
|--------|--------|
| Personal query + PERSONAL/BOOKING/TICKET | Strong boost |
| Offering + availability text | Boost |
| Saved offering | Boost |
| Category / price filter match | Boost / hard filter |
| Exact title match | Boost |
| `sortBy: price_asc` | Stable price order when prices exist |

Filters from `CommandIntent` (`maxPrice`, `minPrice`, category) apply before sort.

Compare helpers only use fields present on results — they never hallucinate distance or policy.
