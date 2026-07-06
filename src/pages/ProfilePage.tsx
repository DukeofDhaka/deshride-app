import { useState } from "react";
import {
  INSTANT_BOOK_SEATS,
  currentLevel,
  earnedBadges,
  getProfile,
  getStats,
  instantBookUnlocked,
  myBookings,
  myRides,
  saveProfile
} from "../lib/store";
import { useTranslation } from "../i18n";

export function ProfilePage() {
  const { t } = useTranslation();
  const profile = getProfile();
  const stats = getStats();
  const level = currentLevel(stats.points);
  const badges = earnedBadges();
  const progressPct = level.next
    ? Math.min(100, Math.round(((stats.points - level.floor) / (level.next - level.floor)) * 100))
    : 100;
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
        <h1>{t("profileTitle")}</h1>
        <p>{t("profileSubtitle")}</p>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <form className="detail-panel" onSubmit={handleSave}>
            <h2>{t("yourInfo")}</h2>
            <div className="field">
              <label className="field__label" htmlFor="profile-name">
                {t("name")}
              </label>
              <input
                id="profile-name"
                className="field__input"
                value={name}
                placeholder={t("profileNamePlaceholder")}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="profile-phone">
                {t("phone")}
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
              {saved ? t("saved") : t("save")}
            </button>
          </form>

          <div className="detail-panel">
            <h2>{t('yourLevel')}</h2>
            <div className="level-head">
              <strong className="level-name">{t(level.key)}</strong>
              <span className="chip chip--good">
                {stats.points} {t('points')}
              </span>
            </div>
            <div className="level-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
              <div className="level-bar__fill" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="detail-note">
              {level.next
                ? `${t('toNextLevel')} ${level.next - stats.points} ${t('points')}`
                : t('maxLevel')}
            </p>
            {!instantBookUnlocked() && (
              <p className="detail-note">
                ⚡ {t('instantProgress')} {stats.seatsFilled}/{INSTANT_BOOK_SEATS}
              </p>
            )}
            {badges.length > 0 && (
              <>
                <h2>{t('badges')}</h2>
                <div className="rule-grid">
                  {badges.map((key) => (
                    <span key={key} className="pill">
                      {t(key)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="detail-panel">
            <h2>{t("verification")}</h2>
            <ul className="panel-list">
              <li>
                <span className="chip chip--good">{t("done")}</span> {t("phoneVerified")}
              </li>
              <li>
                <span className={`chip ${profile.driver ? "chip--good" : "chip--wait"}`}>
                  {profile.driver ? t("done") : t("next")}
                </span>{" "}
                {t("nationalIdVerification")}
              </li>
              <li>
                <span className={`chip ${profile.driver ? "chip--good" : "chip--wait"}`}>
                  {profile.driver ? t("done") : t("drivers")}
                </span>{" "}
                {t("driverProfileCollected")}
              </li>
            </ul>
            <p className="detail-note">
              {t("verificationNote")}
            </p>
          </div>

          {profile.driver && (
            <div className="detail-panel">
              <h2>{t("yourCar")}</h2>
              <ul className="panel-list">
                <li>{t("plate")} {profile.driver.plate}</li>
                <li>{t("color")} {profile.driver.carColor}</li>
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
            <h2>{name || t("enterName")}</h2>
            <p>
              {t("postedRequestedSummary", {
                posted,
                postedPlural: posted === 1 ? "" : "s",
                requested,
                requestedPlural: requested === 1 ? "" : "s"
              })}
            </p>
          </div>
          <div className="detail-panel">
            <h2>{t("yourData")}</h2>
            <p className="detail-note">
              {t("profileDataNote")}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
