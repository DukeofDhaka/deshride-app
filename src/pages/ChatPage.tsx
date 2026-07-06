import { useEffect, useState, useRef } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { getBooking, getMessages, sendMessage, getRide, getProfile } from "../lib/store";
import { useTranslation } from "../i18n";

export function ChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { language } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const booking = bookingId ? getBooking(bookingId) : undefined;
  const profile = getProfile();

  useEffect(() => {
    const handleStateChange = () => {
      setRefresh((n) => n + 1);
    };
    window.addEventListener("deshride-state-change", handleStateChange);
    return () => {
      window.removeEventListener("deshride-state-change", handleStateChange);
    };
  }, []);

  // Scroll to bottom on load/new messages
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [refresh, messagesEndRef]);

  if (!booking || booking.status !== "accepted") {
    return <Navigate to="/" replace />;
  }

  const ride = booking ? getRide(booking.rideId) : undefined;
  if (ride) {
    if (ride.status === "completed" || ride.status === "cancelled" || (profile.id !== booking.guestId && profile.id !== ride.driver.id)) {
      return <Navigate to="/" replace />;
    }
  } else if (profile.id !== booking.guestId) {
    return <Navigate to="/" replace />;
  }

  const messages = bookingId ? getMessages(bookingId) : [];

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    const phoneRegex = /(?:\+?[8৮]\s*[-()_./\u200B\u200D]*\s*[0০]?\s*[-()_./\u200B\u200D]*\s*[1১]|[0০]\s*[-()_./\u200B\u200D]*\s*[1১]|\(?\+?[8৮]\)?\s*[-()_./\u200B\u200D]*\s*[0০]?\s*[-()_./\u200B\u200D]*\s*[1১])\s*[-()_./\u200B\u200D]*\s*[0-9০-৯](?:\s*[-()_./\u200B\u200D]*\s*[0-9০-৯]){8}/gi;
    setShowWarning(phoneRegex.test(val));
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !bookingId) return;

    setInputText("");
    setShowWarning(false);
    sendMessage(bookingId, text);
    setRefresh((n) => n + 1);
  };

  const otherUserName = (booking && ride) ? (profile.id === booking.guestId ? ride.driver.name : booking.guestName) : "User";

  return (
    <section className="page chat-page" style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
      <div className="search-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px" }}>
            {language === "bn" ? "বার্তা" : "Chat"}
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--color-muted)" }}>
            {language === "bn" ? `${otherUserName}-এর সাথে কথোপকথন` : `Chatting with ${otherUserName}`}
          </p>
        </div>
        <Link className="secondary-link" to="/rides">
          {language === "bn" ? "আমার রাইড" : "My Rides"}
        </Link>
      </div>

      <div
        className="messages-container"
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          height: "400px",
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          backgroundColor: "#f9f9f9",
          marginBottom: "16px"
        }}
      >
        {messages.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--color-muted)", margin: "auto" }}>
            {language === "bn" ? "কোন বার্তা নেই। কথোপকথন শুরু করতে নিচে লিখুন।" : "No messages yet. Type below to start the conversation."}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === profile.id;
            return (
              <div
                key={msg.id}
                className="message-wrapper"
                style={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start"
                }}
              >
                <div
                  className={`message ${isMe ? 'message--sent' : 'message--received'}`}
                  style={{
                    maxWidth: "70%",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    backgroundColor: isMe ? "#2f6f64" : "#ffffff",
                    color: isMe ? "#ffffff" : "#333333",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    border: isMe ? "none" : "1px solid var(--color-border)",
                    wordBreak: "break-word"
                  }}
                >
                  <div style={{ fontSize: "11px", opacity: 0.8, marginBottom: "4px", fontWeight: "bold" }}>
                    {msg.senderName}
                  </div>
                  <div style={{ fontSize: "14px", whiteSpace: "pre-wrap" }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: "10px", opacity: 0.6, marginTop: "4px", textAlign: "right" }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {showWarning && (
        <div className="banner banner--warn" style={{ marginBottom: "16px" }}>
          Warning / নিরাপত্তা: Sharing phone numbers in messages is not allowed.
        </div>
      )}

      <form onSubmit={handleSend} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          className="field__input"
          value={inputText}
          onChange={handleTextChange}
          placeholder={language === "bn" ? "বার্তা লিখুন..." : "Type a message..."}
          style={{ flexGrow: 1 }}
        />
        <button className="primary-button" type="submit">
          {language === "bn" ? "পাঠান" : "Send"}
        </button>
      </form>
    </section>
  );
}
