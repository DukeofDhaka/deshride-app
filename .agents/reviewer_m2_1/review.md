# Quality Review Report — Milestone 2

## Review Summary

**Verdict**: REQUEST_CHANGES

The code changes made for Milestone 2 (R1: Booking Mode Selection & Flow) correctly implement the core functional requirements. The driver toggle is successfully added, the booking flow correctly distinguishes between instant booking and request-based booking, and the translations and buttons have been updated appropriately. 

However, the build fails due to typescript errors in the newly added test configuration (`vite.config.ts`) and test file (`src/test/sanity.test.tsx`). We must request changes to resolve these typescript issues so that `npm run build` compiles successfully.

---

## Findings

### [Major] Finding 1: Compilation Failure in `vite.config.ts`

- **What**: TypeScript compilation (`tsc -b`) fails on `vite.config.ts` because the `test` option is not recognized on the configuration object.
- **Where**: `vite.config.ts` (line 8)
- **Why**: The `defineConfig` utility is imported from `'vite'`, which does not type the `test` property (used by Vitest) by default.
- **Suggestion**: Import `defineConfig` from `'vitest/config'` instead of `'vite'` in `vite.config.ts`.
  ```typescript
  import { defineConfig } from "vitest/config";
  ```

### [Major] Finding 2: Unused Import in `sanity.test.tsx`

- **What**: TypeScript compiler throws error `TS6133: 'React' is declared but its value is never read.`
- **Where**: `src/test/sanity.test.tsx` (line 1)
- **Why**: The project typescript configuration (`tsconfig.app.json`) has `"noUnusedLocals": true` enabled. Since React 17+ uses the new JSX transform (which does not require React to be in scope), the unused React import causes a compile failure.
- **Suggestion**: Remove `import React from 'react';` from `src/test/sanity.test.tsx`.

---

## Verified Claims

- **Instant Book Toggle in PostRidePage** → verified via code inspection of `src/pages/PostRidePage.tsx` → **PASS**
  - Checkbox state is initialized based on whether the driver has unlocked instant book (`instantBookUnlocked()`).
  - Progress information is displayed correctly to locked drivers.
  - The `instantBook` value is correctly populated in `rideInput` and sent to both `createRide` and `saveRideDraft`.
- **Instant Book Flag Handling in Store** → verified via code inspection of `src/lib/store.ts` → **PASS**
  - `createRide` verifies that the driver has unlocked the feature before saving `instantBook: true`.
  - `requestBooking` successfully resolves `instantBook` status on the ride to automatically transition bookings to `accepted`/`held` or `pending`/`unpaid`.
- **Accept/Decline Translations & UI** → verified via code inspection of `src/pages/MyRidesPage.tsx` and `src/i18n.tsx` → **PASS**
  - Translation keys for shorter `accept` and updated `decline` are fully set up in both Bengali and English.
  - Driver actions in `MyRidesPage.tsx` correctly show the shorter `accept` button.
- **Vitest Execution** → verified via running `npm test` → **PASS**
  - The test suite successfully starts and all tests pass.

---

## Coverage Gaps

- None. The changes cover all key touchpoints required for the booking mode flow.

---

## Unverified Items

- None. All modified files were analyzed, inspected, and verified locally.

---

# Adversarial Challenge Report

## Challenge Summary

**Overall risk assessment**: LOW

The proposed flow is logically complete and works cleanly within the existing structure. No major security, logic, or performance flaws were discovered.

---

## Challenges

### [Low] Challenge 1: Draft Persistance for Uncompleted Profiles

- **Assumption challenged**: If a driver without a completed driver profile posts a ride with `instantBook: true` (if somehow possible), the option is saved and restored correctly.
- **Attack scenario**: A driver bypasses front-end checks to set `instantBook` in their draft.
- **Blast radius**: None.
- **Mitigation**: `createRide` strictly calls `instantBookUnlocked() ? ... : false`. Since a first-time driver cannot have filled any seats yet, `instantBookUnlocked()` will return `false`, coercing any malicious or invalid `instantBook` value to `false`.

### [Low] Challenge 2: Return Ride Booking Mode Synchronization

- **Assumption challenged**: If the driver chooses Instant Book for the outbound trip, they also want it for the return trip.
- **Attack scenario**: A driver wants Instant Book for one leg but manual confirmation for the other.
- **Blast radius**: Outbound and return rides share the same toggle status.
- **Mitigation**: Currently, the UI creates the return ride using the exact same configuration as the outbound ride. This is standard behavior across the app for all other settings (luggage, rules, etc.) and is acceptable.
