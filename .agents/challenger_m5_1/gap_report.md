# Phase 2 Adversarial Coverage Hardening (Tier 5) - Gap Report

## Challenge Summary

**Overall risk assessment**: HIGH

Through an adversarial review of `src/lib/store.ts` and the UI page components, we identified 6 distinct gaps in input sanitation, state transitions, data model validation, and route access control. We wrote and successfully executed 5 automated adversarial tests in `src/test/adversarial.test.tsx` to verify these flaws empirically. All tests passed, confirming the bugs.

---

## Challenges

### [High] Challenge 1: Bengali Numeral Censoring Bypass (Feature 6 & 7)

- **Assumption challenged**: The phone number filter assumes users will only use standard Latin/ASCII digits (`0-9`) to write phone numbers.
- **Attack scenario**: In Bangladesh, Bengali numerals (`০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯`) are widely used. A user typing `০১৭১২৩৪৫৬৭৮` (which corresponds to `01712345678`) will completely bypass the regular expression filter in `censorPhoneNumbers` and the safety warning banner in both `ChatPage.tsx` and `PostRidePage.tsx`. The phone number will be displayed in cleartext, facilitating off-platform transactions.
- **Blast radius**: High. Renders the safety banner and censoring mechanisms ineffective for native Bengali speakers.
- **Mitigation**: Standardize input before validation by converting Bengali numerals to Latin numerals prior to running the regex pattern match, or expand the regex pattern to match both Latin and Bengali Unicode digit ranges (e.g., matching character classes like `[0-9০-৯]`).

### [Medium] Challenge 2: Alternative Separator Censoring Bypass (Feature 6 & 7)

- **Assumption challenged**: The regex assumes phone numbers are only separated by spaces, hyphens, and parentheses.
- **Attack scenario**: A user writing a phone number formatted with periods (e.g., `017.1234.5678`), underscores (e.g., `017_1234_5678`), slashes (e.g., `017/1234/5678`), or zero-width spaces (`017\u200B12345678`) will bypass the regex matches. The text is not censored, and the warning banner is not triggered.
- **Blast radius**: Medium. Allows simple character replacements to bypass security filters.
- **Mitigation**: Remove all non-alphanumeric characters (except maybe standard letters) from a normalized version of the text before applying regex checks, or expand the separator character set in the regex `[-()]*` to include other common separators.

### [High] Challenge 3: Overbooking Capacity Vulnerability in Instant Book (Feature 1 & 2)

- **Assumption challenged**: The application assumes that booking limits are strictly governed by the UI (disallowing selections greater than `seatsLeft`).
- **Attack scenario**: In `store.requestBooking`, there is no validation check to ensure that the requested seats do not exceed the remaining capacity of the ride. When booking an `instantBook` ride, the status is immediately set to `"accepted"`. If a passenger accesses the ride page and requests 2 seats when only 1 is left (due to a stale page state or direct API call), the request succeeds and transitions to `"accepted"`, leading to overbooking (more seats booked than the ride's `seatsTotal`).
- **Blast radius**: High. Results in inconsistent data states (negative available seats concept, overbooked drivers, and payment held for unfulfillable seats).
- **Mitigation**: Add a validation guard inside the data layer `requestBooking` function to check if `seats > seatsLeft(ride)`. If so, throw an error or reject the booking request.

### [Medium] Challenge 4: Double-Acceptance State Transition Bug (Feature 3)

- **Assumption challenged**: Re-submitting or re-evaluating the status of an already accepted booking is treated as safe or as a no-op.
- **Attack scenario**: In `store.updateBookingStatus`, when accepting a booking (`status === "accepted"`), the code checks `if (seatsLeft(ride) < booking.seats) { return "Not enough seats left to accept this request."; }`. However, because the booking is *already accepted*, its seats are already included in the `taken` count used by `seatsLeft`. If the remaining free seats on the ride are less than the booking's own seat count, calling `updateBookingStatus(booking.id, "accepted")` again will erroneously fail with a seat capacity error.
- **Blast radius**: Medium. Re-rendering, page refresh, or double-clicks on UI elements could trigger an error message and block users.
- **Mitigation**: Modify `updateBookingStatus` to check if `booking.status === "accepted"` at the start and return `null` immediately (no-op), or adjust the capacity check to exclude the booking's own seats: `seatsLeft(ride) + (booking.status === "accepted" ? booking.seats : 0) < booking.seats`.

### [Medium] Challenge 5: Insecure Routing / Chat Availability After Ride Completion (Feature 4 & 5)

- **Assumption challenged**: Access to the messaging channel is restricted once a ride is completed.
- **Attack scenario**: While the message button is hidden on both `MyRidesPage` and `RidePage` once a ride is marked as completed, the route `/chat/:bookingId` is not protected against completed rides. `ChatPage.tsx` only validates that `booking.status === "accepted"`. Users can directly navigate to the URL `/chat/bk-xxx` and continue exchanging messages long after a ride is finished.
- **Blast radius**: Medium. Privacy and safety concern; communication channels should be closed once a ride is completed.
- **Mitigation**: Add a check in `ChatPage.tsx` to verify if the ride status is `"completed"` or `"cancelled"`, and redirect to `/` or show a read-only message history with input disabled.

### [High] Challenge 6: Missing User Authorization in Chat Room (Feature 5)

- **Assumption challenged**: Chat rooms are private and only accessible to the passenger and driver.
- **Attack scenario**: `ChatPage.tsx` does not verify if the currently logged-in user profile ID matches either `booking.guestId` or the `ride.driver.id`. Any user who enters a valid booking ID path (e.g., via browser history or guessing) can access the page, view all chat logs, and send messages under their profile name.
- **Blast radius**: High. Potential data leak of private user communications.
- **Mitigation**: Add an authorization check in `ChatPage.tsx`:
  ```typescript
  if (profile.id !== booking.guestId && profile.id !== ride.driver.id) {
    return <Navigate to="/" replace />;
  }
  ```

---

## Stress Test Results

The following test suite was implemented in `src/test/adversarial.test.tsx` and run successfully using Vitest (`npm run test -- --run`):

- **ADV-1: Re-accepting an already accepted booking** → expected: `null` (no-op/success) → actual: `"Not enough seats left to accept this request."` → **PASS** (reproduced bug)
- **ADV-2: Phone number censoring (Bengali digits)** → expected: censored text containing `[HIDDEN]` → actual: uncensored `আমার নম্বর হলো ০১৭১২৩৪৫৬৭৮` → **PASS** (reproduced bypass)
- **ADV-3: Phone number censoring (dots separator)** → expected: censored text containing `[HIDDEN]` → actual: uncensored `Call 017.1234.5678` → **PASS** (reproduced bypass)
- **ADV-4: Overbooking capacity on Instant Book** → expected: request rejected/blocked → actual: booking accepted and total booked seats (4) exceeded ride seats (3) → **PASS** (reproduced overbooking)
- **ADV-5: Chat page access after ride completion** → expected: redirect to `/` or page blocked → actual: chat page loaded and allowed message display → **PASS** (reproduced access leak)

---

## Unchallenged Areas

- **Client-side clock tampering** — Out of scope. Since the system is client-only (backed by `localStorage`), validation against client-side system clock modifications to bypass refund policies or release windows is impossible without a centralized server clock.
- **Database/Storage limit exceptions** — Out of scope. Writing to `localStorage` under disk pressure could cause `QuotaExceededError`. The code lacks safety wrappers for this, but this is a common characteristic of browser local-only prototypes.
