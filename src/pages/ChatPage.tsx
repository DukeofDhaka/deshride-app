import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  containsContactInfo,
  detectOffAppPayment,
  getBooking,
  getMessages,
  getProfile,
  getRide,
  sendMessage
} from "../lib/store";
import { Icon } from "../components/Icons";
import { ReportButton } from "../components/ReportDialog";
import { useTranslation } from "../i18n";

export function ChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { language, t } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [warning, setWarning] = useState<"contact" | "payment" | null>(null);
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
  const iAmGuest = profile.id === booking.guestId;
  const otherUserName = iAmGuest ? ride.driver.name : booking.guestName;
  const otherUserId = iAmGuest ? ride.driver.id : booking.guestId;
  const locale = language === "bn" ? "bn-BD" : "en-GB";

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputText(val);
    setWarning(containsContactInfo(val) ? "contact" : detectOffAppPayment(val) ? "payment" : null);
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    setWarning(null);
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

      <div className="chat-pinned" role="note">
        <Icon name="shield" size={18} />
        <span>{t("chatPinnedNotice")}</span>
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
                {msg.flags?.includes("contact") && <p className="message-flag">{t("contactHiddenNote")}</p>}
                {msg.flags?.includes("payment") && (
                  <p className="message-flag message-flag--payment">
                    {t("offAppPaymentNote")}{" "}
                    {!isMe && (
                      <ReportButton
                        targetId={otherUserId}
                        targetName={otherUserName}
                        bookingId={booking.id}
                        initialReason="offAppPayment"
                        label={t("reportThis")}
                      />
                    )}
                  </p>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {warning === "contact" && <div className="banner banner--warn">{t("phoneWarning")}</div>}
      {warning === "payment" && <div className="banner banner--warn">{t("paymentTypingWarning")}</div>}

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
