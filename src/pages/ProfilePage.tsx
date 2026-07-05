import { useState } from "react";
import { getProfile, myBookings, myRides, saveProfile } from "../lib/store";

export function ProfilePage() {
  const profile = getProfile();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [saved, setSaved] = useState(false);

  const posted = myRides().length;
  const requested = myBookings().length;

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    saveProfile({ ...profile, name: name.trim(), phone: phone.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <section className="page">
      <div className="search-banner">
        <h1>প্রোফাইল</h1>
        <p>একটাই প্রোফাইল — কোনোদিন চালাবেন, কোনোদিন যাবেন।</p>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <form className="detail-panel" onSubmit={handleSave}>
            <h2>আপনার তথ্য</h2>
            <div className="field">
              <label className="field__label" htmlFor="profile-name">
                নাম
              </label>
              <input
                id="profile-name"
                className="field__input"
                value={name}
                placeholder="ড্রাইভার ও যাত্রীরা দেখবেন"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="profile-phone">
                ফোন
              </label>
              <input
                id="profile-phone"
                className="field__input"
                value={phone}
                placeholder="01XXXXXXXXX"
                inputMode="tel"
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button className="primary-button" type="submit">
              {saved ? "সেভ হয়েছে ✓" : "সেভ করুন"}
            </button>
          </form>

          <div className="detail-panel">
            <h2>ভেরিফিকেশন</h2>
            <ul className="panel-list">
              <li>
                <span className="chip chip--good">Done</span> Phone number — verified at
                signup with an SMS code.
              </li>
              <li>
                <span className={`chip ${profile.driver ? "chip--good" : "chip--wait"}`}>
                  {profile.driver ? "Done" : "Next"}
                </span>{" "}
                National ID — checked against the government's Porichoy service, with
                face match.
              </li>
              <li>
                <span className={`chip ${profile.driver ? "chip--good" : "chip--wait"}`}>
                  {profile.driver ? "Done" : "Drivers"}
                </span>{" "}
                Driver profile — NID, licence plate and car photo, collected the first
                time you post a ride.
              </li>
            </ul>
            <p className="detail-note">
              Verification is DeshRide's answer to the Facebook khep groups: everyone in
              the car knows exactly who they're travelling with.
            </p>
          </div>

          {profile.driver && (
            <div className="detail-panel">
              <h2>আপনার গাড়ি</h2>
              <ul className="panel-list">
                <li>প্লেট: {profile.driver.plate}</li>
                <li>রং: {profile.driver.carColor}</li>
                <li>
                  Owner NID: ···{profile.driver.ownerNid.replace(/\D/g, "").slice(-4)}
                  {profile.driver.ownerIsDriver
                    ? " (owner drives)"
                    : ` · Driver NID: ···${(profile.driver.driverNid ?? "").replace(/\D/g, "").slice(-4)}`}
                </li>
              </ul>
              {profile.driver.carPhoto && (
                <img className="car-photo-preview" src={profile.driver.carPhoto} alt="Your car" />
              )}
            </div>
          )}
        </div>

        <aside className="detail-aside">
          <div className="driver-card">
            <div className="avatar avatar--large" style={{ backgroundColor: "#2f6f64" }}>
              {(name || "You")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <h2>{name || "নাম দিন"}</h2>
            <p>
              {posted} ride{posted === 1 ? "" : "s"} posted · {requested} trip
              {requested === 1 ? "" : "s"} requested
            </p>
          </div>
          <div className="detail-panel">
            <h2>আপনার ডেটা</h2>
            <p className="detail-note">
              This prototype keeps everything on this device only. When DeshRide's
              backend launches, your profile syncs with consent-first handling under
              Bangladesh's data protection law.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
