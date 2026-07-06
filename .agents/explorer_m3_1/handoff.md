# Handoff Report — Milestone 3 (R2: Post-Acceptance Messaging)

## 1. Observation
- **Routes in App.tsx**: In `src/App.tsx`, routes are defined under a `<Routes>` component (lines 27-36). Currently, there is no route registered for `/chat/:bookingId` or any `ChatPage` component.
- **Message Types**: In `src/types.ts`, the `Message` interface is already defined on lines 90-97:
  ```typescript
  export interface Message {
    id: string;
    bookingId: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: string;
  }
  ```
- **Store Functions**: In `src/lib/store.ts`, the messaging state functions `getMessages` and `sendMessage` are already defined and save messages under the key `"deshride.messages.v1"` in local storage (lines 584-604).
- **RidePage Entry Points**: In `src/pages/RidePage.tsx`, passenger booking states are displayed on lines 199-237. There is currently no message link or button.
- **MyRidesPage Entry Points**: In `src/pages/MyRidesPage.tsx`, driver accepted bookings are listed on lines 130-160, and passenger bookings are listed on lines 228-305. There is currently no message link or button.
- **Test Executions**: Running `npm test` fails with 38 failures in total. Running only Tier 1 tests (`npx vitest run src/test/tier1.test.tsx`) fails specifically on:
  - `F4-2: Message button is enabled and visible for accepted bookings on MyRidesPage` (no button rendered).
  - `F4-5: Message button is enabled and visible for accepted bookings on RidePage` (no button rendered).
  - `F5-1`, `F5-4`, `F5-5` (ChatPage tests) fail because the `/chat/:bookingId` route and page do not exist.
  - `F7-3`, `F7-4`, `F7-5` (ChatPage warning banner tests) fail because the chat page input field is missing.

## 2. Logic Chain
- **Routing**: Since `App.tsx` defines all app screens using React Router v6, registering `<Route path="/chat/:bookingId" element={<ChatPage />} />` will map URLs like `/chat/bk-test-123` to the chat component, resolving `F5-1` routing failures.
- **UI Elements**: Placing a message button/link containing the text `"Message"` conditionally (only when `booking.status === "accepted"`) in:
  - `RidePage.tsx` inside the booking card (for passenger).
  - `MyRidesPage.tsx` inside the confirmed passenger item list (for driver).
  - `MyRidesPage.tsx` inside the `manage-card__actions` (for passenger).
  This resolves `F4-2` and `F4-5`. Because these buttons are omitted (evaluating to `null` in rendering) when the status is `"pending"` or `"declined"`, they will naturally satisfy `F4-1`, `F4-3`, and `F4-4` expectations of being hidden or disabled.
- **Data Layer Integration**: Since the store functions `getMessages` and `sendMessage` are already written and persist data to LocalStorage, the `ChatPage` component can use `useParams()` to extract the `bookingId`, fetch historical messages on mount, and call `sendMessage` on form submit. This resolves `F5-4` and `F5-5`.
- **Censoring and Warnings (Future Proofing)**: By checking if the input text matches `/(?:\+?88\s*0?1|01)\s*[3-9](?:\s*-?\s*\d){8}/` on each input change and setting a Boolean state `showWarning` to render a banner containing the words "Warning" and "নিরাপত্তা", we resolve `F7-3`, `F7-4`, and `F7-5`.

## 3. Caveats
- **Censoring Implementation**: The regex-based replacement of phone numbers (`[HIDDEN]`) inside `sendMessage` and `createRide` is a Milestone 4 feature and was not added to the code of the store. However, the logic and regex to be used have been provided in the `analysis.md` proposal to simplify integration.
- **Verification Assumptions**: Assumes the testing environment uses Vitest and Testing Library.

## 4. Conclusion
The implementation strategy is solid and requires three key additions: registering `/chat/:bookingId` in `src/App.tsx`, rendering `ChatPage.tsx` with warning banner state, and rendering message buttons on `RidePage` and `MyRidesPage` for accepted bookings. All files and dependencies are in place.

## 5. Verification Method
Run the following terminal command to run the Tier 1 tests:
```bash
npx vitest run src/test/tier1.test.tsx
```
Verify that:
- F4 (Post-Acceptance Messaging Button Unlocking) tests 1-5 all pass.
- F5 (In-App Messaging UI and Persistence) tests 1, 4, 5 pass (2 and 3 already pass as they test the store).
- F7 (Safety Warning Banner) tests 3, 4, 5 pass.
