import { useState } from "react";
import type { Spot } from "../types";
import { findNearest, searchPlaces } from "../data/gazetteer";
import { BDMap } from "./BDMap";

interface LocationPickerProps {
  label: string;
  value: Spot | null;
  onChange: (spot: Spot | null) => void;
  allowMapPick?: boolean;
  withNote?: boolean;
  notePlaceholder?: string;
  placeholder?: string;
}

export function LocationPicker({
  label,
  value,
  onChange,
  allowMapPick = false,
  withNote = false,
  notePlaceholder = "Exact meeting point, e.g. Kalabagan bus stand gate 2",
  placeholder = "District or town"
}: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const results = searchPlaces(query);
  const showList = focused && query.length > 0 && !value;

  function handlePick(lat: number, lng: number) {
    const { place, km } = findNearest(lat, lng);
    const name = km <= 12 ? place.name : `Near ${place.name}`;
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
        {allowMapPick && (
          <button
            type="button"
            className="field__map-toggle"
            onClick={() => setMapOpen((open) => !open)}
          >
            {mapOpen ? "Close map" : "Pick on map"}
          </button>
        )}
      </div>

      {showList && results.length > 0 && (
        <ul className="pick-list">
          {results.map((place) => (
            <li key={place.name}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange({
                    name: place.name,
                    district: place.name,
                    lat: place.lat,
                    lng: place.lng,
                    note: value ? (value as Spot).note : undefined
                  });
                  setQuery("");
                }}
              >
                <strong>{place.name}</strong>
                <span>{place.division} division</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {mapOpen && (
        <div className="field__map">
          <p className="field__hint">Tap anywhere in Bangladesh to drop the pin.</p>
          <BDMap from={value} onPick={handlePick} />
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
