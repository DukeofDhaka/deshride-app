# Project: Poparide-inspired Features for DeshRide React Prototype

## Architecture
- **State management**: LocalStorage-backed state managed via `src/lib/store.ts`.
- **Pages**:
  - `PostRidePage.tsx`: Driver ride creation.
  - `RidePage.tsx`: Passenger views details, requests booking.
  - `MyRidesPage.tsx`: Driver manages requests, passenger manages their bookings.
  - `ChatPage.tsx` (new): Conversation interface between driver and passenger.
- **Data structures**:
  - `Ride` is modified to optionally take driver-specified `instantBook: boolean`.
  - `Message` (new): `{ id: string; bookingId: string; senderId: string; senderName: string; text: string; createdAt: string; }`
  - Chat/messages are stored in LocalStorage under a new key.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Testing Track | Define test suite, setup test harness, write Tiers 1-4 tests | None | DONE |
| 2 | R1: Booking Mode Selection & Flow | Add "Instant Book" toggle in PostRidePage, update createRide, update requestBooking status handling, update driver/passenger UI | None | DONE |
| 3 | R2: Post-Acceptance Messaging | Implement ChatPage, update store with message functions, add "Message" buttons/links disabled when pending and enabled when accepted | R1 | DONE |
| 4 | R3: Contact Info Censoring & Warning | Implement regex-based Bangladeshi phone number censoring, display a strict safety warning UI for message inputs and driver notes | R2 | DONE |
| 5 | final: E2E Pass & Hardening | Run all E2E tests, resolve failures, run adversarial testing, verify layout | M1, M2, M3, M4 | DONE |

## Interface Contracts
### `src/lib/store.ts` updates
- `createRide(input: NewRide & { instantBook: boolean })`: Save the selected instantBook value.
- `requestBooking(rideId: string, seats: number, payMethod: PaymentMethodId, message?: string)`: Check `ride.instantBook` to set status immediately to `"accepted"` (and `payStatus` to `"held"`) or `"pending"` (and `payStatus` to `"unpaid"`).
- `getMessages(bookingId: string): Message[]`: Retrieve messages for a booking.
- `sendMessage(bookingId: string, text: string): Message`: Add a message to a booking, applying phone number censoring.
- Regex for Bangladeshi phone numbers: Need to match common Bangladeshi phone formats (e.g. `+8801XXXXXXXXX`, `01XXXXXXXXX`, `8801XXXXXXXXX`, with possible spaces, hyphens, parentheses).

## Code Layout
- `src/types.ts`: Update types for `Ride`, `Booking`, and define `Message`.
- `src/lib/store.ts`: Add chat message APIs, modify ride creation and booking logic.
- `src/pages/PostRidePage.tsx`: Add "Instant Book" toggle.
- `src/pages/RidePage.tsx`: Display message buttons appropriately.
- `src/pages/MyRidesPage.tsx`: Add chat button/link for both passenger and driver on accepted rides.
- `src/pages/ChatPage.tsx` (new): Chat interface.
- `src/App.tsx`: Register `/chat/:bookingId` route.
- `src/i18n.tsx`: Add translations for new features (English & Bengali).
