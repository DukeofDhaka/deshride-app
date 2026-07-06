import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  clearRideDraft,
  createRide,
  getProfile,
  loadRideDraft,
  saveProfile
} from "../lib/store";
import { useTranslation } from "../i18n";

function looksLikeNid(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return [10, 13, 17].includes(digits.length);
}

// Shrink the car photo before it goes into device storage.
function readAndResize(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const maxW = 900;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function DriverOnboardingPage() {
  const navigate = useNavigate();
  const profile = getProfile();
  const draft = loadRideDraft();
  const { t } = useTranslation();

  const [phone, setPhone] = useState(profile.phone);
  const [ownerNid, setOwnerNid] = useState(profile.driver?.ownerNid ?? "");
  const [ownerIsDriver, setOwnerIsDriver] = useState(profile.driver?.ownerIsDriver ?? true);
  const [driverNid, setDriverNid] = useState(profile.driver?.driverNid ?? "");
  const [plate, setPlate] = useState(profile.driver?.plate ?? "");
  const [carColor, setCarColor] = useState(profile.driver?.carColor ?? "");
  const [carPhoto, setCarPhoto] = useState<string | undefined>(profile.driver?.carPhoto);
  const [error, setError] = useState<string | null>(null);

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setCarPhoto(await readAndResize(file));
    } catch {
      setError(t("photoReadError"));
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!phone.trim() || phone.replace(/\D/g, "").length < 11) {
      setError(t("errorPhone"));
      return;
    }
    if (!looksLikeNid(ownerNid)) {
      setError(t("errorOwnerNid"));
      return;
    }
    if (!ownerIsDriver && !looksLikeNid(driverNid)) {
      setError(t("errorDriverNid"));
      return;
    }
    if (!plate.trim()) {
      setError(t("errorPlate"));
      return;
    }
    if (!carColor.trim()) {
      setError(t("errorColor"));
      return;
    }

    saveProfile({
      ...profile,
      phone: phone.trim(),
      driver: {
        ownerNid: ownerNid.trim(),
        ownerIsDriver,
        driverNid: ownerIsDriver ? undefined : driverNid.trim(),
        plate: plate.trim(),
        carColor: carColor.trim(),
        carPhoto,
        completedAt: new Date().toISOString()
      },
      verified: { ...profile.verified, nid: true, licence: true }
    });

    const pendingRide = loadRideDraft();
    if (pendingRide) {
      const ride = createRide(pendingRide);
      clearRideDraft();
      navigate(`/ride/${ride.id}?posted=1`);
    } else {
      navigate("/profile");
    }
  }

  return (
    <section className="page">
      <div className="search-banner">
        <h1>{t("driverProfileTitle")}</h1>
        <p>{draft ? t("driverProfileDraft") : t("driverProfileNoDraft")}</p>
      </div>

      <div className="post-grid">
        <form className="post-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="ob-phone">
              {t("phoneNumber")}
            </label>
            <input
              id="ob-phone"
              className="field__input"
              value={phone}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ob-owner-nid">
              {t("ownerNid")}
            </label>
            <input
              id="ob-owner-nid"
              className="field__input"
              value={ownerNid}
              placeholder="10, 13 or 17 digits"
              inputMode="numeric"
              onChange={(e) => setOwnerNid(e.target.value)}
            />
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={ownerIsDriver}
              onChange={(e) => setOwnerIsDriver(e.target.checked)}
            />
            <span>{t("ownerIsDriver")}</span>
          </label>

          {!ownerIsDriver && (
            <div className="field">
              <label className="field__label" htmlFor="ob-driver-nid">
                {t("driverNid")}
              </label>
              <input
                id="ob-driver-nid"
                className="field__input"
                value={driverNid}
                placeholder="10, 13 or 17 digits"
                inputMode="numeric"
                onChange={(e) => setDriverNid(e.target.value)}
              />
            </div>
          )}

          <div className="search-card__row">
            <div className="field">
              <label className="field__label" htmlFor="ob-plate">
                {t("licensePlate")}
              </label>
              <input
                id="ob-plate"
                className="field__input"
                value={plate}
                placeholder="Dhaka Metro GA 12-3456"
                onChange={(e) => setPlate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="ob-color">
                {t("carColor")}
              </label>
              <input
                id="ob-color"
                className="field__input"
                value={carColor}
                placeholder={t("carPlaceholder").split("·")[1]?.trim() || "Silver"}
                onChange={(e) => setCarColor(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ob-photo">
              {t("carPhoto")}
            </label>
            <input
              id="ob-photo"
              className="field__input"
              type="file"
              accept="image/*"
              onChange={handlePhoto}
            />
            {carPhoto && <img className="car-photo-preview" src={carPhoto} alt="Your car" />}
            <p className="field__hint">
              {t("carPhotoHint")}
            </p>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button primary-button--full" type="submit">
            {draft ? t("savePublishRide") : t("saveDriverProfile")}
          </button>
          <p className="detail-note">
            {t("driverProfileNote")} <Link className="secondary-link" to="/post">{t("backToRideForm")}</Link>
          </p>
        </form>

        <aside className="detail-aside">
          <div className="detail-panel">
            <h2>{t("whyAsk")}</h2>
            <ul className="panel-list">
              <li>{t("whyAskNid")}</li>
              <li>{t("whyAskPhoto")}</li>
              <li>{t("whyAskProduction")}</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
