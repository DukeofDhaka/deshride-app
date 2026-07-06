import { useEffect, useMemo, useState } from "react";
import type { Spot } from "../types";
import { areasOf, findNearest, inferDistrictFromText, searchPlaces, type Place, type SearchOrigin } from "../data/gazetteer";
import { BD_BOUNDS, haversineKm } from "../lib/geo";
import { useTranslation } from "../i18n";

interface LocationPickerProps {
  label: string;
  value: Spot | null;
  onChange: (spot: Spot | null) => void;
  withNote?: boolean;
  notePlaceholder?: string;
  allowCustom?: boolean;
  enableCurrentLocation?: boolean;
  originHint?: SearchOrigin | null;
}

export function LocationPicker({
  label,
  value,
  onChange,
  withNote = false,
  notePlaceholder,
  allowCustom = true,
  enableCurrentLocation = true,
  originHint = null
}: LocationPickerProps) {
  const { t } = useTranslation();
  const noteHint = notePlaceholder ?? t('meetWhere');
  const placeholder = t('districtOrArea');

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [origin, setOrigin] = useState<SearchOrigin | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "outside" | "blocked">("idle");

  useEffect(() => {
    if (!originHint) return;
    setOrigin(originHint);
    setLocationState("ready");
  }, [originHint?.lat, originHint?.lng]);

  const results = useMemo(
    () => searchPlaces(query, 8, origin ?? undefined),
    [query, origin]
  );
  const showList = focused && !value;
  const trimmedQuery = query.trim();
  const hasExactMatch = results.some(
    (place) => place.name.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const canUseCustom = allowCustom && trimmedQuery.length >= 2 && !hasExactMatch;
  const nearest = origin ? findNearest(origin.lat, origin.lng) : null;

  function toSpot(place: Place, note?: string): Spot {
    return {
      name: place.name,
      district: place.district ?? place.name,
      lat: place.lat,
      lng: place.lng,
      note
    };
  }

  function selectPlace(place: Place) {
    onChange(toSpot(place, value?.note));
    setQuery("");
    setFocused(false);
  }

  function selectCustomPlace() {
    const district = inferDistrictFromText(trimmedQuery);
    const anchor = district ?? nearest?.place ?? results[0];
    onChange({
      name: trimmedQuery,
      district: district?.name ?? anchor?.district ?? anchor?.name ?? trimmedQuery,
      lat: district?.lat ?? origin?.lat ?? anchor?.lat ?? 23.81,
      lng: district?.lng ?? origin?.lng ?? anchor?.lng ?? 90.41,
      note: value?.note
    });
    setQuery("");
    setFocused(false);
  }

  function detectCurrentLocation(selectNearest = false) {
    if (!navigator.geolocation) {
      setLocationState("blocked");
      return;
    }
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (
          lat < BD_BOUNDS.minLat || lat > BD_BOUNDS.maxLat ||
          lng < BD_BOUNDS.minLng || lng > BD_BOUNDS.maxLng
        ) {
          setLocationState("outside");
          return;
        }
        const nextOrigin = { lat, lng };
        setOrigin(nextOrigin);
        setLocationState("ready");
        if (selectNearest) {
          const { place } = findNearest(lat, lng);
          onChange(toSpot(place, value?.note));
          setQuery("");
          setFocused(false);
        }
      },
      () => setLocationState("blocked"),
      { enableHighAccuracy: true, maximumAge: 600000, timeout: 8000 }
    );
  }

  function placeMeta(place: Place) {
    const base =
      place.kind === "area"
        ? `${place.district} · ${t('areaLabel')}`
        : `${place.division} ${t('divisionLabel')}`;
    if (!origin) return base;
    const km = Math.max(1, Math.round(haversineKm(origin, place)));
    return `${base} · ${t('kmAway', { km })}`;
  }

  function currentLocationText() {
    if (locationState === "loading") return t("detectingLocation");
    if (locationState === "ready" && nearest) {
      return t("useNearestPlace", { place: nearest.place.name });
    }
    return t("useCurrentLocation");
  }

  return (
    <div className="field">
      <label className="field__label">{label}</label>
      <div className="field__control">
        <input
          className="field__input"
          value={value ? value.name : query}
          placeholder={placeholder}
          onChange={(e) => {
            if (value) onChange(null);
            setQuery(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
      </div>

      {showList && (
        <ul className="pick-list">
          <li className="pick-list__meta">
            {origin
              ? t("nearbySuggestions")
              : trimmedQuery
                ? t("suggestedPlaces")
                : t("popularPlaces")}
          </li>
          {enableCurrentLocation && (
            <li>
              <button
                type="button"
                className="pick-list__locate"
                onMouseDown={(event) => {
                  event.preventDefault();
                  detectCurrentLocation(true);
                }}
              >
                <strong>{currentLocationText()}</strong>
                <span>
                  {locationState === "outside"
                    ? t("locationOutsideBangladesh")
                    : locationState === "blocked"
                      ? t("locationBlocked")
                      : t("locationActionHint")}
                </span>
              </button>
            </li>
          )}
          {results.map((place) => (
            <li key={`${place.name}-${place.district ?? ""}`}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectPlace(place);
                }}
              >
                <strong>{place.name}</strong>
                <span>{placeMeta(place)}</span>
              </button>
            </li>
          ))}
          {canUseCustom && (
            <li>
              <button
                type="button"
                className="pick-list__custom"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectCustomPlace();
                }}
              >
                <strong>{t("useTypedPlace", { place: trimmedQuery })}</strong>
                <span>{t("customPlaceHint")}</span>
              </button>
            </li>
          )}
        </ul>
      )}

      {value &&
        value.name === value.district &&
        areasOf(value.district).length > 0 && (
          <div className="area-chips">
            <span className="area-chips__label">{t('chooseInside', { district: value.district })}</span>
            <div className="rule-grid">
              {areasOf(value.district).map((area) => (
                <button
                  key={area.name}
                  type="button"
                  className="pill pill--toggle"
                  onClick={() =>
                    onChange({
                      name: area.name,
                      district: area.district!,
                      lat: area.lat,
                      lng: area.lng,
                      note: value.note
                    })
                  }
                >
                  {area.name}
                </button>
              ))}
            </div>
          </div>
        )}

      {withNote && value && (
        <input
          className="field__input field__input--note"
          value={value.note ?? ""}
          placeholder={noteHint}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      )}
    </div>
  );
}
