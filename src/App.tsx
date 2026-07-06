import { useEffect } from "react";
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
import { ensureSeed, sweepPayments } from "./lib/store";

ensureSeed();

export default function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    sweepPayments();
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Header />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
