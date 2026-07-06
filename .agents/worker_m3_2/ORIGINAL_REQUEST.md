## 2026-07-06T13:43:04Z
You are teamwork_preview_worker.
Your working directory is /Users/dukez/Documents/Amr DeshRide/.agents/worker_m3_2.
Your task is to implement all features and UI for Milestone 3 (R2: Post-Acceptance Messaging) and Milestone 4 (R3: Contact Info Censoring & Warning) in the codebase.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please implement the following:

1. In `src/lib/store.ts`:
   - Implement `censorPhoneNumbers(text: string): string` using the regex:
     `/(?:\+?88\s*0?1|01|\(?\+?88\)?\s*0?1)\s*[3-9](?:\s*[-()]*\s*\d){8}/g`
     It must redact matched phone numbers with the exact replacement `[HIDDEN]`.
   - In `createRide`, apply `censorPhoneNumbers` to `input.note` (if present) before constructing and saving the ride:
     `note: input.note ? censorPhoneNumbers(input.note) : undefined`
   - In `sendMessage`, apply `censorPhoneNumbers` to `text` before saving the message to localStorage:
     `text: censorPhoneNumbers(text)`

2. In `src/pages/PostRidePage.tsx`:
   - Setup state for checking phone numbers in the note: `const [showWarning, setShowWarning] = useState(false);`
   - In the `note` textarea onChange handler, test the input value with the phone regex:
     `const phoneRegex = /(?:\+?88\s*0?1|01|\(?\+?88\)?\s*0?1)\s*[3-9](?:\s*[-()]*\s*\d){8}/;`
     Update `showWarning` depending on whether a phone number was detected.
   - Render a safety warning banner when `showWarning` is true. The banner must display warning text containing "Warning" (English) and "নিরাপত্তা" (Bengali) depending on current language selection. Place the banner appropriately (e.g. above/below the notes field).

3. In `src/pages/MyRidesPage.tsx`:
   - In the driver's driving section (where confirmed accepted bookings list is rendered):
     - Show a "Message" link/button pointing to `/chat/${b.id}` if `ride.status !== "completed"`. Pending or declined requests must not show this link.
   - In the passenger's riding section (where active requested bookings card actions are rendered):
     - Show a "Message" link/button pointing to `/chat/${booking.id}` only when `booking.status === "accepted"` and `ride.status !== "completed"`.

4. In `src/pages/RidePage.tsx`:
   - In the passenger's ride status card, display a "Message" button/link pointing to `/chat/${myBooking.id}` only when `myBooking.status === "accepted"` and `ride.status !== "completed"`.

5. Create `src/pages/ChatPage.tsx`:
   - Implement the message feed loading existing messages for `bookingId` from the store using `getMessages(bookingId)`.
   - Check if `booking.status === "accepted"`. If not (e.g. pending, declined, cancelled, or booking not found), block access. The Chat header and text input must NOT be rendered.
   - Input field: type="text", placeholder contains "message".
   - Send button: type="submit", button text/label matches `/send/i`.
   - Input onChange: check the typed text against the phone regex. If a phone number is detected, render the warning banner containing "Warning" / "নিরাপত্তা". Hide it when the number is deleted or message is sent.
   - Prevent sending empty or whitespace-only messages.
   - Make sure multiple rapid clicks on Send button do not create duplicate messages.

6. In `src/App.tsx`:
   - Import `ChatPage` and register route `<Route path="/chat/:bookingId" element={<ChatPage />} />`.

Verification:
- Run `npm run build` to verify compilation.
- Run `npm run test` to verify Vitest tests.
- Save your build/test report to `/Users/dukez/Documents/Amr DeshRide/.agents/worker_m3_2/test_report.md` and handoff report to `/Users/dukez/Documents/Amr DeshRide/.agents/worker_m3_2/handoff.md`.
- Send a message when done with the path to the handoff.
