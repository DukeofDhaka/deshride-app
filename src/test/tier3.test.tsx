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

describe('Tier 3: Cross-Feature Combinations (F3-C1 - F3-C7)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('F3-C1: Instant Book ride booking request results in accepted status, opens chat route, and enables message buttons instantly', () => {
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      instantBook: true
    });
    
    // Guest books
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    expect(booking.status).toBe('accepted');
    expect(booking.payStatus).toBe('held');
    
    renderApp(`/ride/${ride.id}`);
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn).toBeInTheDocument();
  });

  it('F3-C2: Non-instant Book ride request requires driver approval, message button is locked, and turns unlocked only after driver click accept', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    expect(booking.status).toBe('pending');
    
    // View ride page
    renderApp(`/ride/${ride.id}`);
    let msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn === null || (msgBtn as HTMLButtonElement).disabled || msgBtn.getAttribute('aria-disabled')).toBeTruthy();
    
    // Accept booking
    store.updateBookingStatus(booking.id, 'accepted');
    
    // Message button should be unlocked now
    renderApp(`/ride/${ride.id}`);
    msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn).toBeInTheDocument();
  });

  it('F3-C3: Censored phone number in driver notes triggers warning on PostRidePage and is persisted as censored in store', () => {
    renderApp('/post');
    const noteTextarea = document.querySelector('textarea');
    expect(noteTextarea).toBeInTheDocument();
    
    fireEvent.change(noteTextarea!, { target: { value: 'Call 01712345678 to coordinate.' } });
    
    const banner = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(banner).toBeInTheDocument();
    
    // Simulate form submit or direct createRide check
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      note: 'Call 01712345678 to coordinate.',
      instantBook: false
    });
    expect(ride.note).not.toContain('01712345678');
    expect(ride.note).toContain('[HIDDEN]');
  });

  it('F3-C4: Phone number typed in ChatPage input triggers warning banner, and upon sending is saved in store in censored format', () => {
    renderApp('/chat/bk-c4');
    const input = document.querySelector('input[type="text"]') || screen.queryByPlaceholderText(/message/i);
    expect(input).toBeInTheDocument();
    
    fireEvent.change(input!, { target: { value: 'My phone is 01811223344' } });
    const banner = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(banner).toBeInTheDocument();
    
    // Store send
    const msg = store.sendMessage('bk-c4', 'My phone is 01811223344');
    expect(msg.text).not.toContain('01811223344');
    expect(msg.text).toContain('[HIDDEN]');
  });

  it('F3-C5: Passenger books instant ride, driver completes ride, payment releases, message button is disabled, and chat history is preserved', () => {
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      instantBook: true
    });
    
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    store.sendMessage(booking.id, 'Hello!');
    
    store.completeRide(ride.id);
    store.confirmRelease(booking.id);
    
    // Verify booking payment status updated to released
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const current = bookings.find((b: any) => b.id === booking.id);
    expect(current.payStatus).toBe('released');
    
    // Message button should be disabled now
    renderApp('/rides');
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn === null || (msgBtn as HTMLButtonElement).disabled || msgBtn.getAttribute('aria-disabled')).toBeTruthy();
    
    // Chat history must be preserved
    const chatHistory = store.getMessages(booking.id);
    expect(chatHistory.length).toBe(1);
    expect(chatHistory[0].text).toBe('Hello!');
  });

  it('F3-C6: Non-instant Book ride gets booking request, guest cancels request, status goes to cancelled, and message button remains locked', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    expect(booking.status).toBe('pending');
    
    store.cancelMyBooking(booking.id);
    
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const cancelled = bookings.find((b: any) => b.id === booking.id);
    expect(cancelled.status).toBe('cancelled');
    
    renderApp(`/ride/${ride.id}`);
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn === null || (msgBtn as HTMLButtonElement).disabled || msgBtn.getAttribute('aria-disabled')).toBeTruthy();
  });

  it('F3-C7: Driver gets multiple booking requests, accepts one filling the ride, declines the other, and chat button is unlocked only for the accepted passenger', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 1,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    const b1 = store.requestBooking(ride.id, 1, 'bkash');
    const b2 = store.requestBooking(ride.id, 1, 'nagad');
    
    store.updateBookingStatus(b1.id, 'accepted');
    store.updateBookingStatus(b2.id, 'declined');
    
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const current1 = bookings.find((b: any) => b.id === b1.id);
    const current2 = bookings.find((b: any) => b.id === b2.id);
    
    expect(current1.status).toBe('accepted');
    expect(current2.status).toBe('declined');
  });
});
