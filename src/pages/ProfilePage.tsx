import { useState } from "react";
import { Link } from "react-router-dom";
import type { TravelPrefs } from "../types";
import {
  BIO_MAX,
  INSTANT_BOOK_SEATS,
  blockedPeople,
  containsPhoneNumber,
  currentLevel,
  earnedBadges,
  getProfile,
  getStats,
  instantBookUnlocked,
  listAlerts,
  myBookings,
  myRides,
  passengerRating,
  removeAlert,
  saveProfile,
  unblockUser,
  useStoreValue
} from "../lib/store";
import { readAndResize } from "../lib/image";
import { useTranslation } from "../i18n";
import { Avatar } from "../components/Avatar";
import { DriverTrustStats } from "../components/DriverTrustStats";
import { Icon } from "../components/Icons";

const DEFAULT_PREFS: TravelPrefs = { chat: "some", music: true, pets: false, ac: true };

export function ProfilePage() {
  const { language, t } = useTranslation();
  useStoreValue(
    () => `${localStorage.getItem("deshride.alerts.v1")}|${localStorage.getItem("deshride.blocks.v1")}`
  );
  const profile = getProfile();
  const stats = getStats();
  const level = currentLevel(stats.points);
  const badges = earnedBadges();
  const progressPct = level.next
    ? Math.min(100, Math.round(((stats.points - level.floor) / (level.next - level.floor)) * 100))
    : 100;
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [photo, setPhoto] = useState<string | undefined>(profile.photo);
  const [prefs, setPrefs] = useState<TravelPrefs>(profile.prefs ?? DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const posted = myRides().length;
  const requested = myBookings().length;
  const myRating = passengerRating(profile.id);
  const alerts = listAlerts();
  const blocked = blockedPeople();
  const since = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", {
        month: "long",
        year: "numeric"
      })
    : null;

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await readAndResize(file, 320));
      setPhotoError(false);
    } catch {
      setPhotoError(true);
    }
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    saveProfile({ ...getProfile(), name: name.trim(), phone: phone.trim(), bio: bio.trim() || undefined, photo, prefs });
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
            <div className="photo-picker">
              <Avatar name={name || "You"} photo={photo} size="lg" />
              <div className="field">
                <label className="field__label" htmlFor="profile-photo">
                  {t("profilePhoto")}
                </label>
                <input id="profile-photo" type="file" accept="image/*" onChange={handlePhoto} />
                {photoError && <span className="field__hint">{t("photoReadError")}</span>}
              </div>
            </div>
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
              <span className="field__hint">{t("phonePrivateHint")}</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="profile-bio">
                {t("bioLabel")}
              </label>
              <textarea
                id="profile-bio"
                className="field__input field__input--area"
                value={bio}
                maxLength={BIO_MAX}
                placeholder={t("bioPlaceholder")}
                onChange={(e) => setBio(e.target.value)}
              />
              <span className="field__hint">
                {bio.length}/{BIO_MAX}
              </span>
              {containsPhoneNumber(bio) && <div className="banner banner--warn">{t("phoneWarning")}</div>}
            </div>

            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field__label">{t("travelPrefs")}</legend>
              <div className="seg-control" role="radiogroup" aria-label={t("prefChatLabel")}>
                {(["quiet", "some", "chatty"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={prefs.chat === c}
                    className={`pill pill--toggle${prefs.chat === c ? " pill--active" : ""}`}
                    onClick={() => setPrefs({ ...prefs, chat: c })}
                  >
                    {t(c === "quiet" ? "prefQuiet" : c === "chatty" ? "prefChatty" : "prefSomeChat")}
                  </button>
                ))}
              </div>
              <label className="check-row">
                <input type="checkbox" checked={prefs.music} onChange={(e) => setPrefs({ ...prefs, music: e.target.checked })} />
                <span>{t("prefMusicYes")}</span>
              </label>
              <label className="check-row">
                <input type="checkbox" checked={prefs.ac} onChange={(e) => setPrefs({ ...prefs, ac: e.target.checked })} />
                <span>{t("prefAcYes")}</span>
              </label>
              <label className="check-row">
                <input type="checkbox" checked={prefs.pets} onChange={(e) => setPrefs({ ...prefs, pets: e.target.checked })} />
                <span>{t("prefPetsYes")}</span>
              </label>
            </fieldset>

            <button className="primary-button" type="submit">
              {saved ? t("saved") : t("save")}
            </button>
          </form>

          <div className="detail-panel">
            <h2>{t("yourLevel")}</h2>
            <div className="level-head">
              <strong className="level-name">{t(level.key)}</strong>
              <span className="chip chip--good">
                {stats.points} {t("points")}
              </span>
            </div>
            <div className="level-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
              <div className="level-bar__fill" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="detail-note">
              {level.next ? `${t("toNextLevel")} ${level.next - stats.points} ${t("points")}` : t("maxLevel")}
            </p>
            {!instantBookUnlocked() && (
              <p className="detail-note">
                <Icon name="bolt" size={14} /> {t("instantProgress")} {stats.seatsFilled}/{INSTANT_BOOK_SEATS}
              </p>
            )}
            {badges.length > 0 && (
              <>
                <h2>{t("badges")}</h2>
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
            <h2>{t("myAlerts")}</h2>
            {alerts.length === 0 ? (
              <p className="detail-note">{t("noAlerts")}</p>
            ) : (
              <ul className="list-rows">
                {alerts.map((a) => (
                  <li key={a.id}>
                    <span>
                      <Icon name="bell" size={16} /> {a.from ?? t("anywhere")} → {a.to ?? t("anywhere")}
                    </span>
                    <button type="button" className="ghost-button" onClick={() => removeAlert(a.id)}>
                      {t("remove")}
                    </button>
                  </li>
                ))}
              </ul>
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
            <p className="detail-note">{t("verificationNote")}</p>
          </div>

          {profile.driver && (
            <div className="detail-panel">
              <div className="series-head">
                <h2>{t("yourCar")}</h2>
                <Link className="secondary-link" to="/earnings">
                  <Icon name="coins" size={16} /> {t("earningsLink")}
                </Link>
              </div>
              <ul className="panel-list">
                <li>
                  {t("plate")} {profile.driver.plate}
                </li>
                <li>
                  {t("color")} {profile.driver.carColor}
                </li>
                <li>
                  {t("ownerNidMasked", { last4: profile.driver.ownerNid.replace(/\D/g, "").slice(-4) })}
                  {profile.driver.ownerIsDriver
                    ? t("ownerDrives")
                    : t("driverNidMasked", { last4: (profile.driver.driverNid ?? "").replace(/\D/g, "").slice(-4) })}
                </li>
              </ul>
              {profile.driver.carPhoto && (
                <img className="car-photo-preview" src={profile.driver.carPhoto} alt={t("yourCarPhotoAlt")} />
              )}
            </div>
          )}

          {blocked.length > 0 && (
            <div className="detail-panel">
              <h2>{t("blockedPeople")}</h2>
              <ul className="list-rows">
                {blocked.map((b) => (
                  <li key={b.targetId}>
                    <span>{b.targetName}</span>
                    <button type="button" className="ghost-button" onClick={() => unblockUser(b.targetId)}>
                      {t("unblock")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="detail-aside">
          <div className="driver-card">
            <Avatar name={name || "You"} photo={photo} size="lg" />
            <h2>{name || t("enterName")}</h2>
            <p>
              {t("postedRequestedSummary", {
                posted,
                postedPlural: posted === 1 ? "" : "s",
                requested,
                requestedPlural: requested === 1 ? "" : "s"
              })}
            </p>
            {since && <p>{t("memberSince", { date: since })}</p>}
            {myRating.avg && <p>{t("passengerRatingLine", { avg: myRating.avg.toFixed(1), count: myRating.count })}</p>}
            <DriverTrustStats userId={profile.id} compact />
          </div>
          <div className="detail-panel">
            <h2>{t("yourData")}</h2>
            <p className="detail-note">{t("profileDataNote")}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
