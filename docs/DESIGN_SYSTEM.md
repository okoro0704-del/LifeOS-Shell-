# LifeOS Design System

Visual foundation for LifeOS and future TrustID ecosystem OS shells (Business Portal, HospitalityOS chrome, etc.).

**Brand direction:** Calm teal accent · Fraunces (display) · Manrope (UI) · soft atmospheric backgrounds. Avoid purple gradients, Inter/Roboto defaults, cream+terracotta, or broadsheet layouts.

---

## Tokens

Source of truth: `packages/ui/src/tokens.css`  
Import via `@lifeos/ui/styles.css` or `@lifeos/ui/tokens.css`.

### Color

| Token | Light role |
| --- | --- |
| `--los-accent` | Primary actions, focus, brand |
| `--los-accent-soft` | Soft fills, selected nav |
| `--los-bg` / `--los-bg-elevated` | Page atmosphere |
| `--los-surface` / `--los-surface-2` | Cards, panels |
| `--los-text` / `--los-muted` | Content hierarchy |
| `--los-border` / `--los-border-strong` | Separators |
| `--los-danger` / `--los-success` / `--los-warning` | Feedback |

Themes: set `data-theme="light" | "dark" | "system"` on `<html>`. Profile preferences drive this via `ThemeProvider`.

### Typography

| Token | Size |
| --- | --- |
| `--los-text-xs` … `--los-text-3xl` | 12px → 36px scale |
| `--los-font` | Manrope |
| `--los-display` | Fraunces |
| `--los-mono` | System mono |

Use Fraunces for page titles and brand; Manrope for body, nav, and controls.

### Spacing (8px grid)

`--los-space-1` (4) → `--los-space-8` (64). Prefer multiples of 8 for section gaps.

### Radius & elevation

- `--los-radius-sm` 10 · `--los-radius` 16 · `--los-radius-lg` 22 · `--los-radius-full`
- `--los-shadow-sm` / `--los-shadow` / `--los-shadow-lg`

### Motion

- `--los-duration-fast` 120ms · `--los-duration` 220ms · `--los-duration-slow` 420ms
- `--los-ease` — standard exit/enter curve  
Respect `prefers-reduced-motion`.

### Icons & layout

- Icon sizes: `--los-icon-sm|md|lg`
- Content max: `--content-max` (720px), sidebar `--sidebar-w`
- Safe areas: `--safe-top` / `--safe-bottom`
- Breakpoints (reference): 480 / 720 / **900** (desktop shell) / 1200

---

## Components (`@lifeos/ui`)

| Component | Use |
| --- | --- |
| `Button` | `primary` · `soft` · `ghost` · `danger` · `sm`/`md` |
| `SectionHeader` | Title + optional subtitle + action |
| `EmptyState` | Empty lists with optional `action` |
| `Skeleton` | Loading placeholders (`aria-label`) |
| `Card` | Interactive or static surface |
| `ListRow` | Keyboard-accessible row |
| `Avatar` | `sm` / `md` / `lg` |
| `StatusDot` / `StatusBadge` | Live / connected / warning status |
| `Badge` | Compact labels (`accent` / `success` / `warning`) |
| `Chip` | Filters (`aria-pressed`) |
| `ProgressBar` | Determinate progress |
| `SearchBar` | Rounded search field |
| `QuickAction` | Icon + label action |
| `WalletCard` | Premium balance surface |
| `ExperienceCard` | Ecosystem experience tile |
| `ActivityRow` | Compact timeline row |
| `ProfileRow` | Settings / control-centre row |
| `SecurityCard` | Identity / TrustID CTA surface |
| `Sheet` | Mobile-first modal panel |

Prefer these over one-off CSS for buttons, chips, empty states, and skeletons.

---

## Layout principles

1. **One calm shell** — sticky top bar (mobile), bottom nav (5 primary tabs), sidebar from 900px.
2. **Clarity over density** — section spacing ≥ 24px; avoid packing stats into the first viewport.
3. **Mobile-first** — touch targets ≥ 44px; safe-area padding on chrome.
4. **Page enter** — light `page-enter` fade/slide; never long decorative motion.
5. **Surfaces** — use token surfaces, not hard-coded white, so dark mode works.

---

## Accessibility

- Visible `:focus-visible` rings using `--los-accent`
- Skip link to `#main-content`
- Labels on icon-only controls (`aria-label`)
- Skeletons and banners use `role="status"` where appropriate
- Contrast: teal on light/dark tokens tuned for readable body text
- Forms: associate labels; search fields have `sr-only` or visible labels

---

## Theming API

```tsx
import { ThemeProvider, useTheme } from "./hooks/useTheme";

<ThemeProvider initial={user?.preferences.theme}>
  …
</ThemeProvider>

const { theme, setTheme } = useTheme();
setTheme("dark"); // also persist via profile prefs when signed in
```

---

## Reuse in other OS products

1. Depend on `@lifeos/ui` (or copy `tokens.css` + `styles.css`).
2. Keep teal + Fraunces + Manrope unless the product brand explicitly differs.
3. Extend tokens with product-specific prefixes; do not fork LifeOS accent without design review.
4. Document any new components in this file.

See also: [SPRINT3.5.md](./SPRINT3.5.md)
