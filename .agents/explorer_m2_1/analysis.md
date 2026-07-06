# Milestone 2: Booking Mode Selection & Flow Analysis

This report outlines the codebase exploration and the proposed implementation strategy for Milestone 2 (R1: Booking Mode Selection & Flow).

---

## 1. Executive Summary

Milestone 2 aims to give drivers control over how ride bookings are handled. Currently, the system determines the `instantBook` status of a ride solely by checking the driver's global reputation (i.e., whether they have filled at least 5 seats, defined by `instantBookUnlocked()`). 

To achieve Milestone 2, we will:
1. **Types and Store Updates**: Allow `NewRide` input to optionally include an `instantBook` boolean, which will be stored on creation if the driver has unlocked it. If not unlocked, it defaults to `false`.
2. **Post Ride Form Update**: Introduce an "Instant Book" checkbox toggle in `PostRidePage.tsx` that is enabled only if `instantBookUnlocked()` is true. If locked, a message shows the progress towards unlocking it (using existing translation keys).
3. **Passenger Booking updates**: Ensure `requestBooking` properly handles instant-book status. If true, booking is automatically `"accepted"` and payStatus `"held"`. If false, booking is `"pending"` and payStatus `"unpaid"`.
4. **Driver UI update**: Show clean "Accept" and "Decline" buttons in the pending requests list for manual confirmation of pending requests.
5. **i18n updates**: Update translation keys in `i18n.tsx` to provide shorter, cleaner "Accept" and "Decline" button labels instead of the longer "Accept — move fare to escrow" strings.

---

## 2. File-by-File Analysis

### 2.1. `src/types.ts`
- **Current State**: The `Ride` interface already includes `instantBook?: boolean;` at line 30. The `Booking` interface and associated types are already defined.
- **Proposed Changes**: No changes are needed in `src/types.ts` as the necessary fields already exist in the base types.

### 2.2. `src/lib/store.ts`
- **Current State**:
  - `NewRide` (lines 94–105) does not include `instantBook`.
  - `createRide(input: NewRide)` (lines 107–127) initializes the ride's `instantBook` status by hardcoding it to `instantBookUnlocked()`.
  - `requestBooking(...)` (lines 306–331) already checks the ride's `instantBook` status:
    ```typescript
    const instant = Boolean(getRide(rideId)?.instantBook);
    // ...
    status: instant ? "accepted" : "pending",
    payStatus: instant ? "held" : "unpaid",
    ```
- **Proposed Changes**:
  - Add `instantBook?: boolean;` to the `NewRide` interface.
  - Modify `createRide` to conditionally save `instantBook` based on `instantBookUnlocked()` and driver choice:
    ```typescript
    export function createRide(input: NewRide): Ride {
      const profile = getProfile();
      const rep = driverRating(profile.id);
      const ride: Ride = {
        id: uid("ride"),
        driver: {
          id: profile.id,
          name: profile.name || "You",
          rating: rep.avg,
          trips: getStats().driverTrips,
          accent: "#2f6f64",
          phone: profile.phone || undefined
        },
        status: "active",
        createdAt: new Date().toISOString(),
        ...input,
        instantBook: instantBookUnlocked() ? (input.instantBook ?? false) : false
      };
      saveRides([...allRides(), ride]);
      return ride;
    }
    ```
    *Note: Placing `instantBook` after `...input` ensures it correctly overrides any value from `input` if the driver has not yet unlocked it.*

### 2.3. `src/pages/PostRidePage.tsx`
- **Current State**: Does not display any selection for Instant Book mode. It directly invokes `createRide` using standard fields.
- **Proposed Changes**:
  - Import `instantBookUnlocked`, `getStats`, and `INSTANT_BOOK_SEATS` from `../lib/store`.
  - Implement component state for `instantBook`:
    ```typescript
    const hasInstantBookUnlock = useMemo(() => instantBookUnlocked(), []);
    const [instantBook, setInstantBook] = useState(hasInstantBookUnlock);
    ```
  - Insert a checkbox toggle inside the form (above the return trip checkbox):
    ```typescript
    <div className="field">
      <label className="check-row">
        <input
          type="checkbox"
          checked={instantBook}
          disabled={!hasInstantBookUnlock}
          onChange={(e) => setInstantBook(e.target.checked)}
        />
        <span>{t("instantBook")}</span>
      </label>
      <p className="field__hint">
        {t("instantBookHint")}
        {!hasInstantBookUnlock && (
          <span style={{ display: "block", marginTop: "4px", color: "var(--ink-soft)" }}>
            {t("instantProgress")}: {getStats().seatsFilled}/{INSTANT_BOOK_SEATS}
          </span>
        )}
      </p>
    </div>
    ```
  - Include `instantBook` in the `rideInput` passed to `createRide` and `saveRideDraft`.

### 2.4. `src/pages/RidePage.tsx`
- **Current State**:
  - Correctly displays the `instantBook` badge (`t('instantBook')` and `t('instantBookHint')`) if `ride.instantBook` is true.
  - Dynamically updates the booking button label to `t('bookNow')` (if instant book is on) or `t('requestToBook')` (if off).
  - Triggers `requestBooking`, which implements the correct booking flow.
- **Proposed Changes**: No changes are required.

### 2.5. `src/pages/MyRidesPage.tsx`
- **Current State**: Shows list of pending requests with buttons:
  - `Accept` (labeled `t("acceptEscrow")` -> `"Accept — move fare to escrow"`)
  - `Decline` (labeled `t("decline")` -> `"No"`)
- **Proposed Changes**:
  - Update `MyRidesPage.tsx` to display shorter, cleaner button labels `"Accept"` and `"Decline"`.
  - We will define a new key `accept` for accepting requests, and update the translation of `decline` to say `"Decline"` rather than `"No"`.
  - Update the render block:
    ```typescript
    <button
      type="button"
      className="ghost-button ghost-button--good"
      onClick={() => handleDecision(b.id, "accepted")}
    >
      {t("accept")}
    </button>
    <button
      type="button"
      className="ghost-button"
      onClick={() => handleDecision(b.id, "declined")}
    >
      {t("decline")}
    </button>
    ```

### 2.6. `src/i18n.tsx`
- **Current State**:
  - Bengali: `decline: 'না'`
  - English: `decline: 'No'`
  - There is no shorter `accept` key.
- **Proposed Changes**:
  - Bengali updates:
    - Add `accept: 'গ্রহণ করুন',`
    - Update `decline: 'প্রত্যাখ্যান করুন',`
  - English updates:
    - Add `accept: 'Accept',`
    - Update `decline: 'Decline',`

---

## 3. Recommended Code Patch

A precise git-applicable diff is documented in `m2_changes.patch`.
Below is the patch content showing the modifications:

### Proposed Patch File (`.agents/explorer_m2_1/m2_changes.patch`)
```patch
diff --git a/src/i18n.tsx b/src/i18n.tsx
index d65efbe..4fc0298 100644
--- a/src/i18n.tsx
+++ b/src/i18n.tsx
@@ -165,8 +165,9 @@ const TRANSLATIONS: Record<string, Record<string, string>> = {
     heldByDeshRide: 'দেশরাইডের কাছে জমা',
     completeTripRelease: 'ট্রিপ শেষ — {amount} রিলিজ শুরু করুন',
     wantsSeatsPay: '{name} চান {seats}টি সিট · {method}-এ দেবেন',
+    accept: 'গ্রহণ করুন',
     acceptEscrow: 'গ্রহণ করুন — ভাড়া এসক্রোতে যাবে',
-    decline: 'না',
+    decline: 'প্রত্যাখ্যান করুন',
     noPendingRequests: 'এই মুহূর্তে কোনো রিকোয়েস্ট নেই।',
     ridingSection: 'আপনি যাচ্ছেন',
     noBookings: 'এখনো কোনো রিকোয়েস্ট করেননি।',
@@ -397,8 +398,9 @@ const TRANSLATIONS: Record<string, Record<string, string>> = {
     heldByDeshRide: 'Held by DeshRide',
     completeTripRelease: 'Trip complete — start releasing {amount}',
     wantsSeatsPay: '{name} wants {seats} seat(s) · will pay by {method}',
+    accept: 'Accept',
     acceptEscrow: 'Accept — move fare to escrow',
-    decline: 'No',
+    decline: 'Decline',
     noPendingRequests: 'No requests right now.',
     ridingSection: 'You are going',
diff --git a/src/lib/store.ts b/src/lib/store.ts
index e998c25..6c268a7 100644
--- a/src/lib/store.ts
+++ b/src/lib/store.ts
@@ -102,6 +102,7 @@ export interface NewRide {
   car: string;
   luggage: Ride["luggage"];
   rules: string[];
   note?: string;
+  instantBook?: boolean;
 }
 
 export function createRide(input: NewRide): Ride {
@@ -117,11 +117,11 @@ export function createRide(input: NewRide): Ride {
       accent: "#2f6f64",
       phone: profile.phone || undefined
     },
-    instantBook: instantBookUnlocked(),
     status: "active",
     createdAt: new Date().toISOString(),
-    ...input
+    ...input,
+    instantBook: instantBookUnlocked() ? (input.instantBook ?? false) : false
   };
   saveRides([...allRides(), ride]);
   return ride;
diff --git a/src/pages/MyRidesPage.tsx b/src/pages/MyRidesPage.tsx
index d7a14e9..5626a5d 100644
--- a/src/pages/MyRidesPage.tsx
+++ b/src/pages/MyRidesPage.tsx
@@ -195,7 +195,7 @@ export function MyRidesPage() {
                               className="ghost-button ghost-button--good"
                               onClick={() => handleDecision(b.id, "accepted")}
                             >
-                              {t("acceptEscrow")}
+                              {t("accept")}
                             </button>
                             <button
                               type="button"
                               className="ghost-button"
                               onClick={() => handleDecision(b.id, "declined")}
                             >
-                              {t("decline")}
+                              {t("decline")}
                             </button>
                           </span>
                         </div>
diff --git a/src/pages/PostRidePage.tsx b/src/pages/PostRidePage.tsx
index 8e45a0b..c15c898 100644
--- a/src/pages/PostRidePage.tsx
+++ b/src/pages/PostRidePage.tsx
@@ -3,7 +3,7 @@ import { useNavigate } from "react-router-dom";
 import type { LuggageSize, Spot } from "../types";
 import { LocationPicker } from "../components/LocationPicker";
 import { busFareEstimate, estimateDuration, formatBDT, roadKm, suggestedFare } from "../lib/geo";
-import { createRide, getProfile, saveProfile, saveRideDraft } from "../lib/store";
+import { createRide, getProfile, saveProfile, saveRideDraft, instantBookUnlocked, getStats, INSTANT_BOOK_SEATS } from "../lib/store";
 import { useTranslation } from "../i18n";
 
 const RULE_OPTIONS = [
@@ -43,6 +43,8 @@ export function PostRidePage() {
   const [driverName, setDriverName] = useState(profile.name);
   const [error, setError] = useState<string | null>(null);
 
+  const hasInstantBookUnlock = useMemo(() => instantBookUnlocked(), []);
+  const [instantBook, setInstantBook] = useState(hasInstantBookUnlock);
+
   const km = from && to ? roadKm(from, to) : null;
   const fare = useMemo(() => (km ? suggestedFare(km) : null), [km]);
   const effectivePrice = priceTouched && price !== "" ? Number(price) : (fare?.mid ?? "");
@@ -94,7 +96,8 @@ export function PostRidePage() {
       car: car.trim(),
       luggage,
       rules,
-      note: note.trim() || undefined
+      note: note.trim() || undefined,
+      instantBook
     };
 
     // First-time drivers finish their driver profile before the ride goes live.
@@ -308,6 +311,23 @@ export function PostRidePage() {
             </div>
           )}
 
+          <div className="field">
+            <label className="check-row">
+              <input
+                type="checkbox"
+                checked={instantBook}
+                disabled={!hasInstantBookUnlock}
+                onChange={(e) => setInstantBook(e.target.checked)}
+              />
+              <span>{t("instantBook")}</span>
+            </label>
+            <p className="field__hint">
+              {t("instantBookHint")}
+              {!hasInstantBookUnlock && (
+                <span style={{ display: "block", marginTop: "4px", color: "var(--ink-soft)" }}>
+                  {t("instantProgress")}: {getStats().seatsFilled}/{INSTANT_BOOK_SEATS}
+                </span>
+              )}
+            </p>
+          </div>
+
           <label className="check-row">
             <input
               type="checkbox"
```
