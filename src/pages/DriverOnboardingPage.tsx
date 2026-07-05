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
      setError("সঠিক ফোন নম্বর দিন — যাত্রীরা এতেই যোগাযোগ করবেন।");
      return;
    }
    if (!looksLikeNid(ownerNid)) {
      setError("মালিকের এনআইডি ১০, ১৩ বা ১৭ সংখ্যার হওয়ার কথা।");
      return;
    }
    if (!ownerIsDriver && !looksLikeNid(driverNid)) {
      setError("ড্রাইভারের এনআইডি ১০, ১৩ বা ১৭ সংখ্যার হওয়ার কথা।");
      return;
    }
    if (!plate.trim()) {
      setError("লাইসেন্স প্লেট নম্বরটি দিন, যেমন: ঢাকা মেট্রো গ 12-3456।");
      return;
    }
    if (!carColor.trim()) {
      setError("গাড়ির রংটি দিন — পিকআপে চিনতে সুবিধা হয়।");
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
        <h1>ড্রাইভার প্রোফাইল</h1>
        <p>
          {draft
            ? "রাইড লাইভ হওয়ার আগে একবারের কাজ — এটাই দেশরাইডকে ফেসবুক গ্রুপের চেয়ে নিরাপদ করে।"
            : "রাইড পোস্ট করতে ড্রাইভার তথ্য পূরণ করুন।"}
        </p>
      </div>

      <div className="post-grid">
        <form className="post-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="ob-phone">
              ফোন নম্বর
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
              গাড়ির মালিকের এনআইডি
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
            <span>মালিক নিজেই ড্রাইভার</span>
          </label>

          {!ownerIsDriver && (
            <div className="field">
              <label className="field__label" htmlFor="ob-driver-nid">
                ড্রাইভারের এনআইডি
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
                লাইসেন্স প্লেট
              </label>
              <input
                id="ob-plate"
                className="field__input"
                value={plate}
                placeholder="ঢাকা মেট্রো গ 12-3456"
                onChange={(e) => setPlate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="ob-color">
                গাড়ির রং
              </label>
              <input
                id="ob-color"
                className="field__input"
                value={carColor}
                placeholder="সিলভার"
                onChange={(e) => setCarColor(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ob-photo">
              গাড়ির ছবি — প্লেটসহ পুরো গাড়ি
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
              বুকিংয়ের আগে যাত্রীরা এটি দেখবেন। পরে প্রোফাইল থেকেও বদলাতে পারবেন।
            </p>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button primary-button--full" type="submit">
            {draft ? "সেভ করে রাইড পোস্ট করুন" : "ড্রাইভার প্রোফাইল সেভ করুন"}
          </button>
          <p className="detail-note">
            In production these details are verified against Porichoy (government NID
            check with face match) and BRTA vehicle records before the first ride goes
            live. <Link className="secondary-link" to="/post">Back to the ride form</Link>
          </p>
        </form>

        <aside className="detail-aside">
          <div className="detail-panel">
            <h2>কেন চাই</h2>
            <ul className="panel-list">
              <li>এনআইডি + ফেস ম্যাচেই প্রতিটি প্রোফাইল আসল।</li>
              <li>প্লেটের ছবি দেখে যাত্রীরা পিকআপে গাড়ি চিনে নেন।</li>
              <li>বিআরটিএ তালিকাভুক্তিতেও এই কাগজগুলোই লাগে — এক ফর্মেই দুই কাজ।</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
