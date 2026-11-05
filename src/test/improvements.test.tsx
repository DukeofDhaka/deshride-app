import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { TranslationProvider } from '../i18n';
import * as store from '../lib/store';
import { localDateKey } from '../lib/time';
import { seedAcceptedBooking } from './helpers';
import type { Ride } from '../types';

function renderApp(route = '/') {
  return render(
    <TranslationProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </TranslationProvider>
  );
}

const DHAKA = { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 };
const CTG = { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 };

function inDays(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function newRide(overrides: Partial<store.NewRide> = {}): Ride {
  return store.createRide({
    from: DHAKA,
    to: CTG,
    departure: inDays(2, 9).toISOString(),
    seatsTotal: 3,
    pricePerSeat: 1500,
    car: 'Toyota Axio',
    luggage: 'medium',
    rules: [],
    ...overrides
  });
}

describe('Part A fixes', () => {
  it('finds a 05:00 Dhaka departure on its local date, not the UTC date', () => {
    const early = inDays(2, 5);
    const ride = newRide({ departure: early.toISOString() });
    // 05:00 in Dhaka (UTC+6) is 23:00 the previous day in UTC.
    expect(early.toISOString().slice(0, 10)).not.toBe(localDateKey(early));
    const found = store.searchRides({ fromDistrict: 'Dhaka', toDistrict: 'Chattogram', date: localDateKey(early) });
    expect(found.map((r) => r.id)).toContain(ride.id);
  });

  it('search hides rides without enough free seats', () => {
    const small = newRide({ seatsTotal: 1 });
    const big = newRide({ seatsTotal: 4 });
    const ids = store.searchRides({ fromDistrict: 'Dhaka', toDistrict: 'Chattogram', seats: 2 }).map((r) => r.id);
    expect(ids).toContain(big.id);
    expect(ids).not.toContain(small.id);
  });

  it('search matches pickups at a stopover but not travel backwards', () => {
    const cumilla = { name: 'Cumilla', district: 'Cumilla', lat: 23.46, lng: 91.18 };
    const ride = newRide({ stops: [cumilla] });
    expect(store.routeMatches(ride, 'Cumilla', 'Chattogram')).toBe(true);
    expect(store.routeMatches(ride, 'Chattogram', 'Cumilla')).toBe(false);
    expect(store.routeIndices(ride, 'Cumilla', 'Chattogram')).toEqual({ pickupIdx: 1, dropoffIdx: 2 });
  });

  it('getBooking no longer invents bookings for unknown ids', () => {
    expect(store.getBooking('bk-made-up')).toBeUndefined();
    expect(() => store.sendMessage('bk-made-up', 'hi')).toThrow();
    expect(store.getBooking('bk-made-up')).toBeUndefined();
  });

  it('an unknown chat link redirects instead of opening a chat', () => {
    renderApp('/chat/bk-made-up');
    expect(screen.queryByPlaceholderText(/type a message/i)).toBeNull();
  });

  it('a real accepted booking opens the chat', () => {
    const id = seedAcceptedBooking();
    renderApp(`/chat/${id}`);
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    expect(screen.getByText(/Chatting with Helper Driver/)).toBeInTheDocument();
  });

  it('ride validation always applies', () => {
    expect(() => newRide({ pricePerSeat: 0 })).toThrow();
    expect(() => newRide({ car: '  ' })).toThrow();
    expect(() => newRide({ seatsTotal: 0 })).toThrow();
    expect(() => newRide({ departure: 'not a date' })).toThrow();
  });

  it('cannot request more seats than are left', () => {
    const ride = newRide({ seatsTotal: 2 });
    expect(() => store.requestBooking(ride.id, 3, 'bkash')).toThrow(/seats/i);
  });

  it('shows the live rating from reviews over the posted snapshot', () => {
    const ride = newRide();
    expect(store.liveDriverRating(ride)).toBeNull();
    store.addDriverRating(ride.driver.id, 4);
    store.addDriverRating(ride.driver.id, 5);
    expect(store.liveDriverRating(ride)).toBe(4.5);
  });

  it('flags phone numbers with the shared helper', () => {
    expect(store.containsPhoneNumber('call ০১৭১২৩৪৫৬৭৮')).toBe(true);
    expect(store.containsPhoneNumber('fare is 17000 Tk')).toBe(false);
  });
});
