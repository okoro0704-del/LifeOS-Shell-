# LifeOS Desktop (Tauri v2)

Native shell for `lifeos-web` — macOS / Windows / Linux.

## Prerequisites

1. [Rust toolchain](https://rustup.rs/) (`rustc`, `cargo`)
2. Platform deps: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
3. Node 20+ and workspace `npm install` from the LifeOS monorepo root

## Develop

```bash
# from apps/lifeos-web
npm run desktop:dev
```

Starts Vite on `http://localhost:5174` and opens the LifeOS Tauri window.
System tray menu:

- Switch to Personal Space
- Switch to Business Space
- Quit LifeOS

Tray actions set `lifeos_active_workspace` and reload the webview (TrustID session cookies/localStorage remain).

## Release bundles

```bash
npm run desktop:build
```

Artifacts land under `src-tauri/target/release/bundle/` (`.msi` / `.exe`, `.dmg`, `.AppImage`, etc.).

## Notifications

Use `src/lib/tauriBridge.ts`:

```ts
import { isDesktopApp, sendDesktopNotification } from "./lib/tauriBridge";

await sendDesktopNotification("LifeOS", "Workspace ready");
```
