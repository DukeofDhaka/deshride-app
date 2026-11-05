import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  clearRideDraft,
  createRide,
  createRideSeries,
  getProfile,
  loadRideDraft,
  saveProfile
} from "../lib/store";
import { useTranslation } from "../i18n";
import { readAndResize } from "../lib/image";

function looksLikeNid(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return [10, 13, 17].includes(digits.length);
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
  const [payoutMethod, setPayoutMethod] = useState<"bkash" | "nagad">(profile.driver?.payoutMethod ?? "bkash");
  const [payoutNumber, setPayoutNumber] = useState(profile.driver?.payoutNumber ?? "");
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
    if (payoutNumber.trim() && payoutNumber.replace(/\D/g, "").length < 11) {
      setError(t("errorPayoutNumber"));
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
        payoutMethod,
        payoutNumber: (payoutNumber.trim() || phone.trim()) || undefined,
        completedAt: new Date().toISOString()
      },
      verified: { ...profile.verified, nid: true, licence: true }
    });

    const pendingRide = loadRideDraft();
    if (pendingRide) {
      const { seriesDates, ...rideInput } = pendingRide;
      const rides = seriesDates && seriesDates.length > 0 ? createRideSeries(rideInput, seriesDates) : [createRide(rideInput)];
      clearRideDraft();
      navigate(rides.length > 1 ? "/rides" : `/ride/${rides[0].id}?posted=1`);
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
              placeholder={t("nidPlaceholder")}
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
                placeholder={t("nidPlaceholder")}
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
            {carPhoto && <img className="car-photo-preview" src={carPhoto} alt={t("yourCarPhotoAlt")} />}
            <p className="field__hint">
              {t("carPhotoHint")}
            </p>
          </div>

          <div className="search-card__row">
            <div className="field">
              <label className="field__label" htmlFor="ob-payout-method">
                {t("payoutMethod")}
              </label>
              <select
                id="ob-payout-method"
                className="field__input"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as "bkash" | "nagad")}
              >
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="ob-payout-number">
                {t("payoutNumber")}
              </label>
              <input
                id="ob-payout-number"
                className="field__input"
                value={payoutNumber}
                placeholder={phone || "01XXXXXXXXX"}
                inputMode="tel"
                onChange={(e) => setPayoutNumber(e.target.value)}
              />
            </div>
          </div>
          <p className="field__hint">{t("payoutHint")}</p>

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
