# Original User Request

## Initial Request — 2026-07-06T03:53:11Z

Build Poparide-inspired features into the DeshRide React prototype: specifically, Booking Request vs. Instant Book flows, and a post-acceptance In-App Messaging system with automated phone number censoring and safety warnings to keep users on-platform.

Working directory: `/Users/dukez/Documents/Amr DeshRide`
Integrity mode: development

## Requirements

### R1. Booking Mode Selection & Flow
When a driver posts a ride, they must choose between "Instant Book" (auto-accepts passengers) or "Booking Request" (manual approval). The passenger booking flow must respect this setting: instantly setting the booking status to "Accepted" or putting it in "Pending" for the driver to review. All backend state should be mocked using the existing `store.ts` (LocalStorage).

### R2. Post-Acceptance Messaging
Implement an In-App Messaging UI between the driver and the passenger. The messaging interface must ONLY be accessible (unlocked) after a booking's status changes to "Accepted". All messages should be persisted in the mock `store.ts`.

### R3. Contact Information Censoring & Safety Warning
Implement a strict censoring mechanism (regex filtering) applied to the new In-App Messaging system and driver ride notes. 
If a user attempts to share a Bangladeshi phone number, the system must:
1. Redact the number (replace it with `[HIDDEN]`) but let the rest of the message send.
2. Display a strict warning banner or alert to the user stating that communicating outside the app leads to serious authenticity violations and compromises their safety with unknown/unapproved users.

## Acceptance Criteria

### R1. Booking Flow
- [ ] In the Post Ride form, drivers can toggle "Instant Book" on/off.
- [ ] If a passenger books an "Instant Book" ride, their booking appears as "Accepted" immediately.
- [ ] If "Instant Book" is off, the booking appears as "Pending", and the driver UI allows them to "Accept" or "Decline".

### R2. Messaging Unlocking
- [ ] The "Message" button is hidden or disabled for both driver and passenger while a booking is "Pending".
- [ ] Once "Accepted", both parties can open a chat interface and send text messages to each other.

### R3. Number Censoring & Warning
- [ ] Typing a Bangladeshi phone number format into a message or ride description automatically redacts it (e.g., `[HIDDEN]`) before saving/sending.
- [ ] A visible warning UI appears immediately upon detecting the phone number, explaining the safety risks of off-platform communication.
