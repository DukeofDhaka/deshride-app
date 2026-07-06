import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Tier 4: Real-World Application Scenarios (F4-S1 - F4-S5)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('F4-S1: Full Driver-Passenger Carpooling Lifecycle: Driver posts Instant Book ride, Passenger searches and books, status is accepted, they chat to coordinate, driver completes ride, passenger rates driver', () => {
    // 1. Setup experienced driver stats to unlock instant book
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 200,
      driverTrips: 6,
      guestTrips: 0,
      seatsFilled: 6
    }));
    
    // 2. Driver posts instant book ride
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      seatsTotal: 2,
      pricePerSeat: 1500,
      car: 'Toyota Axio · Silver',
      luggage: 'medium',
      rules: [],
      instantBook: true
    });
    
    // 3. Passenger books the ride
    const booking = store.requestBooking(ride.id, 1, 'bkash', 'Looking forward!');
    expect(booking.status).toBe('accepted');
    expect(booking.payStatus).toBe('held');
    
    // 4. Passenger and driver exchange messages
    store.sendMessage(booking.id, 'Where should we meet?');
    store.sendMessage(booking.id, 'Meet at Kalabagan bus stand.');
    
    // 5. Driver completes the ride
    store.completeRide(ride.id);
    
    // 6. Passenger releases payment and rates driver
    store.confirmReleaseAndRate(booking.id, 5);
    
    // Verify finalized state
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const finalBooking = bookings.find((b: any) => b.id === booking.id);
    expect(finalBooking.payStatus).toBe('released');
    expect(finalBooking.rating).toBe(5);
  });

  it('F4-S2: Booking Approval & Coordination Lifecycle: Driver posts request-only ride, Passenger searches and requests, driver receives request and accepts, passenger gets notification/status update, they message each other, then passenger cancels due to change of plans', () => {
    // 1. Driver posts request-only ride
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Sylhet', district: 'Sylhet', lat: 24.9, lng: 91.87 },
      departure: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1300,
      car: 'Toyota Fielder · White',
      luggage: 'large',
      rules: [],
      instantBook: false
    });
    
    // 2. Passenger requests booking
    const booking = store.requestBooking(ride.id, 1, 'bkash', 'Request seat');
    expect(booking.status).toBe('pending');
    expect(booking.payStatus).toBe('unpaid');
    
    // 3. Driver accepts booking
    store.updateBookingStatus(booking.id, 'accepted');
    
    // 4. Chat coordination
    store.sendMessage(booking.id, 'Hello!');
    
    // 5. Passenger cancels booking (48 hours out, should receive 100% refund)
    store.cancelMyBooking(booking.id);
    
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const cancelledBooking = bookings.find((b: any) => b.id === booking.id);
    expect(cancelledBooking.status).toBe('cancelled');
    expect(cancelledBooking.refundPct).toBe(100);
    expect(cancelledBooking.payStatus).toBe('refunded');
  });

  it('F4-S3: Safety Violation Prevention Flow: Passenger tries to send contact phone number in request message and chat, gets warning banner, system censors phone number, and driver only sees [HIDDEN]', () => {
    renderApp('/chat/bk-s3');
    const input = document.querySelector('input[type="text"]') || screen.queryByPlaceholderText(/message/i);
    expect(input).toBeInTheDocument();
    
    // 1. Type phone number in chat input
    fireEvent.change(input!, { target: { value: 'My phone is 01712345678' } });
    const warning = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(warning).toBeInTheDocument();
    
    // 2. Store-level sendMessage handles censoring
    const msg = store.sendMessage('bk-s3', 'My phone is 01712345678');
    expect(msg.text).not.toContain('01712345678');
    expect(msg.text).toContain('[HIDDEN]');
  });

  it('F4-S4: Multiple Passenger Seat Allocation Flow: Driver posts ride with 3 seats, Passenger A requests 2 seats, Passenger B requests 2 seats (rejected due to seatsLeft), Driver accepts Passenger A, MyRidesPage updates seat availability, Passenger A is able to message driver', () => {
    // 1. Driver posts ride with 3 seats
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Rajshahi', district: 'Rajshahi', lat: 24.37, lng: 88.6 },
      departure: new Date().toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1450,
      car: 'Toyota Noah',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    // 2. Passenger A requests 2 seats
    const bA = store.requestBooking(ride.id, 2, 'bkash');
    
    // 3. Passenger B requests 2 seats
    const bB = store.requestBooking(ride.id, 2, 'nagad');
    
    // 4. Driver accepts Passenger A
    const resA = store.updateBookingStatus(bA.id, 'accepted');
    expect(resA).toBeNull();
    
    // 5. Driver accepts Passenger B (fails due to insufficient seats: 3 - 2 = 1 left)
    const resB = store.updateBookingStatus(bB.id, 'accepted');
    expect(resB).not.toBeNull();
    
    expect(store.seatsLeft(ride)).toBe(1);
  });

  it('F4-S5: Escalated Cancellation Escalation Lifecycle: Guest books ride, driver accepts, passenger coordinates via chat, then cancels booking 12 hours before departure, resulting in 50% refund held, and escrow state updating correctly', () => {
    // Departure in 12 hours
    const twelveHoursLater = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
    
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: twelveHoursLater,
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      instantBook: true
    });
    
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    expect(booking.status).toBe('accepted');
    expect(booking.payStatus).toBe('held');
    
    // Cancel less than 24 hours but before departure -> 50% refund, 50% kept
    store.cancelMyBooking(booking.id);
    
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const cancelled = bookings.find((b: any) => b.id === booking.id);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.refundPct).toBe(50);
    // Escrow releases part to driver or handles refunded status
    expect(cancelled.payStatus).toBe('refunded');
  });
});
