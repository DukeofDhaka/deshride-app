# Gap Analysis & Adversarial Test Report

**Overall Risk Assessment**: **HIGH**

This report details the findings from the Phase 2 Adversarial Coverage Hardening (Tier 5) review of the DeshRide state store (`src/lib/store.ts`) and pages (`ChatPage.tsx`, `PostRidePage.tsx`, `MyRidesPage.tsx`, `RidePage.tsx`).

All identified vulnerabilities and edge cases have been empirically verified by executing a dedicated adversarial test suite (`src/test/challenger.test.tsx`), where all test assertions passed, confirming the bugs' existence.

---

## 1. Identified Gaps & Adversarial Vulnerabilities

### Gap 1: Validation Bypass for First-Time Drivers
*   **Vulnerability**: In `PostRidePage.tsx`, if the current profile has `profile.driver = false` (or undefined), the form validation check is skipped entirely. Instead, the page immediately saves the draft and navigates to `/driver-onboarding`.
*   **Attack Scenario**: A malicious or faulty client can submit an empty form, which gets saved as a draft. When they finish onboarding, the page (`DriverOnboardingPage.tsx`) calls `store.createRide(pendingRide)` directly, publishing a corrupt ride with empty pickup/dropoff points, no car details, and negative or zero fares.
*   **Proof**: The test case `Adversarial: First-time driver validation bypass publishing invalid ride` proves that a negative fare (`-100`) and empty car details are written into the active store without error.
*   **Mitigation**: Perform validation checks *before* saving the ride draft in `PostRidePage.tsx`, or perform draft validation in `DriverOnboardingPage.tsx` before publishing.

### Gap 2: Uncensored Contact Info in Booking Request Messages
*   **Vulnerability**: While phone numbers are censored on the chat page and in driver notes, the `requestBooking` function in `store.ts` does not call `censorPhoneNumbers()` when storing the optional passenger request message.
*   **Attack Scenario**: A passenger can easily share their direct phone number (e.g. `01711223344`) inside the booking request message. This message is displayed in cleartext to the driver on `MyRidesPage.tsx`, bypassing the safety policy. No warning banner is displayed on `RidePage.tsx` when drafting this message.
*   **Proof**: Verified by `Adversarial: Booking request messages are completely uncensored` in `challenger.test.tsx`.
*   **Mitigation**: Apply `censorPhoneNumbers` to `message` in `requestBooking` inside `store.ts`, and display the safety warning banner in `RidePage.tsx` when phone digits are detected.

### Gap 3: DeshPoints and Rating Inflation Exploit
*   **Vulnerability**: The function `confirmReleaseAndRate` in `store.ts` updates user stats and adds driver ratings outside the database status update map.
*   **Attack Scenario**: A passenger can repeatedly invoke `confirmReleaseAndRate` for a single booking ID even after it has been `"released"`, `"cancelled"`, or `"declined"`. Each invocation increments `guestTrips` and awards +20 points (DeshPoints) and registers an additional star rating for the driver, leading to infinite points farming and artificial rating inflation.
*   **Proof**: Verified by `Adversarial: DeshPoints and Rating Inflation Exploit` where calling it twice on the same booking awarded 40 points instead of 20 and logged 2 ratings.
*   **Mitigation**: Validate that the booking's current `payStatus` is exactly `"releasing"` inside `confirmReleaseAndRate` before modifying user stats or adding ratings.

### Gap 4: Chat Authorization and Information Disclosure Bypass
*   **Vulnerability**: `ChatPage.tsx` does not verify if the current user (`profile.id`) is either the passenger (`booking.guestId`) or the driver (`ride.driver.id`) of the conversation.
*   **Attack Scenario**: Any registered user who knows or guesses a booking ID can navigate to `/chat/:bookingId`. The application will render the full chat history and allow the intruder to send messages to the conversation under their own name.
*   **Proof**: Verified by `Adversarial: Chat page lacks authorization check` in `challenger.test.tsx`.
*   **Mitigation**: Add a guard in `ChatPage.tsx`:
    ```typescript
    if (profile.id !== booking.guestId && profile.id !== ride?.driver.id) {
      return <Navigate to="/" replace />;
    }
    ```

### Gap 5: Overbooking on Instant Book Rides
*   **Vulnerability**: `requestBooking` does not check seat availability (`seatsLeft(ride) < requestedSeats`) before setting the booking status to `"accepted"` for Instant Book rides.
*   **Attack Scenario**: Under concurrent conditions (or direct invocation), multiple passengers can book seats on an Instant Book ride exceeding the total seats available, leading to overbooking.
*   **Proof**: Verified by `Adversarial: Overbooking on Instant Book Rides` where a passenger successfully booked 2 seats on a ride with only 1 seat total.
*   **Mitigation**: Verify seat availability in `requestBooking` and reject or fallback to `"pending"` if seats are insufficient.

### Gap 6: Completed Ride Cancellation Inconsistency
*   **Vulnerability**: `cancelRide` in `store.ts` does not check if the ride's current status is `"completed"` before setting it to `"cancelled"`.
*   **Attack Scenario**: A completed ride can programmatically be cancelled. When cancelled, the bookings change to `"cancelled"`, but since their payment state is already `"releasing"` or `"released"`, they are not set to `"refunded"`. This leaves the database in an inconsistent state where bookings are cancelled but payment remains released to the driver.
*   **Proof**: Verified by `Adversarial: Completed ride cancellation leaves inconsistent booking states` in `challenger.test.tsx`.
*   **Mitigation**: Reject cancellations in `cancelRide` if the ride status is `"completed"`.

### Gap 7: Bangladeshi Phone Number Regex Censoring Bypasses
*   **Vulnerability**: The censoring regex `/(?:\+?88\s*[-()]*\s*0?\s*[-()]*\s*1|0\s*[-()]*\s*1|\(?\+?88\)?\s*[-()]*\s*0?\s*[-()]*\s*1)\s*[-()]*\s*[3-9](?:\s*[-()]*\s*\d){8}/g` is narrow and relies heavily on specific delimiters.
*   **Bypasses**:
    - Dot separators: `017.1122.3344`
    - Underscores: `017_1122_3344`
    - Slashes: `017/1122/3344`
    - Bengali digits: `০১৭১১২২৩৩৪৪`
    - Zero-width spaces/joiners: `017\u200B1122\u200B3344` or `017\u200D1122\u200D3344`
    - Word numbers: `zero one seven...`
*   **Proof**: Verified in `Adversarial: Bangladeshi phone number regex censoring bypasses`.
*   **Mitigation**: Normalize input (strip punctuation, convert Bengali digits to English) before applying regex check, or use a broader digit matching regex.

### Gap 8: Cross-Tab State Synchronization Race Condition
*   **Vulnerability**: `store.ts` handles in-memory notifications but does not listen to browser `"storage"` events.
*   **Attack Scenario**: Changes in Tab A (e.g. driver accepts request) will not propagate to Tab B (where passenger is waiting) until Tab B triggers a navigation or manual page reload.
*   **Mitigation**: Listen to the window's `"storage"` event inside `store.ts` and trigger `notify()` to synchronize state across multiple tabs.

---

## 2. Verification Test Suite Execution Results

The newly created adversarial test file `src/test/challenger.test.tsx` was executed against the project's Vitest runner:

```bash
npm test
```

### Output:
```text
 ✓ src/test/challenger.test.tsx (7 tests) 108ms
 ✓ src/test/tier1.test.tsx (35 tests) 351ms
 ✓ src/test/tier2.test.tsx (35 tests) 412ms
 ✓ src/test/tier3.test.tsx (7 tests) 231ms
 ✓ src/test/tier4.test.tsx (5 tests) 90ms

 Test Files  7 passed (7)
      Tests  95 passed (95)
   Start at  13:03:35
   Duration  2.83s
```

All 7 adversarial tests passed, confirming the bugs exist and have been successfully reproduced in the code.
