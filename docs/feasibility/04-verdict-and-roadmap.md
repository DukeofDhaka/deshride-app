# DeshRide — Consolidated Feasibility Verdict & Launch Roadmap

**Iteration 4: Synthesis of docs 01–03**
*July 2026*

---

## 1. The verdict

**GO — with a model adaptation.** Intercity per-seat ridesharing in Bangladesh is
commercially attractive and legally achievable, but *not* in the pure
Poparide/BlaBlaCar "any driver, any car" form. The winning shape is:

> **A BRTA-enlisted ridesharing company selling per-seat intercity trips on
> cars/microbuses, recruiting the existing informal "khep" driver market as seed
> supply, priced at AC-bus money for door-to-door travel.**

Why go:

1. **A real pricing hole:** Tk 2,500 (best bus) → Tk 10,000+ (full-car hire) with no
   app-based per-seat option in between (doc 02 §1).
2. **Unit economics clear easily:** 3 seats × Tk 1,500 covers a full octane fuel bill
   with surplus; CNG cars triple the driver's margin (doc 02 §2).
3. **Legal path exists and is proven** — Uber Intercity already operates app-based
   intercity car trips under BRTA's regime (doc 01 §2.3).
4. **Infrastructure is finally ready:** Padma Bridge corridors, 72.8% smartphone
   households, bKash/Nagad rails, Porichoy identity APIs (docs 01–03).
5. **Twice-yearly demand spikes (Eid)** where all formal transport sells out.

Why "with adaptation" (the three hard constraints):

1. Every driver's car needs **BRTA vehicle enlistment** — onboarding is a funnel, not
   a signup (doc 01 §2.2).
2. **Minimum fleet requirements** (100 vehicles as written) mean BRTA engagement
   before launch, not after (doc 01 §2.1).
3. **PDPO 2025** applies from day one — consent flows and data handling are launch
   requirements, not later polish (doc 01 §6).

## 2. Phased roadmap

### Phase 0 — Legal & corporate foundation (est. 2–4 months)

| # | Action | Cost (approx.) |
|---|---|---|
| 1 | Incorporate BD private limited co. (RJSC) + trade licence + TIN + BIN | BDT ~25–75k incl. professional fees |
| 2 | Decide founder investment route (local citizen vs BIDA foreign; USD 50k rule) | — |
| 3 | Legal opinion: cost-sharing carpooling vs commercial classification | BDT ~50–150k |
| 4 | BRTA pre-consultation: intercity scope + fleet-minimum accommodation | — |
| 5 | BRTA company enlistment | BDT 100k + renewal 10k/yr |
| 6 | PDPO 2025 compliance memo + privacy policy | BDT ~50–100k |
| 7 | Google Play org account + D-U-N-S | US$25 + time |

### Phase 1 — Supply-first MVP (one corridor)

- Pick **one corridor**: Padma corridor (Dhaka–Khulna/Barishal/Jashore) is most
  underserved by rail and most transformed by the bridge; Dhaka–Chattogram has the
  deepest demand but the strongest bus competition.
- Recruit 100–150 khep/rent-a-car drivers; run their BRTA vehicle enlistment as a
  white-glove service (this *is* the moat — nobody enjoys BRTA paperwork).
- Driver KYC: Porichoy NID + face match + licence check.
- Payments: one aggregator (SSLCommerz/aamarPay/shurjoPay) + cash-with-commission-ledger.
- App: the Capacitor Android app in this repo, hardened (real backend, OTP via
  BTRC-enlisted SMS aggregator, SOS button per BRTA mandate).
- Safety at launch, not later: women-only ride toggle, live trip share, NID-verified
  badges.

### Phase 2 — Prove the surge, then scale

- Target the **next Eid window** as the demand event; pre-register riders with a
  waitlist; surge supply drives from the return-trip (deadhead) direction.
- Add second corridor only after >60% seat-fill on corridor one.
- Direct bKash tokenized checkout + Nagad merchant API once volume justifies.
- Group passenger insurance partnership (also an RTA 2018 compliance direction —
  confirm current mandate status with counsel).

### Phase 3 — Deepen the moat

- Driver subscription pricing experiments (vs % commission — learn from the
  Uber/Pathao commission revolt).
- Microbus/HiAce inventory for group and event travel.
- Bangla-first everything; rural pickup points along corridors.

## 3. Top risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| BRTA blocks per-seat pricing interpretation | High | Pre-consultation (Phase 0 #4); Uber Intercity precedent; fall back to full-car splitting UX |
| Fleet minimum enforced rigidly against a new entrant | High | Engage before launch; partner with an already-enlisted fleet operator as plan B |
| Pathao copies the per-seat model | Medium | Corridor depth, driver-friendly take rate, safety brand, Eid land-grab speed |
| Informal khep market undercuts (no commission) | Medium | Keep take rate ≤15%; sell trust (verification, insurance, SOS, fixed pricing) |
| PDPO enforcement surprises | Medium | Data minimization by design; no background location; in-country data copy option |
| Highway safety incident early in brand life | High | Insurance, SOS, verified-only supply, incident response runbook from day one |

## 4. What exists in this repo today

- **Rider-facing app** (React/Vite) with search → ride → booking flow, payment-method
  step (bKash/Nagad/cash), simulated data.
- **Android build**: Capacitor project (`android/`, `com.deshride.app`) + GitHub
  Actions workflow producing a debug APK artifact on every push.
- **Research**: docs 01–03 (regulatory, market/economics, launch stack) + this verdict.

## 5. What does NOT exist yet (the honest gap list)

- No backend: rides/bookings are static demo data; no auth, no real OTP, no driver app.
- No real payment integration (the UI step maps to the doc 03 architecture but calls
  nothing).
- No BRTA enlistment, company, or legal opinions — Phase 0 is entirely ahead.
- No release signing / Play listing; current APK is a debug build for sideloading.

**Recommended next build milestone:** a thin backend (rides, bookings, OTP auth,
driver onboarding queue) + aggregator sandbox checkout, so the Eid waitlist test can
run with 20 real drivers on one corridor.
