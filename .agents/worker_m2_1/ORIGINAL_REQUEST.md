## 2026-07-05T23:55:43-04:00

You are teamwork_preview_worker.
Your working directory is /Users/dukez/Documents/Amr DeshRide/.agents/worker_m2_1.
Your task is to implement Milestone 2 (R1: Booking Mode Selection & Flow) in the codebase.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please implement the following changes based on the exploration findings:
1. In `src/lib/store.ts`:
   - Add `instantBook?: boolean;` to the `NewRide` interface.
   - Modify `createRide` to initialize the ride's `instantBook` property: `instantBook: instantBookUnlocked() ? (input.instantBook ?? false) : false`.
2. In `src/pages/PostRidePage.tsx`:
   - Import `instantBookUnlocked`, `getStats`, and `INSTANT_BOOK_SEATS` from `../lib/store`.
   - Setup a state variable `instantBook` initialized to `hasInstantBookUnlock` (which is `instantBookUnlocked()`).
   - Add an Instant Book checkbox toggle in the form above the return trip checkbox.
     - Toggle should be checked if `instantBook` is true, disabled if `!hasInstantBookUnlock`.
     - Label text: `{t("instantBook")}`
     - Under the label, show the hint: `{t("instantBookHint")}`. If `!hasInstantBookUnlock`, also display `{t("instantProgress")}: {getStats().seatsFilled}/{INSTANT_BOOK_SEATS}`.
   - Pass `instantBook` inside the new ride object to `createRide` and `saveRideDraft` inside `handleSubmit`.
3. In `src/pages/MyRidesPage.tsx`:
   - Change the button text label for accepting a request from `{t("acceptEscrow")}` to `{t("accept")}`.
4. In `src/i18n.tsx`:
   - In the Bengali translations dictionary:
     - Add `accept: 'গ্রহণ করুন',`
     - Change `decline` value from `'না'` to `'প্রত্যাখ্যান করুন',`
   - In the English translations dictionary:
     - Add `accept: 'Accept',`
     - Change `decline` value from `'No'` to `'Decline',`

Verification instructions:
- Run `npm run build` to verify that there are no compilation/build errors.
- Do NOT run tests as there is no test runner in this repository yet (the E2E Testing Track will build it later).
- Save a report of the build execution to `/Users/dukez/Documents/Amr DeshRide/.agents/worker_m2_1/build_report.md` and write a handoff report at `/Users/dukez/Documents/Amr DeshRide/.agents/worker_m2_1/handoff.md`.
- Send a message when done with the path to the handoff.
