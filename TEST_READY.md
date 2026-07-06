# Test Suite Readiness Report (TEST_READY)

This document provides a summary of the implemented end-to-end (E2E) test suite for the DeshRide prototype application, detailing the runner, coverage counts, and a complete registry of the 82 test cases across 4 testing tiers.

## 1. Test Runner Command
To execute the test suite, run:
```bash
npm run test
```

## 2. Test Count and Coverage Summary
- **Total Test Cases**: 82
- **Tier 1 (Feature Coverage)**: 35 tests (5 per feature F1 - F7)
- **Tier 2 (Boundary & Corner Cases)**: 35 tests (5 per feature F1 - F7)
- **Tier 3 (Cross-Feature Combinations)**: 7 tests
- **Tier 4 (Real-World Application Scenarios)**: 5 tests
- **Target Feature Sets Covered**: F1, F2, F3, F4, F5, F6, F7

## 3. Feature Checklist & Coverage Mapping
- [x] **F1: Booking Mode Selection** (10 test cases total in T1 & T2)
- [x] **F2: Passenger Booking Flow Status Resolution** (10 test cases total in T1 & T2)
- [x] **F3: Driver UI Approval Actions** (10 test cases total in T1 & T2)
- [x] **F4: Post-Acceptance Messaging Button Unlocking** (10 test cases total in T1 & T2)
- [x] **F5: In-App Messaging UI and Persistence** (10 test cases total in T1 & T2)
- [x] **F6: Phone Number Censoring** (10 test cases total in T1 & T2)
- [x] **F7: Safety Warning Banner/Alert Display** (10 test cases total in T1 & T2)
- [x] **Tier 3: Cross-Feature Combinations** (7 test cases total)
- [x] **Tier 4: Real-World Scenarios** (5 test cases total)

---

## 4. Complete Test Case Registry

### Tier 1: Feature Coverage (35 Tests)
#### Feature 1: Booking Mode Selection
1. **F1-1: PostRidePage renders Instant Book toggle and label** - Verifies that the PostRidePage form correctly displays the checkbox/toggle and descriptive label for Instant Book.
2. **F1-2: PostRidePage disables Instant Book toggle when driver is new (seatsFilled < 5)** - Ensures that the Instant Book toggle is disabled for new drivers who have not filled at least 5 seats.
3. **F1-3: PostRidePage enables Instant Book toggle when driver is experienced (seatsFilled >= 5)** - Verifies that the Instant Book toggle is enabled for experienced drivers who have filled 5 or more seats.
4. **F1-4: PostRidePage saves instantBook as true in ride model when checked** - Ensures that the created ride record has the `instantBook` field set to true when the option is checked.
5. **F1-5: PostRidePage saves instantBook as false in ride model when unchecked** - Ensures that the created ride record has the `instantBook` field set to false when the option is unchecked.

#### Feature 2: Passenger Booking Flow Status Resolution
6. **F2-1: requestBooking sets status to accepted and payStatus to held for instantBook rides** - Verifies that booking an Instant Book ride immediately sets the booking status to `accepted` and the escrow payment status to `held`.
7. **F2-2: requestBooking sets status to pending and payStatus to unpaid for non-instantBook rides** - Verifies that booking a request-only ride sets the booking status to `pending` and the payment status to `unpaid`.
8. **F2-3: Passenger booking flow displays "Confirmed — you're in" immediately on RidePage for instantBook rides** - Ensures that the passenger UI displays a confirmation message immediately after booking an Instant Book ride.
9. **F2-4: Passenger booking flow displays "Waiting for driver" on RidePage for non-instantBook rides** - Ensures that the passenger UI displays a waiting status message after booking a request-only ride.
10. **F2-5: Escrow payment details are shown under status based on instantBook setting** - Verifies that the passenger UI displays clear information about payment escrow hold or pending status depending on the booking type.

#### Feature 3: Driver UI Approval Actions
11. **F3-1: Driver sees accept and decline buttons for pending requests on MyRidesPage** - Verifies that the driver's MyRidesPage displays the approval action buttons for pending booking requests.
12. **F3-2: Driver click accept updates booking status to accepted and payStatus to held** - Ensures that clicking "Accept" updates the booking status to `accepted` and transitions the payment status to `held` in escrow.
13. **F3-3: Driver click decline updates booking status to declined** - Ensures that clicking "Decline" updates the booking status to `declined` in storage.
14. **F3-4: Driver cannot accept request if there are not enough seats remaining** - Verifies that the driver is blocked (with an error message) from accepting a booking request if the requested seats exceed the ride's remaining capacity.
15. **F3-5: Driver MyRidesPage updates seats left dynamically after accepting a booking** - Ensures that the remaining seat count for a ride updates dynamically in the store and UI upon booking acceptance.

#### Feature 4: Post-Acceptance Messaging Button Unlocking
16. **F4-1: Message button is hidden or disabled for pending bookings on MyRidesPage** - Verifies that the chat button is locked (hidden or disabled) for pending requests on the driver dashboard.
17. **F4-2: Message button is enabled and visible for accepted bookings on MyRidesPage** - Verifies that the chat button is unlocked and functional for accepted bookings on the driver dashboard.
18. **F4-3: Message button is hidden or disabled for declined bookings on MyRidesPage** - Ensures that the chat button is locked for declined requests on the driver dashboard.
19. **F4-4: Message button is hidden or disabled for pending bookings on RidePage** - Ensures that the chat button is locked for pending requests on the passenger's ride page.
20. **F4-5: Message button is enabled and visible for accepted bookings on RidePage** - Ensures that the chat button is unlocked and functional for accepted bookings on the passenger's ride page.

#### Feature 5: In-App Messaging UI and Persistence
21. **F5-1: ChatPage renders message input field and send button** - Verifies that the conversation UI includes a text input field and a submit/send button.
22. **F5-2: sendMessage persists message correctly in store** - Ensures that sent messages are correctly written to local storage under the messages key.
23. **F5-3: getMessages retrieves correct messages for specific bookingId** - Ensures that the store query retrieves only the message history associated with the specific booking ID.
24. **F5-4: ChatPage renders sent and received messages correctly** - Verifies that the chat thread displays the message contents accurately in the UI.
25. **F5-5: Messages are loaded from store on ChatPage initialization** - Ensures that the chat page loads and displays existing message history when opened.

#### Feature 6: Phone Number Censoring
26. **F6-1: store.sendMessage censors +88017xxxxxxxx phone number in chat message** - Verifies that a standard Bangladeshi mobile number with international country code is redacted to `[HIDDEN]` in chat messages.
27. **F6-2: store.sendMessage censors 018xxxxxxxx phone number in chat message** - Verifies that a standard local 11-digit Bangladeshi phone number is redacted to `[HIDDEN]` in chat messages.
28. **F6-3: store.sendMessage censors 88019xxxxxxxx phone number in chat message** - Verifies that a Bangladeshi phone number with local country prefix (no plus sign) is redacted to `[HIDDEN]` in chat messages.
29. **F6-4: store.createRide censors Bangladeshi phone number in driver description notes** - Ensures that any Bangladeshi phone number written in the ride description notes is redacted to `[HIDDEN]` when the ride is created.
30. **F6-5: Phone number censoring works for numbers containing spaces and hyphens** - Verifies that the regex filter detects and redacts phone numbers even when formatted with spaces or hyphens.

#### Feature 7: Safety Warning Banner/Alert Display
31. **F7-1: PostRidePage notes input triggers warning banner when phone number is typed** - Ensures that a safety banner warning appears dynamically as soon as a Bangladeshi phone number format is entered in the ride note field.
32. **F7-2: PostRidePage notes input removes warning banner when phone number is deleted** - Ensures that the safety banner disappears if the user deletes the phone number from the ride note field.
33. **F7-3: ChatPage message input triggers warning banner when phone number is typed** - Ensures that a safety warning banner appears dynamically as the user drafts a chat message containing a phone number format.
34. **F7-4: ChatPage message input removes warning banner when phone number is deleted** - Ensures that the safety warning banner disappears if the user deletes the phone number from the message draft.
35. **F7-5: Warning banner displays specific localization text warning against sharing contact info** - Verifies that the safety banner displays the translated warning message (English/Bengali) instructing users to avoid off-platform contact.

---

### Tier 2: Boundary & Corner Cases (35 Tests)
#### Feature 1: Booking Mode Selection
36. **F2-B1: Toggle state persists when switching languages back and forth in PostRidePage** - Ensures that checking the Instant Book option remains checked even if the user switches languages mid-form.
37. **F2-B2: Instant Book checkbox is unchecked by default for a clean session** - Ensures that the Instant Book option is not checked by default, requiring explicit action.
38. **F2-B3: PostRidePage validation handles instantBook toggle without crashing when other inputs are invalid** - Verifies that toggling Instant Book does not interfere with normal form validation and error displays.
39. **F2-B4: Driver profile NID verification prevents publishing ride regardless of instantBook toggle state** - Ensures that NID onboarding requirements are strictly enforced for new drivers regardless of the toggle status.
40. **F2-B5: Instant Book checkbox status is preserved in draft when driver is redirected to onboarding** - Verifies that the Instant Book selection is preserved in the ride draft when the driver is sent to complete onboarding.

#### Feature 2: Passenger Booking Flow Status Resolution
41. **F2-B6: Booking request with zero seats is rejected** - Ensures that requesting 0 seats raises a validation error or throws.
42. **F2-B7: Booking request for seats exceeding available capacity is capped or rejected** - Ensures that requesting more seats than are available is blocked.
43. **F2-B8: Booking with payment method Cash/bKash/Nagad resolves correct escrow state for instantBook** - Verifies that all valid payment methods correctly resolve to the `held` state when booking an Instant Book ride.
44. **F2-B9: Cancel booking before acceptance refunds the correct fare percentage (100%)** - Ensures that cancelling a pending request refunds the full amount (resolving payment status back to unpaid/refunded).
45. **F2-B10: Cancel booking after instant acceptance handles refund policy based on departure times** - Verifies that cancellation of an instantly accepted booking calculates refunds correctly based on departure time constraints (e.g. 100% refund outside 24h).

#### Feature 3: Driver UI Approval Actions
46. **F2-B11: Driver accepting a booking that exactly fills remaining seats succeeds and disables further bookings** - Verifies that a booking request filling the last seat succeeds and updates remaining capacity to 0.
47. **F2-B12: Driver cannot decline an already accepted booking** - Ensures that the driver cannot decline a booking request after it has already been accepted.
48. **F2-B13: Multiple pending bookings can be resolved independently without state leakage** - Ensures that accepting or declining one request does not affect other pending requests for the same ride.
49. **F2-B14: Driver cannot accept booking for a cancelled ride** - Ensures that booking approvals are blocked if the ride has been cancelled by the driver.
50. **F2-B15: Driver attempting to accept a declined booking returns error or fails gracefully** - Ensures that a driver cannot accept a request that was previously declined.

#### Feature 4: Post-Acceptance Messaging Button Unlocking
51. **F2-B16: Message button state updates instantly when driver accepts booking without requiring reload** - Ensures that the message button unlocks immediately in the DOM without requiring a manual page refresh.
52. **F2-B17: Message button is hidden for guest when booking is cancelled by guest** - Verifies that the message button is locked/hidden if the booking is cancelled by the passenger.
53. **F2-B18: Message button is hidden for driver when ride is cancelled by driver** - Verifies that the message button is locked/hidden if the ride is cancelled by the driver.
54. **F2-B19: Message button is hidden on completion of ride (tripDone)** - Ensures that the messaging channel is locked once the trip is marked completed.
55. **F2-B20: Messaging link is inaccessible via direct routing if booking status is declined** - Ensures that trying to access `/chat/:bookingId` directly via the URL is blocked if the booking status is not `accepted`.

#### Feature 5: In-App Messaging UI and Persistence
56. **F2-B21: Sending an empty or whitespace-only message is blocked in ChatPage** - Ensures that sending empty or blank messages is prevented in the UI and store.
57. **F2-B22: Sending extremely long text message does not crash UI and wraps correctly** - Verifies that sending very long strings does not break layout or cause rendering crashes.
58. **F2-B23: Multiple rapid clicks on send button do not create duplicate messages** - Verifies that the send action is throttled or disabled during transmission to prevent duplicate messages.
59. **F2-B24: Messages from passenger and driver are styled differently (sent vs received)** - Ensures that message bubbles use correct CSS classes and alignment based on whether they are sent or received.
60. **F2-B25: Storage isolation ensures messages from other bookings do not render on ChatPage** - Ensures that messages from another booking cannot leak into the current conversation interface.

#### Feature 6: Phone Number Censoring
61. **F2-B26: Bangladeshi numbers in non-standard formats (e.g. (+88) 017-12345678) are censored** - Ensures that phone number variations with parentheses and non-standard spacing are censored.
62. **F2-B27: Multiple phone numbers in a single message are all individually censored** - Ensures that all phone numbers within a single block of text are individually redacted.
63. **F2-B28: Numbers that look similar to phone numbers but aren't (e.g., prices like 17000 Tk, or dates like 01-08-2026) are NOT censored** - Verifies that price tags, dates, and other long numbers are not incorrectly flagged and censored.
64. **F2-B29: Phone number censoring is case-insensitive and ignores surrounding punctuation** - Ensures that phone numbers adjacent to punctuation marks are successfully censored.
65. **F2-B30: Censored phone number text displays exactly [HIDDEN] replacement** - Verifies that the exact string `[HIDDEN]` replaces the censored numbers.

#### Feature 7: Safety Warning Banner/Alert Display
66. **F2-B31: Safety warning does not trigger for valid non-phone text sequences** - Ensures that typing regular descriptive text does not show the safety warning banner.
67. **F2-B32: Warning banner is responsive and fits mobile layouts on PostRidePage and ChatPage** - Ensures that the warning banner scales properly on mobile viewports.
68. **F7-B33: Warning banner displays correct translated language on language toggle** - Ensures that the warning banner text translates instantly when toggling the application language.
69. **F7-B34: Warning banner displays immediately on keydown before form submission** - Ensures the warning is shown dynamically as the user types, not just after clicking submit.
70. **F7-B35: Typing a phone number, deleting it, then typing it again correctly toggles the warning banner visibility** - Ensures that the banner's visibility changes state reliably based on current text content.

---

### Tier 3: Cross-Feature Combinations (7 Tests)
71. **F3-C1: Instant Book ride booking request results in accepted status, opens chat route, and enables message buttons instantly** - Integrates Instant Book selection, status resolution to `accepted`, and instant unlocking of communication routes.
72. **F3-C2: Non-instant Book ride request requires driver approval, message button is locked, and turns unlocked only after driver click accept** - Integrates approval requirement, `pending` status logic, driver manual click UI, and message route activation.
73. **F3-C3: Censored phone number in driver notes triggers warning on PostRidePage and is persisted as censored in store** - Integrates phone validation, dynamic warning rendering, and backend censoring for ride description fields.
74. **F3-C4: Phone number typed in ChatPage input triggers warning banner, and upon sending is saved in store in censored format** - Integrates phone validation, dynamic warning rendering, and message text censoring.
75. **F3-C5: Passenger books instant ride, driver completes ride, payment releases, message button is disabled, and chat history is preserved** - Integrates booking flow, completion flow, escrow release, messaging lock, and chat history persistence.
76. **F3-C6: Non-instant Book ride gets booking request, guest cancels request, status goes to cancelled, and message button remains locked** - Integrates non-instant booking, guest cancellation, status updates, and messaging lock.
77. **F3-C7: Driver gets multiple booking requests, accepts one filling the ride, declines the other, and chat button is unlocked only for the accepted passenger** - Integrates seat allocation, dual-booking handling, and selective messaging unlocking.

---

### Tier 4: Real-World Scenarios (5 Tests)
78. **F4-S1: Full Driver-Passenger Carpooling Lifecycle** - Simulates the complete user flow from experienced driver posting an Instant Book ride, passenger searching and booking it, instant acceptance and escrow hold, coordination via chat, trip completion, and payment release with driver rating.
79. **F4-S2: Booking Approval & Coordination Lifecycle** - Simulates the flow of a passenger booking a request-only ride, driver reviewing and accepting it, chat coordination, and passenger cancelling due to plan changes 48 hours before departure (calculating a full refund).
80. **F4-S3: Safety Violation Prevention Flow** - Simulates a passenger typing a contact phone number in a message input, triggering the safety warning banner, sending it, and verifying that the phone number is redacted to `[HIDDEN]` so the driver cannot see off-platform contact info.
81. **F4-S4: Multiple Passenger Seat Allocation Flow** - Simulates a driver posting a 3-seat ride, Passenger A requesting 2 seats, Passenger B requesting 2 seats (getting a seatsLeft validation error), and Passenger A being accepted, reducing seat availability correctly.
82. **F4-S5: Escalated Cancellation Escalation Lifecycle** - Simulates a booking that is accepted and coordinated via chat, but cancelled by the passenger 12 hours before departure, triggering a 50% refund held policy.
