import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { containsPhoneNumber, getBooking, getMessages, getProfile, getRide, sendMessage } from "../lib/store";
import { useTranslation } from "../i18n";

export function ChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { language, t } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleStateChange = () => setRefresh((n) => n + 1);
    window.addEventListener("deshride-state-change", handleStateChange);
    return () => window.removeEventListener("deshride-state-change", handleStateChange);
  }, []);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [refresh]);

  const booking = bookingId ? getBooking(bookingId) : undefined;
  const ride = booking ? getRide(booking.rideId) : undefined;
  const profile = getProfile();

  // Chat opens only between the two people on a confirmed, still-open trip.
  if (
    !booking ||
    !ride ||
    booking.status !== "accepted" ||
    ride.status !== "active" ||
    (profile.id !== booking.guestId && profile.id !== ride.driver.id)
  ) {
    return <Navigate to="/" replace />;
  }

  const messages = getMessages(booking.id);
  const otherUserName = profile.id === booking.guestId ? ride.driver.name : booking.guestName;
  const locale = language === "bn" ? "bn-BD" : "en-GB";

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value);
    setShowWarning(containsPhoneNumber(e.target.value));
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    setShowWarning(false);
    sendMessage(booking!.id, text);
    setRefresh((n) => n + 1);
  }

  return (
    <section className="page chat-page">
      <div className="chat-head">
        <div>
          <h1>{t("chatTitle")}</h1>
          <p>{t("chattingWith", { name: otherUserName })}</p>
        </div>
        <Link className="secondary-link" to="/rides">
          {t("myRides")}
        </Link>
      </div>

      <div className="chat-log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">{t("noMessagesYet")}</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === profile.id;
            return (
              <div key={msg.id} className={`message-wrapper${isMe ? " message-wrapper--me" : ""}`}>
                <div className={`message ${isMe ? "message--sent" : "message--received"}`}>
                  <div className="message__who">{msg.senderName}</div>
                  <div className="message__text">{msg.text}</div>
                  <div className="message__time">
                    {new Date(msg.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {showWarning && <div className="banner banner--warn">{t("phoneWarning")}</div>}

      <form className="chat-compose" onSubmit={handleSend}>
        <input
          type="text"
          className="field__input"
          value={inputText}
          onChange={handleTextChange}
          placeholder={t("typeMessage")}
          aria-label={t("typeMessage")}
        />
        <button className="primary-button" type="submit">
          {t("send")}
        </button>
      </form>
    </section>
  );
}
