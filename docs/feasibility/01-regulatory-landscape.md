# DeshRide — Bangladesh Regulatory & Launch Feasibility Study

**Iteration 1: Regulatory landscape, launch requirements, headwinds & tailwinds**
*Research date: July 2026. This is desk research from public sources — validate with a Bangladeshi transport/corporate lawyer before spending money.*

---

## 1. Executive summary

**Verdict: feasible, but not as a pure "casual driver" carpool platform.** Bangladesh has a
functioning legal regime for app-based ride services (the BRTA Ride-Sharing Service
Guideline, in force since March 2018), and there is direct precedent for app-based
intercity car trips — Uber runs an "Intercity" product out of Dhaka and Chattogram today.
But the regime is built around *enlisted* companies and *enlisted* vehicles, not around
private individuals casually selling spare seats. The Poparide/BlaBlaCar model, where any
private car owner posts a seat, collides with the Road Transport Act 2018's penalties for
commercial use of private vehicles unless each vehicle is enlisted with BRTA under a
licensed ridesharing company.

**The realistic path:** incorporate a private limited company, obtain a BRTA ridesharing
enlistment certificate, onboard drivers *with* per-vehicle BRTA enlistment as part of
signup (the way Uber/Pathao do), restrict the product to cars (motorcycles are banned from
intercity ridesharing routes), and position it as "intercity ridesharing" rather than
"informal carpooling."

---

## 2. The core legal question: is the DeshRide model legal?

### 2.1 The Ride-Sharing Service Guideline 2017 (in force 8 March 2018)

This is the controlling regulation, administered by the Bangladesh Road Transport
Authority (BRTA). Key obligations for a platform operator:

| Requirement | Detail |
|---|---|
| Corporate form | Must be a public or private limited company |
| Company enlistment certificate | BDT 100,000 initial fee, valid 1 year; ~BDT 10,000 annual renewal |
| Minimum fleet | 100 vehicles for the DTCA (greater Dhaka) area; 50 for Chattogram, per the guideline as adopted (BRTA has since floated relaxations) |
| Vehicle-level enlistment | Every participating vehicle needs its own BRTA ridesharing enlistment certificate, plus valid registration, fitness certificate, tax token |
| Driver/owner documents | Owner TIN certificate, NID for owner and driver, valid driving licence |
| Safety | Mandatory in-app SOS button feeding rider/driver GPS to the national emergency helpline (999) |
| Supporting documents | Trade licence and other corporate documents filed with BRTA |

Company enlistment is now handled through BRTA's online service portal
([bsp.brta.gov.bd — Company Enlistment](https://bsp.brta.gov.bd/companyEnlistment?lan=en)).
As of the early rollout BRTA had approved roughly a dozen platforms (Uber, Pathao, Shohoz,
Obhai, etc.), so the process is well-trodden.

Sources: [BRTA Ride-Sharing Service Guideline 2017 page](https://brta.gov.bd/site/page/a7c23d2f-3971-4e84-923a-94e36d75ddff/Ride-Sharing-Service-Guideline-2017),
[Daily Star — cabinet approval](https://www.thedailystar.net/frontpage/ride-sharing-services-get-cabinet-nod-1520506),
[Dhaka Tribune — 12 companies approved](https://www.dhakatribune.com/business/195231/brta-approves-12-ride-sharing-companies),
[TBS — enlisted vehicles begin service](https://www.tbsnews.net/bangladesh/road-transport/vehicles-ride-sharing-enlistment-certificates-start-providing-services),
[Dhaka Tribune — effective 8 March 2018](https://www.dhakatribune.com/bangladesh/2018/03/06/ride-sharing-service-policy-effective-mar-8).

### 2.2 The private-car problem (this is the big one)

Under the **Road Transport Act 2018**, using a motor vehicle commercially in violation of
its registration class / without the right permit is punishable by **up to 3 months'
imprisonment or a BDT 25,000 fine, or both**, plus licence demerit points for the driver.
The ridesharing guideline is precisely the carve-out that lets a *private* car carry
paying passengers through an app — but only once the vehicle holds a ridesharing
enlistment certificate under an enlisted company.

Implication for DeshRide: **you cannot lawfully let an unenlisted private car owner sell
seats for profit.** Two design consequences:

1. **Driver onboarding must include BRTA vehicle enlistment** (Uber and Pathao already
   funnel drivers through this — in 2020–21 BRTA at one point restricted operations to
   only the ~255 vehicles that had completed enlistment, showing they do enforce it).
2. **True cost-sharing carpooling** (driver takes no profit, passengers only split fuel)
   is a legal gray zone the guideline does not explicitly address. A legal opinion on
   whether pure cost-sharing escapes "commercial use" is a high-value early spend — it
   could be the difference between the BlaBlaCar model and the Uber model. Do not build
   the business plan on the optimistic answer.

Sources: [Road Transport Act 2018 (official PDF)](https://legislativediv.portal.gov.bd/sites/default/files/files/legislativediv.portal.gov.bd/page/c0e8021e_5e8f_4ede_9050_f2faf351c2ad/24.%20Road%20Transport%20Act,%202018.pdf),
[Pathway — RTA 2018 penalty schedule](https://www.pathwaybd.org/blog/provisions-of-fines-and-penalties-for-violators-of-road-use-policies-and-laws-according-to-road-transport-act-2018),
[Daily Star — BRTA allows only enlisted cars](https://www.thedailystar.net/backpage/news/ride-hailing-services-brta-allows-only-the-ones-registered-run-1917841),
[Daily Star — 255 enlisted vehicles permitted](https://www.thedailystar.net/ride-sharing-services-brta-permits-only-255-enlisted-vehicles-1918061).

### 2.3 Intercity specifics

- **Cars: allowed, with precedent.** [Uber Intercity operates today from Dhaka and
  Chattogram](https://www.uber.com/bd/en/blog/bangladesh-intercity/) — app-booked,
  point-to-point trips to other districts, with tolls/parking paid in cash. This is the
  single best proof that BRTA tolerates app-based intercity car trips under the existing
  enlistment regime.
- **Motorcycles: banned intercity.** BRTA has [directed ridesharing apps to block bikes
  from long/intercity routes](https://www.thedailystar.net/news/bangladesh/transport/news/brta-directs-ride-sharing-apps-not-allow-bikes-long-routes-eid-3060631)
  (enforced hard around Eid), and bikes are barred from Padma Bridge. DeshRide should be
  **car/microbus-only** — which matches the seat-selling model anyway.
- **Territorial enlistment.** Enlistment areas are defined around metro jurisdictions
  (DTCA for greater Dhaka, Chattogram, etc.). Whether one enlistment cleanly covers
  origin-to-destination trips across districts is a question to put to BRTA/legal counsel
  early; Uber Intercity's existence suggests a workable interpretation exists.
- **Insurance.** The RTA 2018 regime has been moving toward mandatory passenger insurance
  for transport operators (fine of BDT 3,000 for non-compliance in the proposed
  amendments). Budget for a group passenger insurance product; it is also a trust
  differentiator.

---

## 3. Company setup checklist (in order)

1. **Name clearance + incorporation** as a private limited company with RJSC (Registrar
   of Joint Stock Companies and Firms). Fees scale with authorised capital.
   [Process guide](https://tahmidurrahman.com/rjsc-company-registration-bangladesh-eng/).
2. **Trade licence** from the local City Corporation.
3. **e-TIN** (company tax ID) from NBR.
4. **VAT registration / BIN** from NBR (~5–7 working days).
   [Guide](https://legalseba.com/bd-services/obtaining-vat-registration-certificate-in-bangladesh/).
5. **BRTA company enlistment certificate** (BDT 100k, annual renewal) via
   [BRTA service portal](https://bsp.brta.gov.bd/companyEnlistment?lan=en).
6. **If foreign capital is involved** (relevant if you invest from Canada as a
   non-resident or via a foreign entity): route through **BIDA** — one-stop service,
   work permits, and note the **minimum USD 50,000 remittance within 2 months of BIDA
   approval** rule for foreign investors. 100% foreign ownership is permitted.
   [BIDA FAQ](https://bida.gov.bd/faq),
   [Foreign company registration guide](https://khanakber.com/foreign-company-registration-in-bangladesh-step-by-step-guide/).
   ⚠️ As a Bangladeshi-origin founder, investing as an individual Bangladeshi citizen vs.
   through a Canadian entity has very different paperwork — decide this early.
7. **Per-vehicle enlistment pipeline** for drivers (built into onboarding UX).

## 4. Tax treatment

- **VAT: 5% on the platform's commission only.** NBR levies VAT on the app company's cut,
  not on the driver's earnings (classed as exempt personal services) and not on
  passengers. [Prothom Alo](https://en.prothomalo.com/bangladesh/5pc-VAT-only-on-owners-of-ride-sharing-apps-not),
  [Daily Star](https://www.thedailystar.net/business/news/ridesharing-vat-5pc-companys-cut-fare-1787710),
  [TBS — passengers exempt](https://www.tbsnews.net/economy/nbr-exempts-ridesharing-passengers-vat).
- **Corporate income tax** applies normally; rideshare platforms were explicitly brought
  into the tax net from FY2018-19. [New Age](https://www.newagebd.net/article/38316/uber-pathao-others-to-come-under-tax-net-nbr).
- Note the commission-rate backdrop: Uber/Pathao's 25–30% commissions caused sustained
  driver discontent, and platforms have been piloting subscription models instead.
  A lower take rate is both a driver-acquisition weapon and less VAT exposure.
  [Rest of World — Uber slashes commissions in Bangladesh](https://restofworld.org/2023/uber-commission-fees-bangladesh/).

## 5. Payments

- **You do NOT need your own Bangladesh Bank licence if you don't hold user funds.**
  Integrate a licensed payment gateway/aggregator (SSLCommerz, aamarPay, etc. — PSO
  licensees) or direct MFS merchant APIs (bKash, Nagad). PSP/PSO licences under the
  Bangladesh Payment and Settlement Systems Regulation 2014 are only needed if you
  operate a wallet or settle payments yourself.
  [PSO/PSP guide](https://legalseba.com/bd-licenses/how-to-obtain-a-pso-and-psp-license-in-bangladesh/),
  [Bangladesh Bank approval procedure (PDF)](https://www.bb.org.bd/aboutus/regulationguideline/psd/pso_psp_03022019.pdf).
- **Avoid holding escrow/prepaid balances at launch** — that drags you into PSP
  territory. Charge riders per-booking via gateway/MFS; settle to drivers via bKash/Nagad
  disbursement.
- **Design for cash + MFS coexistence.** Even Uber Intercity takes fares/tolls in cash.
  MFS rails are extraordinary: ~238.7M mobile money accounts, bKash alone ~68M users,
  ~BDT 4,833 crore in daily MFS transactions (2024).
  [TBS](https://www.tbsnews.net/economy/bangladesh-handles-over-8-global-daily-mobile-money-transactions-2024-1196341),
  [Future Startup — MFS industry 2025](https://futurestartup.com/2025/05/06/the-state-of-mobile-financial-services-mfs-industry-in-bangladesh/).

## 6. Data protection (new — most guides don't cover this yet)

The **Personal Data Protection Ordinance 2025** took effect **6 November 2025** (amended
January 2026). It applies to DeshRide squarely — a ride app collects location traces,
NIDs, phone numbers, and payment data:

- Explicit consent required for collection/processing; rules for sensitive data.
- **Penalties up to 5% of annual turnover.**
- Data localization was narrowed by the Jan 2026 amendments to critical sectors
  (banking, healthcare) and "restricted"/CII data — a general ride app likely escapes
  hard localization, but keep a synchronized in-country copy on the roadmap in case
  location data gets swept into a restricted class.
- Applies to foreign entities offering services to, or profiling, people in Bangladesh —
  so a Canada-incorporated backend does not escape it.

Sources: [Daily Star — key takeaways](https://www.thedailystar.net/tech-startup/news/bangladeshs-personal-data-protection-ordinance-2025-key-takeaways-4015401),
[ITIF — cross-border data rules](https://itif.org/publications/2025/05/16/bangladesh-cross-border-data-transfer-regulation/),
[Jural Acuity analysis](https://juralacuity.com/personal-data-protection-ordinance/).

---

## 7. Headwinds 🌬️

1. **Per-vehicle enlistment friction.** Every driver's car needs BRTA paperwork before
   their first paid trip — a real onboarding funnel killer vs. "sign up and drive."
2. **Minimum fleet requirements** (100 vehicles / DTCA area as written) mean you can't
   soft-launch with 15 drivers without an accommodation from BRTA.
3. **The casual-supply model is legally blocked.** The whole Poparide magic — huge
   latent supply from ordinary car owners — is throttled by §2.2 above. Bangladesh also
   has *low private car ownership* (roughly ~5 cars per 1,000 people) concentrated in
   Dhaka/Chattogram, so raw supply is thinner than Canada to begin with.
4. **Bus is brutal competition on price.** Dhaka–Chattogram AC coach tickets are cheap,
   frequent, and bookable online (Shohoz, Jatri, bdtickets). DeshRide can't win on price
   alone; it wins on door-to-door comfort, flexibility, and sold-out peak periods.
5. **Safety & trust.** Highway travel with strangers is a bigger trust ask in Bangladesh
   (gender safety, highway robbery incidents). The SOS mandate is a floor, not a
   ceiling — NID-verified profiles, women-only ride options, and live trip sharing are
   near-mandatory product features.
6. **Regulatory volatility.** BRTA has swung between tightening (2020-21 enlistment
   crackdown, bike bans) and proposing relaxations; the post-2024 interim-government
   period keeps rulemaking unpredictable ([Daily Star — BRTA wants rules relaxed](https://www.thedailystar.net/backpage/news/ride-sharing-services-brta-now-wants-rules-relaxed-1689286)).
7. **Driver economics discontent.** 25–30% commissions triggered strikes against
   incumbents; a new platform inherits that skepticism.
8. **PDPO 2025 compliance cost** hits from day one (consent flows, DPO-type duties,
   breach handling) — cheap to design in now, expensive to retrofit.

## 8. Tailwinds 🌊

1. **Padma Bridge (2022) rewired intercity travel.** ~2 hours cut from Dhaka–southwest
   car journeys; 21+ districts newly car-accessible; JICA estimates a 10% travel-time
   cut to/from Dhaka lifts regional output ~5.5%. Ideal corridor for seat-sharing.
   [Springer case study](https://link.springer.com/article/10.1186/s44147-023-00299-1).
2. **Uber Intercity proves demand AND regulatory tolerance** — but it's full-car-hire
   pricing. Per-seat pricing undercuts it massively; nobody owns that niche yet.
   **There is no BlaBlaCar-style incumbent in Bangladesh.**
3. **Digital rails are ready:** ~72.8% smartphone household adoption (2025), 100% 4G
   coverage, ~77.7M internet users, world-class MFS penetration.
   [DataReportal Digital 2025](https://datareportal.com/reports/digital-2025-bangladesh),
   [TBS smartphone growth](https://www.tbsnews.net/tech/smartphone-users-will-grow-63-2025-report-455654).
4. **Ride-hailing market growing ~10.7%/yr** (Statista: ~US$93M in 2024 → ~US$154M by
   2029, 43.8M projected users), and it's an already-educated market — users know how
   app rides work. [Statista](https://www.statista.com/outlook/mmo/shared-mobility/ride-hailing/bangladesh).
5. **Eid surge economics.** Twice a year, tens of millions leave Dhaka and bus/train/air
   sell out completely. Peak-period seat marketplaces are exactly what carpooling
   platforms monetize best (this is Poparide's Thanksgiving/long-weekend play, at 10x
   the scale).
6. **VAT structure is favorable** — 5% on commission only, no VAT burden pushed onto
   drivers or riders.
7. **Local champions beat global ones here.** Pathao out-executed Uber locally;
   a Bangladesh-first, Bangla-first intercity product has a real cultural moat.

---

## 9. Recommended launch shape (v1)

- **Entity:** BD private limited company; decide founder investment route (local vs BIDA
  foreign) first.
- **Model:** enlisted ridesharing company; recruit semi-professional drivers (private
  car owners willing to complete BRTA enlistment; rent-a-car/microbus operators as
  seed supply) selling *per-seat* intercity trips. Cars & microbuses only.
- **Corridors:** Dhaka–Chattogram, Dhaka–Sylhet, and Padma corridor
  (Dhaka–Khulna/Barishal/Jashore) — pick ONE to start; Padma corridor is the most
  underserved-by-rail and most car-transformed.
- **Payments:** gateway + bKash/Nagad merchant integration, cash allowed; no wallet.
- **Legal spends, in priority order:** (1) opinion on cost-sharing carpooling vs
  commercial ridesharing classification; (2) BRTA pre-consultation on intercity scope +
  fleet-minimum accommodation; (3) PDPO 2025 compliance memo.

## 10. Open questions → future iterations

- [ ] Unit economics: per-seat pricing vs AC bus fare vs Uber Intercity full-car pricing
      on Dhaka–Chattogram; driver take-home math; take-rate sensitivity.
- [ ] Competitive deep-dive: Pathao/Shohoz/Jatri/Obhai intercity moves; why earlier
      carpool attempts (if any) died.
- [ ] BRTA fleet-minimum reality check: is the 100-vehicle floor enforced against new
      entrants today, or negotiable?
- [ ] Cost-sharing legal opinion scope (the BlaBlaCar question).
- [ ] Insurance products available for per-seat passenger coverage.
- [ ] Android launch specifics: Google Play requirements for ride apps, SMS/OTP rules
      (BTRC aggregator for SMS), NID verification APIs (porichoy.gov.bd).
- [ ] Driver supply survey: how many enlisted ridesharing cars exist today outside
      Uber/Pathao exclusivity?
