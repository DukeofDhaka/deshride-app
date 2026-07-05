# DeshRide — Market, Competition & Unit Economics

**Iteration 2: Price anchors, driver math, competitive landscape**
*Research date: July 2026. Benchmark route used throughout: Dhaka–Chattogram (~250 km, 5–8 hrs by road). Figures are desk-research estimates — validate on the ground.*

---

## 1. What travellers pay today (Dhaka–Chattogram, one-way)

| Mode | Price (BDT) | Notes |
|---|---|---|
| Non-AC bus | ~650–800 | Cheapest floor; frequent departures |
| AC bus (business/sleeper) | ~1,000–2,500 | Most common comfort tier ~1,600–2,200 |
| Train (Shovon Chair) | ~450–550 | Cheap but tickets sell out; station-to-station |
| Train (AC seat/berth) | ~1,200–1,800 | Limited supply |
| Uber Intercity (whole car) | ~10,000–14,000 (est.) | Tk 32/km + Tk 3/min + Tk 22/km one-way surcharge after 10 km — see calc below |
| Car rental marketplaces (Garibook etc.) | quote-based | Sedan / 7-seat HiAce / 11-seat Noah; verify live quotes |

Uber Intercity estimate: 250 km × Tk 32 ≈ 8,000 + ~330 min × Tk 3 ≈ 990 + one-way
surcharge ~240 km × Tk 22 ≈ 5,280 → **~Tk 14,000** full car. Even discounting heavily,
app-hailed full-car intercity sits at ~Tk 10k+. (Reference points from Uber's own
published examples: 43 km ≈ Tk 1,736; flat Tk 6,000 Chattogram→Cox's Bazar.)

Sources: [bdtickets Dhaka–Ctg bus guide](https://bdtickets.com/blog/dhaka-to-chittagong-bus-guide-night-vs-day-coach-sleeper-ac-non-ac),
[bd-info bus prices](https://bd-info.com/dhaka-to-chittagong-bus-ticket-price/),
[bd-info train fares](https://bd-info.com/dhaka-to-chittagong-train-schedule/),
[Uber Intercity Dhaka pricing](https://www.uber.com/en-BD/blog/dhaka/dhaka-intercity/),
[Uber Intercity Chattogram](https://www.uber.com/en-BD/blog/dhaka/intercity-chattogram/),
[Garibook](https://garibook.com/).

## 2. Driver economics (one-way Dhaka–Chattogram, private sedan)

**Fuel** (the dominant cost):

- Octane: **Tk 145/L** as of June 2026 (up from Tk 122 in Aug 2025 — fuel inflation is
  itself a tailwind for seat-sharing). A 10–12 km/L sedan burns 21–25 L → **Tk
  3,000–3,600**.
- CNG-converted car (very common in BD): government-regulated CNG is a fraction of
  octane per km (roughly Tk 2–4/km effective vs Tk 12–15/km on octane) → **~Tk
  600–1,000** for the same trip.
- Tolls: budget a few hundred taka on this corridor (Meghna/Gomati); Padma-corridor
  routes instead pay the Padma Bridge car toll (~Tk 750 — verify current schedule).

Sources: [Daily Star — June 2026 fuel hike](https://www.thedailystar.net/news/environment/natural-resources/energy/news/fuel-prices-rise-again-petrol-octane-tk-5-litre-4187466),
[GlobalPetrolPrices — Bangladesh gasoline](https://www.globalpetrolprices.com/Bangladesh/gasoline_prices/),
[BPC official price page](https://bpc.gov.bd/pages/static-pages/6922ddb6933eb65569e15fbc),
[CNG economics comparison](https://biswasimports.com/blogs/CNG-Car-Vs-Petrol-Car---Which-Car-is-Better--in-mileage,-price,-engine-life).

**The per-seat wedge that makes the model work:**

| | Octane sedan | CNG sedan |
|---|---|---|
| Trip cost (fuel + ~Tk 500 tolls/wear) | ~Tk 3,500–4,100 | ~Tk 1,100–1,500 |
| Revenue @ 3 seats × Tk 1,500 | Tk 4,500 | Tk 4,500 |
| Driver surplus (already making the trip) | +Tk 400–1,000 | +Tk 3,000–3,400 |

A **Tk 1,300–1,700 per-seat price** sits at AC-bus money for a door-to-door car ride:

- Rider: pays ~AC bus fare, skips the bus terminal entirely, gets picked up near home.
- Driver: covers the whole trip's fuel with 2–3 seats sold — the classic
  BlaBlaCar/Poparide value equation, and it clears even on octane.
- vs Uber Intercity: **~85–90% cheaper per person**. There is a massive pricing hole
  between Tk 2,500 (best bus) and Tk 10,000+ (full car). Nobody occupies it via app.

**Platform economics:** at a 12% take rate on a Tk 4,500 trip, DeshRide grosses ~Tk 540
per trip (then 5% VAT on that commission ≈ Tk 27). Rough scale math: 100
trips/day ≈ Tk 1.97 crore/yr (~US$165k) gross commission. Keep the take rate visibly
below the 25–30% that made drivers revolt against Uber/Pathao — a 10–15% published rate
is both defensible economics and a driver-acquisition pitch.
([Rest of World on BD commission backlash](https://restofworld.org/2023/uber-commission-fees-bangladesh/))

## 3. Competitive map (July 2026)

| Player | What they do intercity | Threat to DeshRide |
|---|---|---|
| **Pathao** (~45% of BD ride-hailing) | Launched **Pathao Car Rental** Aug 2024 — intercity full-car booking with driver *bidding* | **Highest.** Has drivers, brand, capital. But it's full-car rental, not per-seat |
| **Uber** | Uber Intercity (Dhaka, Chattogram), full-car, premium | Validates demand; doesn't compete on price per person |
| **InDrive** | Fare-negotiation city rides | Model proof that BD users love negotiating; could pivot intercity |
| **Jatri** | Bus tickets + rentals, multimode app | Owns bus-ticket demand data; adjacent |
| **Shohoz / bdtickets** | Bus/train/launch ticketing | Owns the price-anchor market |
| **Garibook** | City-to-city car rental (sedan/HiAce/Noah) | Same corridor, full-vehicle only |
| **Obhai** | Shut down | Cautionary tale |

Sources: [Pathao Car Rental launch](https://pathao.com/blog/press/pathao-car-rental-for-effortless-journeys/),
[Pathao competitive landscape](https://businessmodelcanvastemplate.com/blogs/competitors/pathao-competitive-landscape),
[Jatri on Google Play](https://play.google.com/store/apps/details?id=com.jatri.jatriuser&hl=en),
[TBS on InDrive](https://www.tbsnews.net/features/panorama/indrive-mysterious-inner-workings-new-ridesharing-app-684294),
[UNB ridesharing app roundup](https://www.unb.com.bd/category/tech/best-ride-sharing-apps-in-bangladesh/59407).

### 3.1 The *real* incumbent: informal "khep" culture

The strongest per-seat intercity competitor isn't an app — it's **Facebook groups and
roadside bargaining**. Drivers returning from intercity drop-offs fill seats informally
("khep" trips), and riders negotiate directly; a documented drift of drivers *away from
apps* toward these informal channels is well reported
([Rest of World](https://restofworld.org/2022/bangladesh-abandoning-bike-taxi-apps/),
[UNB — informal bargaining overtakes apps](https://www.unb.com.bd/category/Special/informal-bargaining-overtakes-app-based-ridesharing-in-bangladesh/151323)).

Read this two ways:

- **Threat:** the informal market is free (no commission) and habit-entrenched.
- **Opportunity:** it proves per-seat intercity demand *and* supply already exist at
  scale. DeshRide's pitch is formalizing khep: verified identities, women-safe options,
  fixed upfront pricing, digital payment, insurance, SOS — none of which a Facebook
  group offers. Price the commission low enough that safety+convenience beats "free."

### 3.2 Lessons from the graveyard

- Of ~15 companies that obtained BRTA ridesharing enlistment, reportedly **only Pathao
  and Uber renewed** their licences; the rest (incl. Obhai, Shohoz rides) faded
  ([Business Inspection BD](https://businessinspection.com.bd/why-riders-dont-like-to-use-ridesharing-apps/)).
  Undifferentiated city ride-hailing is a capital bonfire — DeshRide must NOT drift
  into competing with Pathao inside Dhaka.
- Early carpool experiments (e.g. TaxiWala, 2016) died before the market matured
  ([Future Startup](https://futurestartup.com/2016/11/01/new-carpooling-startup-taxiwala-hits-the-dhaka-road/)) —
  pre-Padma Bridge, pre-MFS-ubiquity, pre-smartphone-majority. The infrastructure
  excuses of 2016 are gone in 2026.

## 4. Strategic implications

1. **The niche is real and empty:** app-based *per-seat* intercity at Tk 1,300–1,700 —
   between the AC bus and 10x-priced full-car hire. First-mover space.
2. **Recruit the khep drivers first.** They already do per-seat intercity, already own
   enlisted-or-enlistable cars, and already understand the economics. Seed supply =
   formalizing existing behavior, not creating new behavior.
3. **Eid is the beachhead event.** When every bus/train/flight sells out, per-seat car
   inventory is the only elastic supply in the country. Two launches/year are
   effectively pre-scheduled.
4. **Expect Pathao to notice.** Defenses: corridor depth over breadth, driver-friendly
   take rate, safety brand (women-only rides), and speed.
5. **CNG-converted cars are the golden supply segment** — their per-trip surplus is
   ~3x an octane car's, so they'll accept lower seat prices and ride out price wars.

## 5. Open questions → next iterations

- [ ] Live-quote Garibook/Pathao Rental for Dhaka–Ctg & Dhaka–Khulna to sharpen the
      full-car anchor.
- [ ] Size the khep Facebook groups (member counts, posts/day) as a supply proxy.
- [ ] Android launch stack: Google Play ride-app policy, BTRC SMS/OTP aggregator, NID
      verification (Porichoy API), passenger insurance products. ← next iteration
- [ ] Eid demand quantification: modal capacity vs outbound Dhaka volume.
- [ ] Whether Pathao Car Rental's bidding produces per-seat behavior organically.
