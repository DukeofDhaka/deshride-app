# Milestone 3 (R2: Post-Acceptance Messaging) Analysis & Implementation Strategy

## Executive Summary
This analysis outlines the implementation plan for Milestone 3 (R2: Post-Acceptance Messaging). In this milestone, we will enable contextual in-app messaging between passengers and drivers for rides that have been accepted. 

Key findings from our exploration:
1. **Types and Store**: The `Message` interface is already declared in `src/types.ts`. The persistence functions `getMessages` and `sendMessage` are already implemented in `src/lib/store.ts` using LocalStorage. However, phone number censoring (Milestone 4 requirement) will eventually need to be added to `sendMessage`.
2. **Routes**: A new route `/chat/:bookingId` needs to be registered in `src/App.tsx`.
3. **Buttons/Links**: Message buttons/links must be added conditionally:
   - On `RidePage.tsx`, shown when `myBooking` status is `"accepted"`.
   - On `MyRidesPage.tsx`, shown under the driver's accepted bookings list and the passenger's requested ride card actions when status is `"accepted"`.
   - The buttons must remain hidden or disabled if a booking is pending or declined.
4. **Chat Page**: We need to create a new page `src/pages/ChatPage.tsx` containing the message feed, a message input text field, a "Send" button, and state for safety warnings (Milestone 4 alignment).

---

## 1. Routing Definition (`src/App.tsx`)

A new route for the chat interface must be registered within the `<Routes>` block in `src/App.tsx` pointing to `/chat/:bookingId`.

### Proposed Diff:
```diff
--- src/App.tsx
+++ src/App.tsx
@@ -8,2 +8,3 @@
 import { MyRidesPage } from "./pages/MyRidesPage";
 import { ProfilePage } from "./pages/ProfilePage";
+import { ChatPage } from "./pages/ChatPage";
 import { DriverOnboardingPage } from "./pages/DriverOnboardingPage";
@@ -32,2 +33,3 @@
           <Route path="/rides" element={<MyRidesPage />} />
+          <Route path="/chat/:bookingId" element={<ChatPage />} />
           <Route path="/profile" element={<ProfilePage />} />
```

---

## 2. In-App Messaging Entry Points

To enforce the rule that the messaging interface is only unlocked post-acceptance, we render the "Message" link/button conditionally.

### 2.1 Passenger Ride Page (`src/pages/RidePage.tsx`)
On `RidePage.tsx`, the passenger views details of a ride they requested. Under the booking card state (`myBooking`), we display the "Message" button only when the booking's status is `"accepted"`.

#### Proposed Diff:
```diff
--- src/pages/RidePage.tsx
+++ src/pages/RidePage.tsx
@@ -232,2 +232,9 @@
               )}
+              {myBooking.status === "accepted" && (
+                <Link 
+                  className="primary-button primary-button--full" 
+                  to={`/chat/${myBooking.id}`}
+                  style={{ textAlign: 'center', display: 'block', marginTop: '10px' }}
+                >
+                  Message
+                </Link>
+              )}
               <Link className="secondary-link secondary-link--button" to="/rides">
```

### 2.2 My Rides Page (`src/pages/MyRidesPage.tsx`)
On `MyRidesPage.tsx`, both the driver and the passenger view lists of their active transactions.

#### 2.2.1 Driver view (Driving Section)
For each ride, the driver has a list of `confirmed` (accepted) bookings. We display the "Message" link next to each confirmed guest. Pending requests must not show this link.

##### Proposed Diff:
```diff
--- src/pages/MyRidesPage.tsx
+++ src/pages/MyRidesPage.tsx
@@ -155,2 +155,5 @@
                               : t("heldByDeshRide")}
                         </span>
+                        <Link className="secondary-link" to={`/chat/${b.id}`} style={{ marginLeft: "10px" }}>
+                          Message
+                        </Link>
                       </li>
```

#### 2.2.2 Passenger view (Riding Section)
For each requested ride, the passenger has an actions area (`manage-card__actions`). We display the "Message" link here only when `booking.status === "accepted"`.

##### Proposed Diff:
```diff
--- src/pages/MyRidesPage.tsx
+++ src/pages/MyRidesPage.tsx
@@ -274,2 +277,7 @@
                   </Link>
+                  {booking.status === "accepted" && (
+                    <Link className="secondary-link" to={`/chat/${booking.id}`}>
+                      Message
+                    </Link>
+                  )}
                   {booking.payStatus === "releasing" && (
```

---

## 3. Data Schema & Persistence (`src/types.ts` & `src/lib/store.ts`)

No schema updates are needed for Milestone 3, as the `Message` interface and the helper functions `getMessages` and `sendMessage` are already defined:

- **Type Definition** (`src/types.ts`):
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
- **Local Persistence** (`src/lib/store.ts`):
  ```typescript
  export function getMessages(bookingId: string): Message[] {
    const all = load<Message[]>("deshride.messages.v1", []);
    return all.filter((m) => m.bookingId === bookingId);
  }

  export function sendMessage(bookingId: string, text: string): Message {
    const profile = getProfile();
    const all = load<Message[]>("deshride.messages.v1", []);
    const message: Message = {
      id: uid("msg"),
      bookingId,
      senderId: profile.id,
      senderName: profile.name || "User",
      text, // Will need censoring applied in Milestone 4
      createdAt: new Date().toISOString()
    };
    save("deshride.messages.v1", [...all, message]);
    return message;
  }
  ```

---

## 4. Chat UI Component (`src/pages/ChatPage.tsx`)

We will create a new page component `src/pages/ChatPage.tsx` to display the conversation history, render input elements, and handle state.

### Key Details:
- **Title and Header**: Includes a back navigation link to `/rides`.
- **Message List**: Renders the conversation. Messages sent by the current user will align to the right, and messages from the co-traveller will align to the left.
- **Message Input**: Placeholder matches `/message/i`, type `"text"`.
- **Send Button**: Type `"submit"`, text/name matches `/send/i`.
- **Safety Warning Banner**: Conditionally renders warning text matching `/warning/i` (English) or `/নিরাপত্তা/i` (Bengali) when a Bangladeshi phone number format is entered.

### Proposed Code for `src/pages/ChatPage.tsx`:
```tsx
import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getProfile, getMessages, sendMessage } from "../lib/store";
import { useTranslation } from "../i18n";

export function ChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { language, t } = useTranslation();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const profile = getProfile();

  useEffect(() => {
    if (bookingId) {
      setMessages(getMessages(bookingId));
    }
  }, [bookingId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    // Regex for Bangladeshi mobile number formats (+8801..., 01..., 8801...)
    const phoneRegex = /(?:\+?88\s*0?1|01)\s*[3-9](?:\s*-?\s*\d){8}/;
    setShowWarning(phoneRegex.test(val));
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !bookingId) return;
    
    sendMessage(bookingId, inputText.trim());
    setMessages(getMessages(bookingId));
    setInputText("");
    setShowWarning(false);
  };

  if (!bookingId) {
    return (
      <section className="page">
        <div className="empty-state">
          <h1>Booking Not Found</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="page chat-page" style={{ padding: "20px 0" }}>
      {showWarning && (
        <div className="banner banner--warn" style={{ marginBottom: "15px" }}>
          {language === "bn"
            ? "নিরাপত্তা সতর্কতা: সরাসরি যোগাযোগের নম্বর বা ফোন নম্বর শেয়ার করা থেকে বিরত থাকুন।"
            : "Warning: Please avoid sharing phone numbers or other direct contact information."}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
        <Link className="secondary-link" to="/rides">
          &larr; {t("myRides") || "My Rides"}
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Chat / বার্তা</h1>
      </div>

      <div 
        className="chat-messages" 
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "12px", 
          minHeight: "350px", 
          maxHeight: "500px", 
          overflowY: "auto", 
          padding: "16px", 
          background: "var(--cream)", 
          borderRadius: "8px", 
          border: "1px solid var(--line)" 
        }}
      >
        {messages.length === 0 ? (
          <p className="detail-note" style={{ textAlign: "center", margin: "auto", color: "var(--ink-soft)" }}>
            No messages yet. Send a message to start coordinating.
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === profile.id;
            return (
              <div 
                key={msg.id} 
                style={{ 
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start"
                }}
              >
                <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginBottom: "4px", fontWeight: 600 }}>
                  {isMe ? "You" : msg.senderName}
                </span>
                <div 
                  style={{ 
                    background: isMe ? "var(--ink)" : "#fff", 
                    color: isMe ? "var(--paper)" : "var(--ink)", 
                    padding: "10px 14px", 
                    borderRadius: "12px",
                    borderTopRightRadius: isMe ? "0" : "12px",
                    borderTopLeftRadius: isMe ? "12px" : "0",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    wordBreak: "break-word"
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <input
          type="text"
          placeholder="Type a message... / বার্তা লিখুন..."
          value={inputText}
          onChange={handleInputChange}
          className="field__input"
          style={{ flex: 1, height: "46px" }}
        />
        <button type="submit" className="primary-button" style={{ height: "46px", padding: "0 24px" }}>
          Send
        </button>
      </form>
    </section>
  );
}
```

---

## 5. Verification Plan

The implementer can verify the strategy by carrying out these tests:
1. Register `ChatPage` in `src/App.tsx` and check that compilation succeeds.
2. Build the project:
   `npm run build`
3. Run the specific Tier 1-3 test suite targeting Milestone 3 (F4, F5, F7):
   `npx vitest run src/test/tier1.test.tsx`
4. Confirm that:
   - `F4-1` (Message button hidden on MyRidesPage when pending) passes.
   - `F4-2` (Message button visible on MyRidesPage when accepted) passes.
   - `F4-3` (Message button hidden on MyRidesPage when declined) passes.
   - `F4-4` (Message button hidden on RidePage when pending) passes.
   - `F4-5` (Message button visible on RidePage when accepted) passes.
   - `F5-1` (ChatPage renders elements) passes.
   - `F5-4` and `F5-5` (ChatPage message rendering/loading) pass.
   - `F7-3` and `F7-4` (Warning banner on ChatPage) pass.
