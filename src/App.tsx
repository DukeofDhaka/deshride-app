import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BottomNav, Header } from "./components/Header";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { RidePage } from "./pages/RidePage";
import { PostRidePage } from "./pages/PostRidePage";
import { MyRidesPage } from "./pages/MyRidesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { DriverOnboardingPage } from "./pages/DriverOnboardingPage";
import { ChatPage } from "./pages/ChatPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ReceiptPage } from "./pages/ReceiptPage";
import { EarningsPage } from "./pages/EarningsPage";
import { RequestsPage } from "./pages/RequestsPage";
import { ensureSeed, sweepLifecycle } from "./lib/store";
import { useTranslation } from "./i18n";

ensureSeed();

export default function App() {
  const location = useLocation();
  const { t } = useTranslation();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  // Server refusals (e.g. someone took the last seat first) and connection
  // changes come from the sync layer as window events.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onError = (e: Event) => {
      setSyncError((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setSyncError(null), 6000);
    };
    const onConnection = (e: Event) => setOffline(!(e as CustomEvent<{ online: boolean }>).detail.online);
    window.addEventListener("deshride-sync-error", onError);
    window.addEventListener("deshride-connection", onConnection);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("deshride-sync-error", onError);
      window.removeEventListener("deshride-connection", onConnection);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Run after this commit so pages that repaint synchronously on store
    // changes (flushSync) aren't asked to do so mid-render.
    queueMicrotask(() => sweepLifecycle());
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Header />
      {offline && (
        <div className="net-banner" role="status">
          {t("offlineBanner")}
        </div>
      )}
      {syncError && (
        <div className="toast" role="alert" onClick={() => setSyncError(null)}>
          {t("syncErrorPrefix")} {syncError}
        </div>
      )}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results" element={<SearchPage />} />
          <Route path="/ride/:rideId" element={<RidePage />} />
          <Route path="/post" element={<PostRidePage />} />
          <Route path="/driver-onboarding" element={<DriverOnboardingPage />} />
          <Route path="/rides" element={<MyRidesPage />} />
          <Route path="/chat/:bookingId" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/receipt/:bookingId" element={<ReceiptPage />} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
