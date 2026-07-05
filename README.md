# DeshRide Rider App

This repo now contains a **phone-first React + Vite web app** for the DeshRide concept. It is designed to feel like a real rider booking product, not a presentation deck.

## Run locally

You do **not** need Streamlit.

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Build for production

```bash
npm run build
npm run preview
```

## Android app (Capacitor)

The same codebase ships as an Android app via Capacitor (`android/` project,
app id `com.deshride.app`). To build the APK on a machine with Android Studio:

```bash
npm install
npm run build
npx cap sync android
npx cap open android   # then Run ▶ or Build > Build APK
```

## Feasibility research

Bangladesh launch research lives in `docs/feasibility/`:

1. `01-regulatory-landscape.md` — BRTA, company setup, VAT, PDPO 2025
2. `02-market-competition-unit-economics.md` — pricing, driver math, competitors
3. `03-android-launch-and-payments.md` — Play Store, SMS/NID, bKash & Nagad payments

## Deployment

- The repo includes a GitHub Pages workflow in `.github/workflows/deploy-pages.yml`.
- It also includes SPA-friendly routing for static hosts.
- The same app can also be deployed to Vercel because it is a standard Vite SPA with no backend requirements.

## Product notes

- Search-first rider flow
- Static stylized Bangladesh route map
- Simulated booking only
- No authentication, no real payments, no user data storage
