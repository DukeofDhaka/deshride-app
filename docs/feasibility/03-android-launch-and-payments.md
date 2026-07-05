# DeshRide — Android Launch Stack & Payment Acceptance

**Iteration 3: Google Play requirements, OTP/SMS rules, NID verification, and how to
accept bKash/Nagad payments**
*Research date: July 2026.*

---

## 1. Google Play requirements for a ride app

- **Developer account:** one-time US$25; an *organization* account (recommended — tied
  to the BD company, not a personal Gmail) requires business verification (incl.
  D-U-N-S number) — start this early, it can take weeks.
- **Location permissions are the big policy surface.** Google's 2026 policy updates
  tighten location scope: request the *minimum* scope, never use location for
  ads/analytics, and background location triggers a special review with a declaration
  video. **Design v1 to avoid background location entirely** — trip tracking can run as
  a foreground service with a visible notification, which is both compliant and what
  riders want to see anyway.
  ([Play policy — background location](https://support.google.com/googleplay/android-developer/answer/9799150?hl=en),
  [April 2026 policy updates](https://support.google.com/googleplay/android-developer/answer/16926792?hl=en),
  [minimum-scope location guidance](https://support.google.com/googleplay/android-developer/answer/17033915?hl=en))
- **Data safety form** must exactly match actual collection behavior — mismatches are a
  top cause of delisting. Keep it in sync with the PDPO 2025 consent design (doc 01).
- **Payments: ride fares are physical services**, so Google Play Billing is NOT
  required — bKash/Nagad/gateway checkout is allowed in-app with no Google commission.
  This is the same exemption Uber/Pathao rely on.
- **OTP auto-read:** use the SMS Retriever API, not READ_SMS permission (restricted).
- Target API level must track recent Android versions (rolling requirement).

## 2. SMS / OTP (BTRC rules)

- Application-to-person SMS must flow through **BTRC-enlisted A2P SMS aggregators**
  ([BTRC list](https://btrc.gov.bd/site/page/e37f77e0-d142-47d9-a590-b0a0414044b8/SMS-Service-providers)).
- **Masked sender ID** ("DeshRide" as sender name): registration takes ~3 working days
  via the aggregator.
- **Bangla-language mandate:** SMS templates must be in Bangla; OTP codes, numbers and
  URLs may be English, and full-English templates need prior BTRC permission
  ([MiMSMS on the Bangla rule](https://www.mimsms.com/all-types-of-bulk-sms-have-to-be-sent-in-bengali/)).
- Retail OTP SMS pricing is commonly quoted around **Tk 0.60–0.70 per SMS** with volume
  discounts ([example provider](https://zaman-it.com/otp-verification/)). Budget SMS as
  a real cost line; consider WhatsApp OTP as a cheaper secondary channel later.

## 3. Identity verification (the trust layer)

**[Porichoy](https://porichoy.gov.bd/)** is the government's official identity
verification API (ICT Division + Election Commission): NID verification, birth
registration, address verification, and **face matching**, available to private
companies (fintechs, digital platforms) via REST API
([products](https://porichoy.gov.bd/products.html)).

Recommended KYC ladder:

| Who | Verification |
|---|---|
| Rider | Phone OTP at signup; NID number verification before first booking |
| Driver | NID + Porichoy face match + driving licence + vehicle docs (feeds the BRTA enlistment pipeline from doc 01) |

This is precisely what the informal khep market can't offer — verified identity on both
sides — and it doubles as PDPO-compliant KYC recordkeeping.

## 4. Accepting payments from bKash / Nagad (the core question)

### Recommended architecture, phased

**Phase 1 — one aggregator integration (launch this way):**
Integrate a licensed payment gateway aggregator — **SSLCommerz, aamarPay, or
shurjoPay** — which gives bKash + Nagad + Rocket + Upay + cards through a single API
and a hosted checkout the rider already recognizes.

- Fees: ~1.5–3% per transaction depending on method and volume; setup fees roughly
  BDT 5,000–20,000; settlement to bank in ~2–5 business days.
- Why first: one integration, one settlement report, no separate merchant negotiation
  with each MFS, and it keeps DeshRide clearly outside Bangladesh Bank PSP/PSO
  licensing (doc 01 §5) because the licensed gateway handles the money movement.

**Phase 2 — direct MFS merchant integrations (as volume grows):**

- **bKash Payment Gateway (tokenized checkout):** app-to-app deep link ("Pay with
  bKash"), instant settlement to merchant wallet, better rates at volume. bKash is
  ~68M wallets — it will dominate your payment mix, so a direct deal eventually pays
  for itself. ([bKash business](https://www.bkash.com/en/business))
- **Nagad merchant API:** lowest published MFS fees (~1.65% + Tk 1.50 noted in gateway
  comparisons).

**Phase 3 — driver payouts:** disburse post-trip earnings via **bKash B2C
disbursement** (their payroll/disbursement product) or Nagad equivalent, batched daily.
Drivers already run their lives on these wallets; bank-transfer payouts would be a
friction mistake.

### The cash reality (don't fight it, meter it)

Intercity BD is cash-heavy (even Uber Intercity collects fares/tolls in cash). Support
**cash-to-driver** as a first-class option with a commission ledger:

- Rider selects cash → pays driver at pickup → driver's DeshRide balance is debited
  the commission.
- Drivers top up their commission balance via bKash/Nagad.
- This is Uber/Pathao's proven BD mechanic and it keeps DeshRide from ever holding
  rider money.

### What NOT to do

- ❌ **Personal bKash "send money" to a personal number** (the khep-market workaround):
  violates MFS terms for business use, un-reconcilable, creates VAT/tax exposure.
- ❌ **Holding rider balances / an in-app wallet:** that's PSP-licence territory with
  Bangladesh Bank (doc 01 §5). Collect per-booking via licensed rails only.
- ❌ **Routing ride payments through Google Play Billing:** unnecessary (physical
  services exemption) and would donate up to 15–30% of revenue to Google.

Sources: [Moneybag gateway comparison](https://moneybag.com.bd/10-best-payment-gateways-in-bangladesh/),
[RafirIT 2026 gateway comparison](https://rafirit.com/best-payment-gateways-for-bangladesh-ecommerce-2026-top-5-compared/),
[Geekssort integration guide](https://geekssort.com/payment-gateway-integration-bangladesh-2026/),
[aamarPay](https://www.aamarpay.com/), [bKash business](https://www.bkash.com/en/business).

## 5. The Android app itself — what exists now

The repo now contains a **Capacitor-wrapped Android project** (`android/`) around the
existing React rider app:

- `capacitor.config.ts` — app id `com.deshride.app`, name **DeshRide**, serving the
  Vite `dist/` build.
- The booking flow now includes a **payment-method step** (bKash / Nagad / Cash) on the
  ride page, carried through to the confirmation screen — simulated today, mapping 1:1
  to the Phase 1 gateway architecture above.

**To build the APK locally (Android Studio on your machine):**

```bash
npm install
npm run build          # builds web assets into dist/
npx cap sync android   # copies dist/ + plugins into the Android project
npx cap open android   # opens Android Studio → Run ▶ or Build > APK
```

Release checklist when you're ready for Play: generate a signing key, switch to
`bundleRelease` (AAB), fill the Data safety form, add the privacy policy URL (PDPO
notice), and complete org account verification.

## 6. Open items

- [ ] Passenger insurance product survey (group travel insurance partners; RTA 2018
      mandatory passenger insurance direction) — next iteration.
- [ ] Pick aggregator: get live fee quotes from SSLCommerz vs aamarPay vs shurjoPay
      (fees are negotiable with projected volume).
- [ ] bKash merchant account application timeline (needs trade licence + BIN — doc 01
      checklist items).
- [ ] Sandbox test: aggregator checkout inside the Capacitor webview (redirect flows
      need `@capacitor/browser` or intent handling for the bKash/Nagad app deep links).
