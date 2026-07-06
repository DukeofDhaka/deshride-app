import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import { TranslationProvider } from '../i18n';
import { MemoryRouter } from 'react-router-dom';
import * as store from '../lib/store';

function renderApp(initialRoute = '/') {
  return render(
    <TranslationProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    </TranslationProvider>
  );
}

describe('Adversarial Coverage Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Gap 1: Re-accepting an already accepted booking fails
  it('ADV-1: Re-accepting an already accepted booking fails due to seat count check bug', () => {
    // 1. Create profile
    store.saveProfile({
      id: 'drv-1',
      name: 'Driver One',
      phone: '01711000111',
      verified: { phone: true, nid: true, licence: true },
      driver: {
        ownerNid: '1234567890123',
        ownerIsDriver: true,
        plate: 'Dhaka Metro GA 12-3456',
        carColor: 'Silver',
        completedAt: new Date().toISOString()
      }
    });

    // 2. Create a ride with 3 seats
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: []
    });

    // 3. Request booking for 2 seats (leaving 1 seat left)
    const booking = store.requestBooking(ride.id, 2, 'bkash', 'Hello');

    // 4. Driver accepts booking (status goes to accepted, payStatus goes to held, remaining seats left: 1)
    const acceptError1 = store.updateBookingStatus(booking.id, 'accepted');
    expect(acceptError1).toBeNull();
    
    const updatedBooking = store.getBooking(booking.id);
    expect(updatedBooking?.status).toBe('accepted');
    expect(store.seatsLeft(ride)).toBe(1);

    // 5. Driver attempts to re-accept the same booking (e.g. double click or state re-evaluation)
    const acceptError2 = store.updateBookingStatus(booking.id, 'accepted');
    
    expect(acceptError2).toBeNull();
  });

  // Gap 2: Bengali digits phone number censoring bypass
  it('ADV-2: Phone number censoring is bypassed when using Bengali digits', () => {
    const text = 'আমার নম্বর হলো ০১৭১২৩৪৫৬৭৮';
    const msg = store.sendMessage('bk-censor-test', text);
    
    expect(msg.text).not.toBe(text);
    expect(msg.text).toContain('[HIDDEN]');
  });

  // Gap 3: Alternate separators phone number censoring bypass
  it('ADV-3: Phone number censoring is bypassed when using dot separators', () => {
    const text = 'Call 017.1234.5678';
    const msg = store.sendMessage('bk-censor-test-2', text);
    
    expect(msg.text).not.toBe(text);
    expect(msg.text).toContain('[HIDDEN]');
  });

  // Gap 4: Instant Book Overbooking capacity vulnerability
  it('ADV-4: Instant Book allows requesting more seats than are available, leading to overbooking', () => {
    // 1. Setup experienced driver stats to unlock instantBook
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));

    // 2. Create instantBook ride with 3 seats
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      instantBook: true
    });

    // 3. Passenger A books 2 seats -> status accepted, 1 seat remains
    const bookingA = store.requestBooking(ride.id, 2, 'bkash');
    expect(bookingA.status).toBe('accepted');
    expect(store.seatsLeft(ride)).toBe(1);

    // 4. Passenger B requests 2 seats -> this must throw an error
    expect(() => store.requestBooking(ride.id, 2, 'bkash')).toThrow();
  });

  // Gap 5: Direct chat access after trip completion
  it('ADV-5: Chat page can still be accessed via direct route after a ride is completed', () => {
    // 1. Create a ride and an accepted booking
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: []
    });
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    store.updateBookingStatus(booking.id, 'accepted');

    // 2. Complete the ride (status goes to completed)
    store.completeRide(ride.id);
    const updatedRide = store.getRide(ride.id);
    expect(updatedRide?.status).toBe('completed');

    // 3. Try to access the chat page directly
    renderApp(`/chat/${booking.id}`);

    const chatHeading = screen.queryByText(/Chatting with/i) || screen.queryByText(/-এর সাথে কথোপকথন/i) || screen.queryByText(/Chat/i);
    expect(chatHeading).toBeNull();
  });
});
