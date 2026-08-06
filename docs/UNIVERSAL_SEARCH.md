# Universal Search

Providers run **in parallel** with timeouts. Partial failure returns available results.

## Providers

1. PersonalContextSearchProvider  
2. PlanSearchProvider  
3. SavedOfferingSearchProvider  
4. OfferingSearchProvider (**offering-first**)  
5. BusinessSearchProvider  
6. LifeOSSearchProvider  
7. ExperienceSearchProvider  
8. BookingSearchProvider  
9. WalletSearchProvider  
10. ActivitySearchProvider  
11. NotificationSearchProvider  

## Priority

1. Exact personal context (`my hotel`, tickets, today)  
2. Exact / relevant offerings  
3. Available offerings  
4. Saved items  
5. Businesses  
6. Experiences  
7. General  

## Result shape

Normalized `SearchResult` with `type`, `title`, `subtitle`, `source`, `metadata` (incl. `availableActions`, `price`, `availability`), and action buttons wired to the Action Registry / Orchestrator.
