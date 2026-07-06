import { useState } from "react";
import type { Spot } from "../types";
import { areasOf, findNearest, searchPlaces } from "../data/gazetteer";
import { useTranslation } from "../i18n";

interface LocationPickerProps {
  label: string;
  value: Spot | null;
  onChange: (spot: Spot | null) => void;
  allowMapPick?: boolean;
  withNote?: boolean;
}

export function LocationPicker({
  label,
  value,
  onChange,
  allowMapPick = false,
  withNote = false,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const notePlaceholder = t('meetWhere');
  const placeholder = t('districtOrArea');

  const [query, setQuery] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const results = searchPlaces(query);
  const showList = focused && query.length > 0 && !value;

  function handlePick(lat: number, lng: number) {
    const { place, km } = findNearest(lat, lng);
    const name = km <= 12 ? place.name : `${place.name} ${t('near')}`;
    onChange({ name, district: place.name, lat, lng, note: value?.note });
    setQuery("");
    setMapOpen(false);
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

      {showList && results.length > 0 && (
        <ul className="pick-list">
          {results.map((place) => (
            <li key={`${place.name}-${place.district ?? ""}`}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange({
                    name: place.name,
                    district: place.district ?? place.name,
                    lat: place.lat,
                    lng: place.lng,
                    note: value ? (value as Spot).note : undefined
                  });
                  setQuery("");
                }}
              >
                <strong>{place.name}</strong>
                <span>
                  {place.kind === "area"
                    ? `${place.district} · ${t('areaLabel')}`
                    : `${place.division} ${t('divisionLabel')}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {value &&
        value.name === value.district &&
        areasOf(value.district).length > 0 && (
          <div className="area-chips">
            <span className="area-chips__label">{value.district} {t('chooseInside')}</span>
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
          placeholder={notePlaceholder}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      )}
    </div>
  );
}
