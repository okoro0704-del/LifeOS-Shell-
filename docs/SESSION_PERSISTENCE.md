# Session persistence

LifeOS keeps you signed in across refreshes until you **Sign out**, or until **24 hours of inactivity**.

## How it works

1. **HttpOnly cookie** `lifeos_session` (preferred when same-site via Netlify `/api` proxy)
2. **Client session token** in `localStorage` (`lifeos.session.token`), sent as `X-LifeOS-Session` — survives when third-party cookies are blocked (cross-origin Netlify ↔ Railway)
3. **Sliding expiry** — each authenticated API call can extend `expiresAt` by `SESSION_TTL_HOURS` (default **24**) when less than half the window remains

## Env (API / Railway)

| Variable | Default | Meaning |
| --- | --- | --- |
| `SESSION_TTL_HOURS` | `24` | Inactivity window |
| `COOKIE_SAMESITE` | `none` in production, `lax` in dev | Use `lax` when web hits API via same-origin `/api` proxy |
| `COOKIE_SECURE` | auto | Force `true`/`false` if needed |

## Netlify

- `VITE_LIFEOS_API=/api` (set in `netlify.toml`)
- `/api/*` proxies to Railway so cookies can be first-party

If the Netlify UI still has `VITE_LIFEOS_API` pointing at Railway directly, either change it to `/api` or rely on the `X-LifeOS-Session` header (works either way after a fresh login).
