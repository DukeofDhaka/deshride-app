# DeshRide — Escrow Payments Architecture (bKash, Nagad, Cards)

**Iteration 5: How "hold the fare, pay the driver after the ride" actually gets built
in Bangladesh**
*July 2026*

---

## 1. The good news: the regulator already wants your model

The founder's requirement — *collect the fare up front, hold it, release to the driver
only after the ride completes* — is not just allowed in Bangladesh; since the 2021
e-commerce scandals (Evaly et al.), it is the **regulator-mandated pattern** for
digital-commerce payments:

- Bangladesh Bank's **Digital Commerce Operation Guidelines 2021** and subsequent
  directives require advance customer payments to sit with the **payment gateway /
  Bangladesh Bank–approved escrow**, reaching the merchant only after delivery is
  confirmed. ([TBS](https://www.tbsnews.net/economy/bangladesh-bank-introduce-escrow-service-e-commerce-267139),
  [Dhaka Tribune](https://www.dhakatribune.com/business/2021/12/19/bb-instructs-payment-gateways-to-start-paying-back-e-commerce-consumers),
  [Daily Star](https://www.thedailystar.net/business/economy/e-commerce/news/apply-escrow-services-high-risk-e-commerce-platforms-only-2120681))
- bKash itself executed regulator-directed refunds from held funds under that framework
  (BB letter PSD/ADC & L(E-Commerce)/52/2021).

**The one design rule that keeps DeshRide licence-free:** the money is held *by the
licensed PSO/gateway escrow*, never in DeshRide's own bank account. If DeshRide pools
rider money in its own account and pays drivers out of it, that's operating a payment
service → Bangladesh Bank PSP territory (doc 01 §5). Same UX, very different legal
outcome — the escrow must live at the gateway.

## 2. The flow, mapped to the product

```
Guest requests seats ──────────────► nothing charged (request is free to send)
Driver accepts ────────────────────► gateway collects fare → HELD in escrow
Trip completes (driver marks done,
guest confirms / auto-confirm 24h) ─► DeshRide instructs gateway → payout to driver
Cancellation / no-show ────────────► refund from escrow per policy
```

This exact lifecycle is now implemented in the app (`payStatus: unpaid → held →
released / refunded` in `src/lib/store.ts`), simulated locally, so the UX is already
shaped around escrow before a single gateway contract is signed.

## 3. Connecting each payment provider

### Option A (launch): one aggregator with delayed settlement — simplest

**SSLCommerz / aamarPay / shurjoPay** each give bKash + Nagad + Rocket + Visa/
Mastercard in one integration, and post-2021 they all operate under the BB
escrow/settlement-hold regime.

- Integration: hosted checkout (redirect or in-app webview) → IPN/webhook confirms
  the charge → funds sit at the gateway → DeshRide's dashboard/API triggers
  settlement after trip completion.
- Contract points to negotiate: **settlement trigger** (API-driven release vs fixed
  T+n), split settlement (driver share vs DeshRide commission), refund SLA, and fees
  (~1.5–3% by method; MFS at the lower end, cards higher).
- This gets bKash, Nagad AND cards on day one with one counterparty.

### Option B (scale): direct rails per provider

| Provider | Collection | Hold | Payout to driver |
|---|---|---|---|
| **bKash** | Tokenized Checkout (app-to-app deep link) into merchant wallet | Keep collected fares at gateway/escrow tier; bKash supports regulator-directed refunds | **bKash B2C Disbursement API** — batch payouts to any bKash number ([bKash business](https://www.bkash.com/en/business)) |
| **Nagad** | Merchant API checkout (lowest MFS fees, ~1.65%) | Same escrow structure | Nagad disbursement/B2C payout |
| **Cards** | Acquirer via gateway only (no direct Visa/MC acquiring without a bank) | Gateway settlement hold | n/a — cards are collection-side only; drivers get paid to MFS |

Reality check: **drivers get paid into bKash/Nagad wallets, not bank accounts.**
Payout rail = MFS disbursement API regardless of how the rider paid. A rider pays by
card; the driver still receives bKash.

### What stays out of scope (deliberately)

- ❌ DeshRide-branded wallet or stored balance → full PSP licence, AML/KYC program.
- ❌ Holding funds in DeshRide's operating account → same problem, plus commingling.
- ❌ Cash leg for the escrow product: cash can stay as a fallback ride option later,
  but it cannot participate in hold-and-release; v2 ships bKash/Nagad/card only,
  which is what the product now reflects.

## 4. Commission mechanics

Escrow makes the take rate clean: on release, the gateway splits —
driver gets `fare − commission`, DeshRide's account gets `commission` (5% VAT applies
to the commission only, per doc 01 §4). No invoicing drivers, no chasing cash
commissions — the #1 operational headache of the cash model disappears.

Worked example, Dhaka→Chattogram, 3 seats × ৳1,500, 12% take:
- Escrow holds ৳4,500 from acceptance to completion.
- On release: driver payout ৳3,960 to bKash; DeshRide ৳540; VAT due ৳27.

## 5. Dispute & trust rules to define before launch

1. **Completion confirmation:** driver marks complete + guest auto-confirms in 24h
   unless they raise a dispute (Poparide's pattern). Ties into the SOS/safety story.
2. **Guest cancellation ladder:** full refund >24h before departure; partial within
   24h; no refund after pickup time (driver protection).
3. **Driver no-show:** automatic full refund + driver penalty strike.
4. **Refund SLA:** BB directives push gateways to refund held funds fast — publish
   "refunds in 72h" and hold the gateway to it contractually.

## 6. Build order

1. Sandbox account with one aggregator (SSLCommerz or aamarPay both have public
   sandboxes) — wire `requestBooking → acceptance charge → webhook → held` against
   the sandbox.
2. Driver payout: bKash disbursement sandbox for the release step.
3. Legal: escrow/settlement terms reviewed against the Digital Commerce Guidelines
   (the BB-approved escrow wording matters in the gateway contract).
4. Only then: direct bKash/Nagad merchant deals when volume justifies better rates.
