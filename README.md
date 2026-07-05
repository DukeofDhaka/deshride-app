# DeshRide

**Intercity carpooling for Bangladesh, inspired by Poparide.** One app, both roles:
drivers post the trip they're already making (any pickup and drop-off in the country —
all 64 districts, or a pin dropped straight on the map), travellers request the empty
seats, the driver approves who rides.

**Payments are escrow-shaped:** the fare is collected via bKash, Nagad or card when
the driver accepts, held, and released to the driver only after the trip completes —
the pattern Bangladesh Bank's Digital Commerce rules already mandate (see
`docs/feasibility/05-escrow-payments-architecture.md`).

## Current state

This is a **local-first prototype**: the full product loop (post → search → request →
accept-into-escrow → complete → release payment) works end to end, with data stored on
the device via `src/lib/store.ts`. That module is the single seam for the future
backend — reimplement its functions against an API and nothing else changes.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Android app (Capacitor)

The same codebase ships as an Android app (`android/` project, app id
`com.deshride.app`). CI builds a debug APK on every push — grab it from the
repository's Actions tab ("Build Android APK" → `deshride-debug-apk` artifact).
To build locally with Android Studio:

```bash
npm run build
npx cap sync android
npx cap open android   # then Run ▶ or Build > Build APK
```

## Feasibility research

Bangladesh launch research lives in `docs/feasibility/`:

1. `01-regulatory-landscape.md` — BRTA, company setup, VAT, PDPO 2025
2. `02-market-competition-unit-economics.md` — pricing, driver math, competitors
3. `03-android-launch-and-payments.md` — Play Store, SMS/NID, payment rails
4. `04-verdict-and-roadmap.md` — go/no-go verdict and phased launch plan
5. `05-escrow-payments-architecture.md` — hold-and-release payments design

## Deployment

- GitHub Pages workflow in `.github/workflows/deploy-pages.yml` (runs on `main`).
- Android APK workflow in `.github/workflows/android-apk.yml`.
- Standard Vite SPA — also deployable to Vercel as-is.
