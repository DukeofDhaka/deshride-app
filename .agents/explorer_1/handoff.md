# Handoff Report: Test Infrastructure & Codebase Analysis

## 1. Observation
- **Testing Tools Compatibility**:
  - Run `npm install --dry-run vitest jsdom` succeeded with output:
    > `added 75 packages, and changed 2 packages in 9s`
  - Run `npm install --dry-run @testing-library/react @testing-library/dom` succeeded with output:
    > `added 11 packages in 3s`
  - Node version checked via `node -v` is `v25.6.1`.
- **Codebase State**:
  - State management uses `localStorage` wrapper in `src/lib/store.ts` (e.g. `load`, `save`, `uid` helper).
  - Types are declared in `src/types.ts`.
  - Component list includes: `Header.tsx`, `LocationPicker.tsx`, `RideCard.tsx`.
  - Page list includes: `PostRidePage.tsx`, `RidePage.tsx`, `MyRidesPage.tsx`, `DriverOnboardingPage.tsx`, etc.
  - Router uses `react-router-dom` in `src/App.tsx`.
- **Feature Mapping (F1 to F7)**:
  - **F1: Booking Mode selection**: Toggle must be added in `src/pages/PostRidePage.tsx` and saved via `createRide` / `saveRideDraft` in `src/lib/store.ts`.
  - **F2: Passenger Booking Flow status resolution**: Checked inside `requestBooking` in `src/lib/store.ts` which already defaults status using `instant = Boolean(getRide(rideId)?.instantBook)`.
  - **F3: Driver UI approval actions**: Implemented inside `src/pages/MyRidesPage.tsx` (`handleDecision` calling `updateBookingStatus` in `src/lib/store.ts`).
  - **F4: Post-Acceptance messaging button unlocking**: Needs to be implemented in `src/pages/MyRidesPage.tsx` (for both driving and riding lists) and `src/pages/RidePage.tsx` (when `myBooking` is defined).
  - **F5: In-App Messaging UI and persistence**: Requires creating `src/pages/ChatPage.tsx` and registering it in `src/App.tsx`. Needs new store functions (`getMessages`, `sendMessage`) and a `Message` type in `src/types.ts`.
  - **F6: Phone Number Censoring**: Needs regex censor function in `src/lib/store.ts` applied during message and ride creation.
  - **F7: Safety Warning Banner/Alert display**: Needs dynamic state banner checking input string match in `PostRidePage` (note field) and `ChatPage` (message input).

## 2. Logic Chain
1. *Observation 1 & 2*: Node v25.6.1 is installed, and the package manager can query and dry-run install packages (`vitest`, `jsdom`, `@testing-library/react`). This proves the npm registry is fully accessible and installing these packages will succeed.
2. *Observation 3*: The project is a standard Vite React application using TypeScript, where JSX/TSX elements must be transpiled.
3. *Observation 4*: Native `node:test` can run tests, but running component-level React test files in TSX requires configuring a separate transpilation layer (like ts-node/tsx/esbuild) and manually mocking JSDOM globals.
4. *Observation 5*: Vitest integrates out-of-the-box with `vite.config.ts`, directly reusing the existing React bundler and TypeScript configurations. It automatically spins up jsdom when `environment: 'jsdom'` is specified.
5. *Conclusion*: Setting up Vitest with JSDOM and React Testing Library is the most robust and standard approach, with the least integration overhead.

## 3. Caveats
- No changes to `package.json` or source files were made during this analysis step to respect the read-only investigation rule.
- No real browser/E2E runner (like Playwright/Cypress) is needed since all state is local-first (`localStorage`) and can be tested cleanly inside jsdom at the integration/component level.

## 4. Conclusion
We recommend using **Vitest** + **jsdom** + **React Testing Library** for the test infrastructure.
To configure this:
1. Update `package.json` to add devDependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`.
2. Configure `"test": "vitest run"` and `"test:watch": "vitest"` scripts in `package.json`.
3. Modify `vite.config.ts` to include:
   ```typescript
   test: {
     globals: true,
     environment: "jsdom",
     setupFiles: "./src/test/setup.ts"
   }
   ```
4. Create `src/test/setup.ts` to mock `window.scrollTo = () => {}` and clear `localStorage` between test runs.

## 5. Verification Method
1. Run `npm install -D vitest jsdom @testing-library/react @testing-library/dom` to install the suggested packages.
2. Add a simple test file (e.g. `src/test/sanity.test.tsx`) asserting that a React component renders.
3. Run `npm run test` or `npx vitest run` to verify that Vitest initializes, compiles TSX, sets up the jsdom environment, and successfully executes the test.
