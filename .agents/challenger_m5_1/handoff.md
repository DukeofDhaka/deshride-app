# Handoff Report

## 1. Observation

We observed the following code sections and behaviors:
* In `src/lib/store.ts` (lines 608-611):
  ```typescript
  export function censorPhoneNumbers(text: string): string {
    const regex = /(?:\+?88\s*[-()]*\s*0?\s*[-()]*\s*1|0\s*[-()]*\s*1|\(?\+?88\)?\s*[-()]*\s*0?\s*[-()]*\s*1)\s*[-()]*\s*[3-9](?:\s*[-()]*\s*\d){8}/g;
    return text.replace(regex, "[HIDDEN]");
  }
  ```
  The regular expression uses ASCII character classes (`[3-9]`, `\d`) and only handles specific separator characters (`\s*[-()]*\s*`).
* In `src/lib/store.ts` (lines 330-358):
  ```typescript
  export function requestBooking(
    rideId: string,
    seats: number,
    payMethod: PaymentMethodId,
    message?: string
  ): Booking {
    // ...
    const instant = Boolean(getRide(rideId)?.instantBook);
    const booking: Booking = {
      // ...
      status: instant ? "accepted" : "pending",
      payStatus: instant ? "held" : "unpaid",
    };
    saveBookings([...allBookings(), booking]);
    return booking;
  }
  ```
  This function does not check if the requested seat count exceeds the available remaining seats (`seatsLeft(ride)`) before creating and confirming the booking.
* In `src/lib/store.ts` (lines 364-379):
  ```typescript
  if (status === "accepted") {
    // ...
    if (seatsLeft(ride) < booking.seats) {
      return "Not enough seats left to accept this request.";
    }
  }
  ```
  If `booking.status` is already `"accepted"`, its seats are already counted as taken in `seatsLeft(ride)`. When re-evaluating the status, the check compares the *remaining* seats left (after subtracting the booking's seats) against the booking's own seat count.
* In `src/pages/ChatPage.tsx` (lines 34-36):
  ```typescript
  if (!booking || booking.status !== "accepted") {
    return <Navigate to="/" replace />;
  }
  ```
  The component allows access based strictly on booking status, ignoring ride status (e.g. `"completed"`).
* Running the custom adversarial test suite `src/test/adversarial.test.tsx` containing tests `ADV-1` through `ADV-5` resulted in all tests passing (meaning the gaps/vulnerabilities were successfully triggered and verified):
  ```
  RUN  v4.1.9 /Users/dukez/Documents/Amr DeshRide
  ✓ src/test/adversarial.test.tsx (5 tests) 56ms
  Test Files  1 passed (1)
  Tests  5 passed (5)
  ```

## 2. Logic Chain

1. **Regex Bypasses (Bengali Numeral & Dot Delimiters)**:
   - Observation 1 shows that `censorPhoneNumbers` checks for Latin digits `[3-9]` and `\d`.
   - Bengali digits (e.g., `০১৭১২৩৪৫৬৭৮`) do not match these ASCII-only digit ranges.
   - Punctuation like `.` or `_` does not match the restricted separator group `\s*[-()]*\s*`.
   - Therefore, Bengali digits and dot-separated phone numbers bypass the filtering rules completely, remaining visible.

2. **Instant Book Overbooking**:
   - Observation 2 demonstrates that `requestBooking` automatically accepts instantBook rides and writes them directly to storage without verifying remaining ride capacity (`seatsLeft`).
   - Consequently, when concurrent/stale requests are received, the booking is saved as `"accepted"` even if the total capacity has been exceeded.

3. **Double Acceptance State Bug**:
   - Observation 3 shows that the booking acceptance state logic evaluates `seatsLeft(ride) < booking.seats`.
   - Since `seatsLeft` already subtracts the booking's seats if the booking is currently `"accepted"`, if `seatsTotal - otherBookingsSeats - booking.seats < booking.seats` (i.e. remaining free seats is less than the booking's seats), the function returns a seat capacity error.
   - Therefore, calling `updateBookingStatus(bookingId, "accepted")` on an already accepted booking fails under low capacity.

4. **Insecure Routing Post Ride Completion**:
   - Observation 4 shows that `ChatPage.tsx` checks only `booking.status !== "accepted"`.
   - Even when a ride is completed and marked `"completed"`, the booking's status remains `"accepted"`.
   - Therefore, users can still access the chat interface and post messages via direct routing after trip completion.

## 3. Caveats

- We assumed that all storage access is single-device local (using `localStorage` polyfill), and concurrency is simulated in a single browser window. Multi-device server concurrency or synchronization was not analyzed since the prototype lacks a network backend.
- The cancellation refund ladder relies on the local client machine's clock. Clock tampering was not tested as a vulnerability since a client-only prototype has no means to prevent it.

## 4. Conclusion

The application exhibits several significant vulnerabilities and state logic flaws:
1. Regex censoring can be easily bypassed by using Bengali digits or alternative delimiters like dots.
2. The data layer allows instantBook rides to be overbooked because it lacks capacity verification.
3. Accepting an already accepted booking under low capacity results in an erroneous "Not enough seats left" rejection.
4. Chat rooms lack route protection post-ride completion and have no user identity authorization checks.

## 5. Verification Method

To verify these findings and reproduce the bugs, run the following command in the terminal:
```bash
npm run test -- --run src/test/adversarial.test.tsx
```
This runs the 5 automated adversarial tests checking each of these gaps/vulnerabilities. You can inspect the assertions in `src/test/adversarial.test.tsx` and check the detailed breakdown in `gap_report.md`.
