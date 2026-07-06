# Test Infrastructure Specification

This document details the testing philosophy, feature coverage, testing architecture, and directory layout for the DeshRide React prototype.

## 1. Test Philosophy
- **Opaque-Box Testing**: All test suites are requirement-driven, verifying the application from the user's perspective rather than asserting on implementation details (such as React internal state or DOM structure specifics).
- **Offline-First & Local State Isolation**: State management in the prototype is backed by `localStorage` (via `src/lib/store.ts`). Tests run in a clean environment where `localStorage` is completely cleared before and after each test case to avoid side-effects.
- **Component & Integration testing**: Combining component rendering with mock state-layer verification to test the end-to-end user flows directly in the JS-DOM environment.

## 2. Feature Inventory (F1 - F7)
The testing suite covers 7 core features mapping directly to the application specifications:
- **F1: Booking Mode Selection**: Toggle between "Instant Book" and "Booking Request" options in the `PostRidePage` form, and save the selected value to the ride model in the store.
- **F2: Passenger Booking Flow Status Resolution**: When requesting a booking via `RidePage` and `store.ts`, check the ride's `instantBook` status:
  - If `true`, instantly set the booking status to `accepted` and payment status to `held`.
  - If `false`, set the booking status to `pending` and payment status to `unpaid`.
- **F3: Driver UI Approval Actions**: Drivers manage booking requests on `MyRidesPage` and can select `Accept` or `Decline` for pending bookings.
- **F4: Post-Acceptance Messaging Button Unlocking**: The "Message" action/button on both `MyRidesPage` (for drivers and passengers) and `RidePage` is disabled or hidden for pending bookings, and enabled (unlocked) only when the status transitions to `accepted`.
- **F5: In-App Messaging UI and Persistence**: Messaging interface (`ChatPage`) allows users to exchange texts. Messages are persisted via the mock store under `getMessages` and `sendMessage`.
- **F6: Phone Number Censoring**: A regex filter automatically redacts any Bangladeshi phone number pattern (e.g., `+8801XXXXXXXXX`, `01XXXXXXXXX`, `8801XXXXXXXXX` with spaces, hyphens, or parentheses) to `[HIDDEN]` in both message text and ride description notes.
- **F7: Safety Warning Banner/Alert Display**: A clear warning UI is displayed dynamically on both `PostRidePage` (when writing description notes) and `ChatPage` (when drafting a chat message) immediately upon detecting a Bangladeshi phone number format.

## 3. Architecture
- **Test Runner**: Vitest — A modern, blazing-fast unit and integration testing framework.
- **Environment**: JSDOM — Mock DOM environment representing the browser environment in Node.js.
- **State polyfill**: Custom `MockStorage` polyfilling the browser's `localStorage` on both `global` and `window` objects. This bypasses Node v25 native experimental `localStorage` shadowing issues.
- **Rendering & Queries**: `@testing-library/react` — Used to render components and query elements by user-visible attributes (e.g. `getByTestId`, `getByText`, `getByRole`).
- **Assertions**: `@testing-library/jest-dom` — Extends Vitest with matchers like `toBeInTheDocument()`, `toHaveTextContent()`, etc.

## 4. Directories
- `src/test/setup.ts`: Environment-level setup, custom localStorage polyfill, global scrollTo mock, and setup of test life-cycle cleanups.
- `src/test/sanity.test.tsx`: Sanity verification ensuring the React environment, Vitest, and testing library rendering compile and work correctly.
- `src/test/`: Contains the four testing tiers (Tier 1: Feature Coverage, Tier 2: Boundary & Corner Cases, Tier 3: Cross-Feature Combinations, Tier 4: Real-World Scenarios).
