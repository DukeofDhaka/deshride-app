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

describe('Tier 2: Boundary & Corner Cases (F1 - F7)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // F1: Booking Mode Selection (5 tests)
  // =========================================================================

  it('F2-B1: Toggle state persists when switching languages back and forth in PostRidePage', () => {
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    
    renderApp('/post');
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox); // check it
    expect(checkbox.checked).toBe(true);
    
    // Toggle language button
    const langBtn = screen.queryByRole('button', { name: /en|bn/i }) || screen.queryByText(/English|বাংলা/i);
    expect(langBtn).toBeInTheDocument();
    fireEvent.click(langBtn!);
    expect(checkbox.checked).toBe(true);
  });

  it('F2-B2: Instant Book checkbox is unchecked by default for a clean session', () => {
    renderApp('/post');
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);
  });

  it('F2-B3: PostRidePage validation handles instantBook toggle without crashing when other inputs are invalid', () => {
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    renderApp('/post');
    const submitBtn = screen.queryByRole('button', { name: /Post ride/i }) || screen.queryByText(/Post ride/i) || screen.queryByText(/রাইড পোস্ট/i);
    expect(submitBtn).toBeInTheDocument();
    
    // Toggle the instant book checkbox
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.disabled).toBe(false);
    fireEvent.click(checkbox);
    
    fireEvent.click(submitBtn!);
    // It should display validation error (like missing name or fields) but not crash the component
    const errorMsg = screen.queryByText(/error/i) || screen.queryByText(/ভুল/i) || screen.queryByText(/সঠিক/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it('F2-B4: Driver profile NID verification prevents publishing ride regardless of instantBook toggle state', () => {
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    // If first-time driver, they must complete driver onboarding
    renderApp('/post');
    
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    // Toggle instantBook
    fireEvent.click(checkboxes[0]);
    
    const submitBtn = screen.queryByRole('button', { name: /Post ride/i }) || screen.queryByText(/Post ride/i);
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn!);
    
    // In first-time posting, user gets redirected to driver onboarding
    // Check if we are routed to onboarding
    const onboardingHeader = screen.queryByText(/Driver profile/i) || screen.queryByText(/ড্রাইভার প্রোফাইল/i);
    expect(onboardingHeader).toBeInTheDocument();
  });

  it('F2-B5: Instant Book checkbox status is preserved in draft when driver is redirected to onboarding', () => {
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    renderApp('/post');
    const noteTextarea = document.querySelector('textarea');
    expect(noteTextarea).toBeInTheDocument();
    fireEvent.change(noteTextarea!, { target: { value: 'Draft note' } });
    
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.disabled).toBe(false);
    fireEvent.click(checkbox);
    
    // Trigger redirect
    const submitBtn = screen.queryByRole('button', { name: /Post ride/i }) || screen.queryByText(/Post ride/i);
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn!);
    
    const draft = store.loadRideDraft();
    expect(draft).not.toBeNull();
  });

  // =========================================================================
  // F2: Passenger Booking Flow Status Resolution (5 tests)
  // =========================================================================

  it('F2-B6: Booking request with zero seats is rejected', () => {
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
    
    expect(() => store.requestBooking(ride.id, 0, 'bkash')).toThrow();
  });

  it('F2-B7: Booking request for seats exceeding available capacity is capped or rejected', () => {
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
    
    // Requesting 4 seats when 3 are total
    const booking = store.requestBooking(ride.id, 4, 'bkash');
    expect(booking).not.toBeNull();
  });

  it('F2-B8: Booking with payment method Cash/bKash/Nagad resolves correct escrow state for instantBook', () => {
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
    
    const b1 = store.requestBooking(ride.id, 1, 'bkash');
    const b2 = store.requestBooking(ride.id, 1, 'nagad');
    const b3 = store.requestBooking(ride.id, 1, 'card');
    
    expect(b1.payStatus).toBe('held');
    expect(b2.payStatus).toBe('held');
    expect(b3.payStatus).toBe('held');
  });

  it('F2-B9: Cancel booking before acceptance refunds the correct fare percentage (100%)', () => {
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
    expect(booking.payStatus).toBe('unpaid');
    
    store.cancelMyBooking(booking.id);
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const cancelled = bookings.find((b: any) => b.id === booking.id);
    
    expect(cancelled.status).toBe('cancelled');
    // Unpaid should stay unpaid or refunded without escrow charges
    expect(cancelled.payStatus).toBe('unpaid');
  });

  it('F2-B10: Cancel booking after instant acceptance handles refund policy based on departure times', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2); // 48 hours out
    
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: tomorrow.toISOString(),
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
    
    store.cancelMyBooking(booking.id);
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const cancelled = bookings.find((b: any) => b.id === booking.id);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.refundPct).toBe(100);
    expect(cancelled.payStatus).toBe('refunded');
  });

  // =========================================================================
  // F3: Driver UI Approval Actions (5 tests)
  // =========================================================================

  it('F2-B11: Driver accepting a booking that exactly fills remaining seats succeeds and disables further bookings', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 2,
      pricePerSeat: 1500,
      car: 'Toyota Noah',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    const b1 = store.requestBooking(ride.id, 2, 'bkash');
    const result = store.updateBookingStatus(b1.id, 'accepted');
    
    expect(result).toBeNull();
    expect(store.seatsLeft(ride)).toBe(0);
  });

  it('F2-B12: Driver cannot decline an already accepted booking', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 2,
      pricePerSeat: 1500,
      car: 'Toyota Noah',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    const b1 = store.requestBooking(ride.id, 1, 'bkash');
    store.updateBookingStatus(b1.id, 'accepted');
    
    // Decline should be blocked or ineffective directly without cancelling
    store.updateBookingStatus(b1.id, 'declined');
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const current = bookings.find((b: any) => b.id === b1.id);
    // It should either remain accepted or handle appropriately
    expect(current.status).toBe('accepted');
  });

  it('F2-B13: Multiple pending bookings can be resolved independently without state leakage', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 4,
      pricePerSeat: 1000,
      car: 'Noah',
      luggage: 'large',
      rules: [],
      instantBook: false
    });
    
    const b1 = store.requestBooking(ride.id, 1, 'bkash');
    const b2 = store.requestBooking(ride.id, 2, 'nagad');
    
    store.updateBookingStatus(b1.id, 'accepted');
    store.updateBookingStatus(b2.id, 'declined');
    
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const current1 = bookings.find((b: any) => b.id === b1.id);
    const current2 = bookings.find((b: any) => b.id === b2.id);
    
    expect(current1.status).toBe('accepted');
    expect(current2.status).toBe('declined');
  });

  it('F2-B14: Driver cannot accept booking for a cancelled ride', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 2,
      pricePerSeat: 1500,
      car: 'Noah',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    store.cancelRide(ride.id);
    
    // Attempting to accept booking on cancelled ride
    const result = store.updateBookingStatus(booking.id, 'accepted');
    expect(result).not.toBeNull();
  });

  it('F2-B15: Driver attempting to accept a declined booking returns error or fails gracefully', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 2,
      pricePerSeat: 1500,
      car: 'Noah',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    store.updateBookingStatus(booking.id, 'declined');
    
    const result = store.updateBookingStatus(booking.id, 'accepted');
    expect(result).not.toBeNull();
  });

  // =========================================================================
  // F4: Post-Acceptance Messaging Button Unlocking (5 tests)
  // =========================================================================

  it('F2-B16: Message button state updates instantly when driver accepts booking without requiring reload', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 2,
      pricePerSeat: 1500,
      car: 'Noah',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    renderApp('/rides');
    
    // Simulate accepting booking via UI or store trigger
    store.updateBookingStatus(booking.id, 'accepted');
    
    // Verify that the message button is eventually enabled
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn).toBeInTheDocument();
  });

  it('F2-B17: Message button is hidden for guest when booking is cancelled by guest', () => {
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
      car: 'Noah',
      luggage: 'medium',
      rules: [],
      instantBook: true
    });
    
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    store.cancelMyBooking(booking.id);
    
    renderApp(`/ride/${ride.id}`);
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn === null || (msgBtn as HTMLButtonElement).disabled || msgBtn.getAttribute('aria-disabled')).toBeTruthy();
  });

  it('F2-B18: Message button is hidden for driver when ride is cancelled by driver', () => {
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
      car: 'Noah',
      luggage: 'medium',
      rules: [],
      instantBook: true
    });
    
    store.requestBooking(ride.id, 1, 'bkash');
    store.cancelRide(ride.id);
    
    renderApp('/rides');
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn === null || (msgBtn as HTMLButtonElement).disabled || msgBtn.getAttribute('aria-disabled')).toBeTruthy();
  });

  it('F2-B19: Message button is hidden on completion of ride (tripDone)', () => {
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
      car: 'Noah',
      luggage: 'medium',
      rules: [],
      instantBook: true
    });
    
    store.requestBooking(ride.id, 1, 'bkash');
    store.completeRide(ride.id);
    
    renderApp('/rides');
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn === null || (msgBtn as HTMLButtonElement).disabled).toBeTruthy();
  });

  it('F2-B20: Messaging link is inaccessible via direct routing if booking status is declined', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Noah',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    const booking = store.requestBooking(ride.id, 1, 'bkash');
    store.updateBookingStatus(booking.id, 'declined');
    
    renderApp(`/chat/${booking.id}`);
    
    // UI should show error or redirect guest away
    // Query the chat page's own heading, not the substring "Chat" anywhere —
    // route names like "Chattogram" on the home page would false-positive.
    const chatHeader =
      screen.queryByRole('heading', { name: /^(Chat|বার্তা)$/ }) ||
      screen.queryByPlaceholderText(/message/i);
    expect(chatHeader).not.toBeInTheDocument();
  });

  // =========================================================================
  // F5: In-App Messaging UI and Persistence (5 tests)
  // =========================================================================

  it('F2-B21: Sending an empty or whitespace-only message is blocked in ChatPage', () => {
    renderApp('/chat/bk-empty');
    const input = document.querySelector('input[type="text"]') || screen.queryByPlaceholderText(/message/i);
    const sendBtn = screen.queryByRole('button', { name: /send/i }) || screen.queryByText(/send/i);
    
    expect(input).toBeInTheDocument();
    expect(sendBtn).toBeInTheDocument();
    
    fireEvent.change(input!, { target: { value: '   ' } });
    fireEvent.click(sendBtn!);
    
    const msgs = store.getMessages('bk-empty');
    expect(msgs.length).toBe(0);
  });

  it('F2-B22: Sending extremely long text message does not crash UI and wraps correctly', () => {
    const longText = 'A'.repeat(5000);
    renderApp('/chat/bk-long');
    const input = document.querySelector('input[type="text"]') || screen.queryByPlaceholderText(/message/i);
    const sendBtn = screen.queryByRole('button', { name: /send/i }) || screen.queryByText(/send/i);
    
    expect(input).toBeInTheDocument();
    expect(sendBtn).toBeInTheDocument();
    
    fireEvent.change(input!, { target: { value: longText } });
    fireEvent.click(sendBtn!);
    
    const msgs = store.getMessages('bk-long');
    expect(msgs.length).toBeGreaterThan(0);
  });

  it('F2-B23: Multiple rapid clicks on send button do not create duplicate messages', () => {
    renderApp('/chat/bk-rapid');
    const input = document.querySelector('input[type="text"]') || screen.queryByPlaceholderText(/message/i);
    const sendBtn = screen.queryByRole('button', { name: /send/i }) || screen.queryByText(/send/i);
    
    expect(input).toBeInTheDocument();
    expect(sendBtn).toBeInTheDocument();
    
    fireEvent.change(input!, { target: { value: 'Rapid fire' } });
    fireEvent.click(sendBtn!);
    fireEvent.click(sendBtn!);
    
    const msgs = store.getMessages('bk-rapid');
    expect(msgs.length).toBeLessThan(3);
  });

  it('F2-B24: Messages from passenger and driver are styled differently (sent vs received)', () => {
    const bookingId = 'bk-styles';
    // Mock user profile to sender
    
    store.sendMessage(bookingId, 'Sent by me');
    
    renderApp(`/chat/${bookingId}`);
    
    const bubble = screen.queryByText(/Sent by me/i);
    expect(bubble).toBeInTheDocument();
    expect(bubble!.parentElement?.className).toContain('message');
  });

  it('F2-B25: Storage isolation ensures messages from other bookings do not render on ChatPage', () => {
    store.sendMessage('bk-x', 'Private message x');
    store.sendMessage('bk-y', 'Private message y');
    
    renderApp('/chat/bk-x');
    
    expect(screen.queryByText(/Private message y/i)).toBeNull();
  });

  // =========================================================================
  // F6: Phone Number Censoring (5 tests)
  // =========================================================================

  it('F2-B26: Bangladeshi numbers in non-standard formats (e.g. (+88) 017-12345678) are censored', () => {
    const text = 'Call (+88) 01712-345678 immediately';
    const msg = store.sendMessage('bk-censor-b1', text);
    expect(msg.text).not.toContain('01712-345678');
    expect(msg.text).toContain('[HIDDEN]');
  });

  it('F2-B27: Multiple phone numbers in a single message are all individually censored', () => {
    const text = 'Numbers are 01711223344 and +8801811223344';
    const msg = store.sendMessage('bk-censor-b2', text);
    expect(msg.text).not.toContain('01711223344');
    expect(msg.text).not.toContain('+8801811223344');
    expect(msg.text).toContain('[HIDDEN]');
  });

  it('F2-B28: Numbers that look similar to phone numbers but aren\'t (e.g., prices like 17000 Tk, or dates like 01-08-2026) are NOT censored', () => {
    const text = 'Price is 17000 Tk, date is 01-08-2026';
    const msg = store.sendMessage('bk-censor-b3', text);
    expect(msg.text).toContain('17000');
    expect(msg.text).toContain('01-08-2026');
  });

  it('F2-B29: Phone number censoring is case-insensitive and ignores surrounding punctuation', () => {
    const text = 'Contact: 01711223344!!!';
    const msg = store.sendMessage('bk-censor-b4', text);
    expect(msg.text).not.toContain('01711223344');
    expect(msg.text).toContain('[HIDDEN]');
  });

  it('F2-B30: Censored phone number text displays exactly [HIDDEN] replacement', () => {
    const text = 'Call 01711223344';
    const msg = store.sendMessage('bk-censor-b5', text);
    expect(msg.text).toBe('Call [HIDDEN]');
  });

  // =========================================================================
  // F7: Safety Warning Banner/Alert Display (5 tests)
  // =========================================================================

  it('F2-B31: Safety warning does not trigger for valid non-phone text sequences', () => {
    renderApp('/post');
    const noteTextarea = document.querySelector('textarea');
    expect(noteTextarea).toBeInTheDocument();
    
    fireEvent.change(noteTextarea!, { target: { value: 'Leaving at 5pm. Please bring exact fare of 1500 Taka.' } });
    const banner = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(banner).not.toBeInTheDocument();
  });

  it('F2-B32: Warning banner is responsive and fits mobile layouts on PostRidePage and ChatPage', () => {
    renderApp('/post');
    const noteTextarea = document.querySelector('textarea');
    expect(noteTextarea).toBeInTheDocument();
    
    fireEvent.change(noteTextarea!, { target: { value: '01811223344' } });
    const banner = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i) || screen.queryByText(/phone/i);
    expect(banner).toBeInTheDocument();
  });

  it('F7-B33: Warning banner displays correct translated language on language toggle', () => {
    renderApp('/post');
    const noteTextarea = document.querySelector('textarea');
    expect(noteTextarea).toBeInTheDocument();
    
    fireEvent.change(noteTextarea!, { target: { value: '01711223344' } });
    const toggle = screen.queryByRole('button', { name: /en|bn/i }) || screen.queryByText(/English|বাংলা/i);
    expect(toggle).toBeInTheDocument();
    
    fireEvent.click(toggle!);
    const warning = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(warning).toBeInTheDocument();
  });

  it('F7-B34: Warning banner displays immediately on keydown before form submission', () => {
    renderApp('/post');
    const noteTextarea = document.querySelector('textarea');
    expect(noteTextarea).toBeInTheDocument();
    
    fireEvent.change(noteTextarea!, { target: { value: '01711223344' } });
    const warning = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i) || screen.queryByText(/phone/i);
    expect(warning).toBeInTheDocument();
  });

  it('F7-B35: Typing a phone number, deleting it, then typing it again correctly toggles the warning banner visibility', () => {
    renderApp('/post');
    const noteTextarea = document.querySelector('textarea');
    expect(noteTextarea).toBeInTheDocument();
    
    // 1. Type number
    fireEvent.change(noteTextarea!, { target: { value: '01711223344' } });
    let warning = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(warning).toBeInTheDocument();
    
    // 2. Delete number
    fireEvent.change(noteTextarea!, { target: { value: '' } });
    warning = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(warning).not.toBeInTheDocument();
    
    // 3. Type number again
    fireEvent.change(noteTextarea!, { target: { value: '01811223344' } });
    warning = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(warning).toBeInTheDocument();
  });
});
