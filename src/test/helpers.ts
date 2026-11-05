import { fireEvent } from '@testing-library/react';
import * as store from '../lib/store';
import type { Ride } from '../types';

// Builds a real ride (driven by someone else) plus an accepted booking for the
// current profile, so chat and messaging tests exercise the true access rules
// instead of relying on made-up booking ids.
export function seedAcceptedBooking(opts: { seats?: number; ride?: Partial<Ride> } = {}): string {
  const ride: Ride = {
    id: `ride-helper-${Math.random().toString(36).slice(2, 8)}`,
    driver: { id: 'drv-helper', name: 'Helper Driver', rating: 4.8, trips: 10, accent: '#2f6f64' },
    from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
    to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
    departure: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    seatsTotal: 4,
    pricePerSeat: 1500,
    car: 'Toyota Axio',
    luggage: 'medium',
    rules: [],
    status: 'active',
    instantBook: true,
    createdAt: new Date().toISOString(),
    ...opts.ride
  };
  const rides = JSON.parse(localStorage.getItem('deshride.rides.v1') || '[]');
  localStorage.setItem('deshride.rides.v1', JSON.stringify([...rides, ride]));
  const booking = store.requestBooking(ride.id, opts.seats ?? 1, 'bkash');
  if (booking.status !== 'accepted') store.updateBookingStatus(booking.id, 'accepted');
  return booking.id;
}

// Stable per-test aliases: bk('x') returns the same seeded booking id for the
// whole test, and a fresh one after localStorage is cleared between tests.
const aliases = new Map<string, string>();
export function bk(name: string): string {
  const existing = aliases.get(name);
  if (existing && store.getBooking(existing)) return existing;
  const id = seedAcceptedBooking();
  aliases.set(name, id);
  return id;
}

// Types into a LocationPicker input and picks the first matching suggestion.
export function pickPlace(input: HTMLElement, query: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: query } });
  const list = input.closest('.field')?.querySelector('.pick-list');
  const option = Array.from(list?.querySelectorAll('button') ?? []).find(
    (b) => b.querySelector('strong')?.textContent === query
  );
  if (!option) throw new Error(`No suggestion "${query}"`);
  fireEvent.mouseDown(option);
}

// Fills the Post Ride form with a valid Dhaka → Sylhet trip.
export function fillPostRideForm(doc: Document = document) {
  const places = Array.from(doc.querySelectorAll<HTMLInputElement>('.post-form input.field__input:not(.field__input--note)')).filter(
    (i) => i.type !== 'date' && i.type !== 'time' && i.type !== 'number' && !i.id
  );
  pickPlace(places[0], 'Dhaka');
  pickPlace(places[1], 'Sylhet');
  fireEvent.change(doc.getElementById('post-car')!, { target: { value: 'Toyota Axio · Silver' } });
  const name = doc.getElementById('post-name');
  if (name) fireEvent.change(name, { target: { value: 'Test Driver' } });
}
