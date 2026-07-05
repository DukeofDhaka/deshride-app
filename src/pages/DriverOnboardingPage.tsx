import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  clearRideDraft,
  createRide,
  getProfile,
  loadRideDraft,
  saveProfile
} from "../lib/store";

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
      setError("Couldn't read that photo — try a different image.");
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!phone.trim() || phone.replace(/\D/g, "").length < 11) {
      setError("A valid phone number is required — riders reach you on it.");
      return;
    }
    if (!looksLikeNid(ownerNid)) {
      setError("The car owner's NID should be 10, 13 or 17 digits.");
      return;
    }
    if (!ownerIsDriver && !looksLikeNid(driverNid)) {
      setError("The driver's NID should be 10, 13 or 17 digits.");
      return;
    }
    if (!plate.trim()) {
      setError("Add the car's licence plate number, e.g. Dhaka Metro GA 12-3456.");
      return;
    }
    if (!carColor.trim()) {
      setError("Add the car's color — riders use it to spot you at pickup.");
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
        <h1>Driver profile</h1>
        <p>
          {draft
            ? "One-time step before your ride goes live — this is what makes DeshRide safer than a Facebook group."
            : "Complete your driver details so you can post rides."}
        </p>
      </div>

      <div className="post-grid">
        <form className="post-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="ob-phone">
              Phone number
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
              Car owner's NID number
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
            <span>The owner is also the driver</span>
          </label>

          {!ownerIsDriver && (
            <div className="field">
              <label className="field__label" htmlFor="ob-driver-nid">
                Driver's NID number
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
                Licence plate
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
                Car color
              </label>
              <input
                id="ob-color"
                className="field__input"
                value={carColor}
                placeholder="Silver"
                onChange={(e) => setCarColor(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ob-photo">
              Full photo of the car, plate visible
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
              Riders see this before booking. You can add or replace it later from your
              profile.
            </p>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button primary-button--full" type="submit">
            {draft ? "Save & publish my ride" : "Save driver profile"}
          </button>
          <p className="detail-note">
            In production these details are verified against Porichoy (government NID
            check with face match) and BRTA vehicle records before the first ride goes
            live. <Link className="secondary-link" to="/post">Back to the ride form</Link>
          </p>
        </form>

        <aside className="detail-aside">
          <div className="detail-panel">
            <h2>Why we ask</h2>
            <ul className="panel-list">
              <li>NID + face match is what makes every profile real.</li>
              <li>The plate photo lets riders confirm the exact car at pickup.</li>
              <li>BRTA ridesharing enlistment requires these documents anyway — one
                form now covers both.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
