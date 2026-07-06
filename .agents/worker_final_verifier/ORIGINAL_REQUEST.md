## 2026-07-06T13:04:24-04:00

You are teamwork_preview_worker.
Your working directory is /Users/dukez/Documents/Amr DeshRide/.agents/worker_final_verifier.
Your task is to implement the fixes for all identified security and validation gaps, and update the test files `src/test/adversarial.test.tsx` and `src/test/challenger.test.tsx` to assert the corrected, secure, and robust behaviors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please implement the following changes:

1. In `src/lib/store.ts`:
   - In `censorPhoneNumbers(text: string): string`: Use the comprehensive regex:
     `const regex = /(?:\+?[8৮]\s*[-()_./\u200B\u200D]*\s*[0০]?\s*[-()_./\u200B\u200D]*\s*[1১]|[0০]\s*[-()_./\u200B\u200D]*\s*[1১]|\(?\+?[8৮]\)?\s*[-()_./\u200B\u200D]*\s*[0০]?\s*[-()_./\u200B\u200D]*\s*[1১])\s*[-()_./\u200B\u200D]*\s*[0-9০-৯](?:\s*[-()_./\u200B\u200D]*\s*[0-9০-৯]){8}/gi;`
   - In `createRide` and `saveRideDraft`: Add a validation guard:
     `if (input.pricePerSeat <= 0 || !input.car?.trim() || !input.from?.name || !input.to?.name) { throw new Error("Invalid ride details"); }` (for `createRide`, use `input`; for `saveRideDraft`, use `draft`).
   - In `requestBooking`:
     - Throw an error if requested seats exceed remaining capacity: `if (seatsLeft(ride) < seats) { throw new Error("Not enough seats left."); }`
     - Apply `censorPhoneNumbers` to `message`: `message: message ? censorPhoneNumbers(message.trim()) : undefined`
   - In `confirmReleaseAndRate`: Return early without doing anything if the booking payStatus is not `"releasing"`: `if (booking.payStatus !== "releasing") return;`
   - In `cancelRide`: Throw an error if `ride.status === "completed"`: `if (ride.status === "completed") { throw new Error("Cannot cancel completed ride"); }`
   - In `sendMessage`: Throw an error if the current user profile ID is not `booking.guestId` and not `ride.driver.id`: `if (profile.id !== booking.guestId && profile.id !== ride.driver.id) { throw new Error("Unauthorized"); }`
   - In `updateBookingStatus`: Return `null` immediately if `status === "accepted" && booking.status === "accepted"` (making double acceptance a no-op).

2. In `src/pages/ChatPage.tsx`:
   - Update `phoneRegex` to match the comprehensive regex.
   - Access guard: Redirect (return `<Navigate to="/" replace />`) if `ride.status === "completed" || ride.status === "cancelled"`, or if `profile.id !== booking.guestId && profile.id !== ride.driver.id`.

3. In `src/pages/PostRidePage.tsx`:
   - Update `phoneRegex` to match the comprehensive regex.
   - In `handleSubmit`, move the main validation checks (for `!from || !to`, same place, empty driverName, effectivePrice <= 0, empty car) to the very top, before the `if (!profile.driver)` check. Remove the old `isTestF2B3` checks.

4. In `src/pages/RidePage.tsx`:
   - Setup state `const [showMsgWarning, setShowMsgWarning] = useState(false);`
   - In the booking request message textarea onChange, test the value against the comprehensive phone regex and update `showMsgWarning`.
   - Render the safety warning banner `{showMsgWarning && ...}` below the message field if `showMsgWarning` is true (displaying "Warning" and "নিরাপত্তা" based on language).

5. In `src/test/adversarial.test.tsx`:
   - Update `ADV-1`: expect `acceptError2` to be `null` (since double acceptance is a success no-op).
   - Update `ADV-2` and `ADV-3`: expect `msg.text` to not contain original phone and to contain `[HIDDEN]`.
   - Update `ADV-4`: expect `store.requestBooking` to throw: `expect(() => store.requestBooking(ride.id, 2, 'bkash')).toThrow();`.
   - Update `ADV-5`: expect `chatHeading` to be `null` / not in the document.

6. In `src/test/challenger.test.tsx`:
   - Update test 1 (Bangladeshi phone number regex censoring bypasses): Separate `cases` into `censored` and `uncensored` (words). Assert that `censored` cases contain `[HIDDEN]` and `uncensored` cases remain untouched.
   - Update test 2 (Booking request messages): Assert message is censored and contains `[HIDDEN]`.
   - Update test 3 (DeshPoints exploit): Assert that calling twice keeps points at 20 and rating count at 1.
   - Update test 4 (Overbooking): Assert that requestBooking throws for Passenger B.
   - Update test 5 (First-time driver validation bypass): Assert that saveRideDraft or createRide throws.
   - Update test 6 (Completed ride cancellation): Assert that cancelRide throws.
   - Update test 7 (Chat Authorization Bypass): Assert that `screen.queryByText(/Chatting with/i)` is not in the document, and `sendMessage` throws.

After making these changes:
- Run `npm run build` to confirm compilation.
- Run `npm run test` (or `npx vitest run`) to confirm that all 95 tests pass.
- Save reports and handoff to your folder. Send a message when done with the handoff path.
