# Sprint 3.5 — Product Polish & Design System

**Status:** Complete (frontend polish only)  
**Version:** LifeOS 1.3.5

## Scope

- Design tokens (light / dark / system)
- Shared UI kit expansion
- App shell, Home, Discover, Profile, Connections, Wallet polish
- Loading / empty / error states, micro-interactions, a11y, PWA, lazy routes
- Documentation: `docs/DESIGN_SYSTEM.md`

**Out of scope:** TrustID changes, Business Portal, HospitalityOS features, Token Network integration, major backend work.

## Deliverables

| Area | Location |
| --- | --- |
| Tokens | `packages/ui/src/tokens.css` |
| UI styles | `packages/ui/src/styles.css` |
| Components | `packages/ui/src/index.tsx` |
| Theme | `apps/lifeos-web/src/hooks/useTheme.tsx` |
| Shell | `apps/lifeos-web/src/components/AppShell.tsx` |
| Screens | `apps/lifeos-web/src/pages/{Home,Discover,Profile,Connections,Wallet}.tsx` |
| App styles | `apps/lifeos-web/src/styles.css` |
| Docs | `docs/DESIGN_SYSTEM.md` |

## Verification checklist

- [ ] Sign in with TrustID still reaches `/app`
- [ ] Discover → permission consent → experience launch still works
- [ ] Theme preference updates `data-theme` and persists
- [ ] Offline banner appears when network is offline
- [ ] Mobile bottom nav + desktop sidebar at ≥900px
- [ ] Keyboard focus rings visible on nav and buttons

## Recommendations before Business Portal

1. Adopt `@lifeos/ui` tokens as the shared package for portal chrome.
2. Keep experience session protocol unchanged; portal should mint/consume the same JWT model.
3. Add real business logos (`ExperienceRecord.icon` URLs) before portal launch.
4. Wire install prompt analytics only after portal auth exists.
5. Do not couple portal UI to LifeOS shell routes — share tokens/components only.
