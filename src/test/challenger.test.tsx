import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import { TranslationProvider } from '../i18n';
import { MemoryRouter } from 'react-router-dom';
import * as store from '../lib/store';
import type { Booking, Ride } from '../types';

function renderApp(initialRoute = '/') {
  return render(
    <TranslationProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    </TranslationProvider>
  );
}

describe('Challenger Adversarial Security and State Validation Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Regex Bypasses
  it('Adversarial: Bangladeshi phone number regex censoring bypasses', () => {
    // These formats bypass the current regex and remain uncensored
    const censoredCases = [
      '017.1122.3344',
      '017_1122_3344',
      '017/1122/3344',
      '০১৭১১২২৩৩৪৪',
      '01211223344',
      '017 . 112 . 233 . 44',
      '017\u200B1122\u200B3344',
      '017\u200D1122\u200D3344'
    ];
    const uncensoredCases = [
      'zero one seven one one two two three three four four'
    ];

    censoredCases.forEach((text) => {
      const censored = store.censorPhoneNumbers(text);
      expect(censored).toContain('[HIDDEN]');
    });

    uncensoredCases.forEach((text) => {
      const censored = store.censorPhoneNumbers(text);
      expect(censored).toBe(text);
    });
  });

  // 2. Uncensored Booking Request Messages
  it('Adversarial: Booking request messages are completely uncensored', () => {
    // Seed a driver and a ride
    const driverProfile = store.getProfile();
    store.saveProfile({
      ...driverProfile,
      name: 'Driver X',
      phone: '01711223344',
      driver: {
        ownerNid: '1234567890123',
        ownerIsDriver: true,
        plate: 'Dhaka Metro GA 12-3456',
        carColor: 'Silver',
        completedAt: new Date().toISOString()
      }
    });

    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Sylhet', district: 'Sylhet', lat: 24.9, lng: 91.87 },
      departure: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      seatsTotal: 4,
      pricePerSeat: 1000,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: []
    });

    // Switch to passenger profile
    const passengerProfile = {
      id: 'user-passenger',
      name: 'Passenger P',
      phone: '01811223344',
      verified: { phone: true, nid: false, licence: false }
    };
    store.saveProfile(passengerProfile);

    // Request booking with contact info in the message
    const msgWithPhone = 'Hi driver, contact me at 01711223344';
    const booking = store.requestBooking(ride.id, 1, 'bkash', msgWithPhone);

    expect(booking.message).not.toBe(msgWithPhone);
    expect(booking.message).toContain('[HIDDEN]');
  });

  // 3. DeshPoints and Rating Inflation Exploit
  it('Adversarial: DeshPoints and Rating Inflation Exploit', () => {
    // Seed a driver, ride, and accepted booking
    const driverId = 'drv-123';
    
    // Switch to passenger
    const passengerProfile = store.getProfile();
    store.saveProfile({
      ...passengerProfile,
      name: 'Passenger',
      phone: '01811223344'
    });

    // Directly insert an accepted booking in "releasing" status
    const bookingId = 'bk-exploit-1';
    const mockBooking: Booking = {
      id: bookingId,
      rideId: 'ride-exploit-1',
      guestId: passengerProfile.id,
      guestName: 'Passenger',
      seats: 1,
      payMethod: 'bkash',
      status: 'accepted',
      payStatus: 'releasing',
      createdAt: new Date().toISOString(),
      releaseAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    };
    
    // Hack the store mock rides as well
    const mockRide: Ride = {
      id: 'ride-exploit-1',
      driver: { id: driverId, name: 'Driver X', rating: null, trips: 0, accent: '#2f6f64' },
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Sylhet', district: 'Sylhet', lat: 24.9, lng: 91.87 },
      departure: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      seatsTotal: 4,
      pricePerSeat: 1000,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('deshride.bookings.v1', JSON.stringify([mockBooking]));
    localStorage.setItem('deshride.rides.v1', JSON.stringify([mockRide]));

    // Check starting stats
    expect(store.getStats().points).toBe(0);

    // Call confirmReleaseAndRate the first time
    store.confirmReleaseAndRate(bookingId, 5);
    expect(store.getStats().points).toBe(20);
    expect(store.driverRating(driverId)).toEqual({ avg: 5, count: 1 });

    // Call confirmReleaseAndRate a second time (on already released booking)
    store.confirmReleaseAndRate(bookingId, 5);
    
    expect(store.getStats().points).toBe(20);
    expect(store.driverRating(driverId)).toEqual({ avg: 5, count: 1 });
  });

  // 4. Overbooking on Instant Book Rides
  it('Adversarial: Overbooking on Instant Book Rides', () => {
    // Create an Instant Book ride with 1 seat
    const driverProfile = store.getProfile();
    store.saveProfile({
      ...driverProfile,
      driver: {
        ownerNid: '1234567890123',
        ownerIsDriver: true,
        plate: 'Dhaka Metro GA 12-3456',
        carColor: 'Silver',
        completedAt: new Date().toISOString()
      }
    });

    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Sylhet', district: 'Sylhet', lat: 24.9, lng: 91.87 },
      departure: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      seatsTotal: 1,
      pricePerSeat: 1000,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      instantBook: true
    });

    // Request 2 seats (exceeding total of 1)
    expect(() => store.requestBooking(ride.id, 2, 'bkash')).toThrow();
  });

  // 5. First-Time Driver Validation Bypass
  it('Adversarial: First-time driver validation bypass publishing invalid ride', () => {
    // Create a new profile (NOT a driver)
    const profile = store.getProfile();
    store.saveProfile({
      ...profile,
      driver: undefined
    });

    // Render PostRidePage
    renderApp('/post');

    // Save ride draft directly in store simulating what PostRidePage does:
    const invalidInput = {
      from: { name: '', district: '', lat: 0, lng: 0 },
      to: { name: '', district: '', lat: 0, lng: 0 },
      departure: new Date().toISOString(),
      seatsTotal: 3,
      pricePerSeat: -100, // Negative fare!
      car: '', // Empty car!
      luggage: 'medium' as const,
      rules: []
    };
    expect(() => store.saveRideDraft(invalidInput)).toThrow();
  });

  // 6. Completed Ride Cancellation Inconsistency
  it('Adversarial: Completed ride cancellation leaves inconsistent booking states', () => {
    const driverProfile = store.getProfile();
    store.saveProfile({
      ...driverProfile,
      driver: {
        ownerNid: '1234567890123',
        ownerIsDriver: true,
        plate: 'Dhaka Metro GA 12-3456',
        carColor: 'Silver',
        completedAt: new Date().toISOString()
      }
    });

    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Sylhet', district: 'Sylhet', lat: 24.9, lng: 91.87 },
      departure: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1000,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: []
    });

    // Create a booking
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    store.updateBookingStatus(booking.id, 'accepted');

    // Complete the ride (sets booking payStatus to releasing)
    store.completeRide(ride.id);
    
    const freshBooking = store.getBooking(booking.id)!;
    expect(freshBooking.payStatus).toBe('releasing');

    // Cancel the ride (simulating programmatically or due to missing guard in completeRide vs cancelRide)
    expect(() => store.cancelRide(ride.id)).toThrow();
  });

  // 7. Chat Authorization Bypass
  it('Adversarial: Chat page lacks authorization check', () => {
    // Create an accepted booking between User A (passenger) and Driver D
    const bookingId = 'bk-auth-test';
    const mockBooking: Booking = {
      id: bookingId,
      rideId: 'ride-auth-test',
      guestId: 'user-A',
      guestName: 'User A',
      seats: 1,
      payMethod: 'bkash',
      status: 'accepted',
      payStatus: 'held',
      createdAt: new Date().toISOString()
    };

    const mockRide: Ride = {
      id: 'ride-auth-test',
      driver: { id: 'user-D', name: 'Driver D', rating: null, trips: 0, accent: '#2f6f64' },
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Sylhet', district: 'Sylhet', lat: 24.9, lng: 91.87 },
      departure: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      seatsTotal: 4,
      pricePerSeat: 1000,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      status: 'active',
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('deshride.bookings.v1', JSON.stringify([mockBooking]));
    localStorage.setItem('deshride.rides.v1', JSON.stringify([mockRide]));

    // Switch to User C (an unrelated passenger)
    store.saveProfile({
      id: 'user-C',
      name: 'User C',
      phone: '01911223344',
      verified: { phone: true, nid: false, licence: false }
    });

    // Render ChatPage for User A and Driver D
    renderApp(`/chat/${bookingId}`);

    // Verify User C is redirected and cannot see the page
    expect(screen.queryByText(/Chatting with/i)).toBeNull();

    // Send a message as User C
    expect(() => store.sendMessage(bookingId, 'Hello this is an intruder!')).toThrow();
  });
});
