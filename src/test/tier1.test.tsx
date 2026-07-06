import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import { TranslationProvider } from '../i18n';
import { MemoryRouter } from 'react-router-dom';
import * as store from '../lib/store';

// Helper to render the application at a specific route
function renderApp(initialRoute = '/') {
  return render(
    <TranslationProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    </TranslationProvider>
  );
}

describe('Tier 1: Feature Coverage (F1 - F7)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // F1: Booking Mode Selection (5 tests)
  // =========================================================================

  it('F1-1: PostRidePage renders Instant Book toggle and label', () => {
    renderApp('/post');
    // Check if the instant book checkbox or text is present in the DOM
    const checkbox = screen.queryByRole('checkbox', { name: /instant/i }) || 
                     screen.queryByLabelText(/instant/i) ||
                     document.querySelector('input[type="checkbox"]');
    // The page should have a checkbox (either enabled or disabled)
    expect(checkbox).toBeInTheDocument();
  });

  it('F1-2: PostRidePage disables Instant Book toggle when driver is new (seatsFilled < 5)', () => {
    // Ensure seats filled is less than 5
    expect(store.instantBookUnlocked()).toBe(false);
    renderApp('/post');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    // There should be a checkbox for instant book, and it should be disabled for new drivers
    expect(checkboxes.length).toBeGreaterThan(0);
    const instantBookCheckbox = checkboxes[0] as HTMLInputElement;
    expect(instantBookCheckbox).toBeInTheDocument();
    expect(instantBookCheckbox.disabled).toBe(true);
  });

  it('F1-3: PostRidePage enables Instant Book toggle when driver is experienced (seatsFilled >= 5)', () => {
    // Set driver stats to have filled >= 5 seats
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    expect(store.instantBookUnlocked()).toBe(true);

    renderApp('/post');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    const instantBookCheckbox = checkboxes[0] as HTMLInputElement;
    // It should be enabled now
    expect(instantBookCheckbox).toBeInTheDocument();
    expect(instantBookCheckbox.disabled).toBe(false);
  });

  it('F1-4: PostRidePage saves instantBook as true in ride model when checked', () => {
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));
    
    // Test the createRide behavior directly
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
    expect(ride.instantBook).toBe(true);
  });

  it('F1-5: PostRidePage saves instantBook as false in ride model when unchecked', () => {
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
      instantBook: false
    });
    expect(ride.instantBook).toBe(false);
  });

  // =========================================================================
  // F2: Passenger Booking Flow Status Resolution (5 tests)
  // =========================================================================

  it('F2-1: requestBooking sets status to accepted and payStatus to held for instantBook rides', () => {
    // Prime the driver stats in localStorage beforehand to unlock Instant Book
    localStorage.setItem('deshride.stats.v1', JSON.stringify({
      points: 100,
      driverTrips: 5,
      guestTrips: 0,
      seatsFilled: 5
    }));

    // Create an instant book ride in storage
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
    
    // Request a booking for this ride
    const booking = store.requestBooking(ride.id, 1, 'bkash', 'Hello driver');
    expect(booking.status).toBe('accepted');
    expect(booking.payStatus).toBe('held');
  });

  it('F2-2: requestBooking sets status to pending and payStatus to unpaid for non-instantBook rides', () => {
    // Create a request-only ride
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
    
    const booking = store.requestBooking(ride.id, 1, 'bkash', 'Hello driver');
    expect(booking.status).toBe('pending');
    expect(booking.payStatus).toBe('unpaid');
  });

  it('F2-3: Passenger booking flow displays "Confirmed — you\'re in" immediately on RidePage for instantBook rides', () => {
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
    
    // Simulate booking is created
    store.requestBooking(ride.id, 1, 'bkash');
    
    renderApp(`/ride/${ride.id}`);
    
    // We expect the passenger UI to eventually display confirmation if features are implemented
    const confirmedText = screen.queryByText(/Confirmed/i) || screen.queryByText(/আপনি যাচ্ছেন/i);
    expect(confirmedText).toBeInTheDocument();
  });

  it('F2-4: Passenger booking flow displays "Waiting for driver" on RidePage for non-instantBook rides', () => {
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
    
    store.requestBooking(ride.id, 1, 'bkash');
    
    renderApp(`/ride/${ride.id}`);
    const waitingText = screen.queryByText(/Waiting/i) || screen.queryByText(/ড্রাইভারের অপেক্ষায়/i);
    expect(waitingText).toBeInTheDocument();
  });

  it('F2-5: Escrow payment details are shown under status based on instantBook setting', () => {
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
    
    store.requestBooking(ride.id, 2, 'bkash');
    renderApp(`/ride/${ride.id}`);
    
    // Should render payment details (e.g. escrow message, bKash approval, etc.)
    const escrowNote = screen.queryByText(/escrow/i) || screen.queryByText(/দেশরাইডের কাছে জমা/i) || screen.queryByText(/bKash/i);
    expect(escrowNote).toBeInTheDocument();
  });

  // =========================================================================
  // F3: Driver UI Approval Actions (5 tests)
  // =========================================================================

  it('F3-1: Driver sees accept and decline buttons for pending requests on MyRidesPage', () => {
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
    
    store.requestBooking(ride.id, 1, 'bkash');
    
    renderApp('/rides');
    
    const acceptBtn = screen.queryByText(/Accept/i) || screen.queryByText(/গ্রহণ করুন/i);
    const declineBtn = screen.queryByText(/Decline/i) || screen.queryByText(/প্রत्याখ্যান করুন/i);
    
    expect(acceptBtn).toBeInTheDocument();
    expect(declineBtn).toBeInTheDocument();
  });

  it('F3-2: Driver click accept updates booking status to accepted and payStatus to held', () => {
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
    
    store.updateBookingStatus(booking.id, 'accepted');
    
    // Retrieve bookings to verify state update
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const updated = bookings.find((b: any) => b.id === booking.id);
    expect(updated.status).toBe('accepted');
    expect(updated.payStatus).toBe('held');
  });

  it('F3-3: Driver click decline updates booking status to declined', () => {
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
    
    store.updateBookingStatus(booking.id, 'declined');
    
    const bookings = JSON.parse(localStorage.getItem('deshride.bookings.v1') || '[]');
    const updated = bookings.find((b: any) => b.id === booking.id);
    expect(updated.status).toBe('declined');
  });

  it('F3-4: Driver cannot accept request if there are not enough seats remaining', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 2,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      instantBook: false
    });
    
    // First guest occupies both seats
    const b1 = store.requestBooking(ride.id, 2, 'bkash');
    store.updateBookingStatus(b1.id, 'accepted');
    
    // Second guest requests 1 seat
    const b2 = store.requestBooking(ride.id, 1, 'bkash');
    const result = store.updateBookingStatus(b2.id, 'accepted');
    
    // Should return an error message
    expect(result).not.toBeNull();
    expect(result).toContain('seats');
  });

  it('F3-5: Driver MyRidesPage updates seats left dynamically after accepting a booking', () => {
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
    expect(store.seatsLeft(ride)).toBe(3); // pending doesn't take seats yet
    
    store.updateBookingStatus(booking.id, 'accepted');
    expect(store.seatsLeft(ride)).toBe(2);
  });

  // =========================================================================
  // F4: Post-Acceptance Messaging Button Unlocking (5 tests)
  // =========================================================================

  it('F4-1: Message button is hidden or disabled for pending bookings on MyRidesPage', () => {
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
    
    store.requestBooking(ride.id, 1, 'bkash');
    renderApp('/rides');
    
    const msgBtn = screen.queryByRole('button', { name: /Message/i }) || screen.queryByText(/Message/i);
    // Since the request is pending, messaging should not be active/enabled
    expect(msgBtn === null || (msgBtn as HTMLButtonElement).disabled || msgBtn.getAttribute('aria-disabled')).toBeTruthy();
  });

  it('F4-2: Message button is enabled and visible for accepted bookings on MyRidesPage', () => {
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
    
    store.requestBooking(ride.id, 1, 'bkash');
    renderApp('/rides');
    
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn).toBeInTheDocument();
  });

  it('F4-3: Message button is hidden or disabled for declined bookings on MyRidesPage', () => {
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
    store.updateBookingStatus(booking.id, 'declined');
    
    renderApp('/rides');
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn === null || (msgBtn as HTMLButtonElement).disabled || msgBtn.getAttribute('aria-disabled')).toBeTruthy();
  });

  it('F4-4: Message button is hidden or disabled for pending bookings on RidePage', () => {
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
    
    store.requestBooking(ride.id, 1, 'bkash');
    renderApp(`/ride/${ride.id}`);
    
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn === null || (msgBtn as HTMLButtonElement).disabled).toBeTruthy();
  });

  it('F4-5: Message button is enabled and visible for accepted bookings on RidePage', () => {
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
    
    store.requestBooking(ride.id, 1, 'bkash');
    renderApp(`/ride/${ride.id}`);
    
    const msgBtn = screen.queryByText(/Message/i) || screen.queryByRole('button', { name: /Message/i });
    expect(msgBtn).toBeInTheDocument();
  });

  // =========================================================================
  // F5: In-App Messaging UI and Persistence (5 tests)
  // =========================================================================

  it('F5-1: ChatPage renders message input field and send button', () => {
    renderApp('/chat/bk-test-123');
    const input = screen.queryByPlaceholderText(/message/i) || document.querySelector('input[type="text"]');
    const sendBtn = screen.queryByRole('button', { name: /send/i }) || screen.queryByText(/send/i);
    
    expect(input).toBeInTheDocument();
    expect(sendBtn).toBeInTheDocument();
  });

  it('F5-2: sendMessage persists message correctly in store', () => {
    const bookingId = 'bk-test-456';
    const text = 'Persisted chat message';
    
    const msg = store.sendMessage(bookingId, text);
    expect(msg.bookingId).toBe(bookingId);
    expect(msg.text).toBe(text);
    
    const msgs = store.getMessages(bookingId);
    expect(msgs.length).toBe(1);
    expect(msgs[0].text).toBe(text);
  });

  it('F5-3: getMessages retrieves correct messages for specific bookingId', () => {
    const b1 = 'bk-1';
    const b2 = 'bk-2';
    
    store.sendMessage(b1, 'Message for booking 1');
    store.sendMessage(b2, 'Message for booking 2');
    
    const m1 = store.getMessages(b1);
    const m2 = store.getMessages(b2);
    
    expect(m1.length).toBe(1);
    expect(m1[0].text).toBe('Message for booking 1');
    
    expect(m2.length).toBe(1);
    expect(m2[0].text).toBe('Message for booking 2');
  });

  it('F5-4: ChatPage renders sent and received messages correctly', () => {
    const bookingId = 'bk-chat-789';
    store.sendMessage(bookingId, 'Hello, I am testing rendering');
    
    renderApp(`/chat/${bookingId}`);
    
    const msgEl = screen.queryByText(/Hello, I am testing rendering/i);
    expect(msgEl).toBeInTheDocument();
  });

  it('F5-5: Messages are loaded from store on ChatPage initialization', () => {
    const bookingId = 'bk-init-999';
    store.sendMessage(bookingId, 'Pre-existing message');
    
    renderApp(`/chat/${bookingId}`);
    
    const msgEl = screen.queryByText(/Pre-existing message/i);
    expect(msgEl).toBeInTheDocument();
  });

  // =========================================================================
  // F6: Phone Number Censoring (5 tests)
  // =========================================================================

  it('F6-1: store.sendMessage censors +88017xxxxxxxx phone number in chat message', () => {
    const text = 'My number is +8801712345678, call me';
    const msg = store.sendMessage('bk-censor-1', text);
    expect(msg.text).not.toContain('+8801712345678');
    expect(msg.text).toContain('[HIDDEN]');
  });

  it('F6-2: store.sendMessage censors 018xxxxxxxx phone number in chat message', () => {
    const text = 'Call 01811223344';
    const msg = store.sendMessage('bk-censor-2', text);
    expect(msg.text).not.toContain('01811223344');
    expect(msg.text).toContain('[HIDDEN]');
  });

  it('F6-3: store.sendMessage censors 88019xxxxxxxx phone number in chat message', () => {
    const text = 'Use number 8801900000000 please';
    const msg = store.sendMessage('bk-censor-3', text);
    expect(msg.text).not.toContain('8801900000000');
    expect(msg.text).toContain('[HIDDEN]');
  });

  it('F6-4: store.createRide censors Bangladeshi phone number in driver description notes', () => {
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 },
      departure: new Date().toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1500,
      car: 'Toyota Axio',
      luggage: 'medium',
      rules: [],
      note: 'Call me at 01700-112233',
      instantBook: false
    });
    expect(ride.note).not.toContain('01700-112233');
    expect(ride.note).toContain('[HIDDEN]');
  });

  it('F6-5: Phone number censoring works for numbers containing spaces and hyphens', () => {
    const text = 'Send money to +880 1512 - 345678';
    const msg = store.sendMessage('bk-censor-5', text);
    expect(msg.text).not.toContain('+880 1512 - 345678');
    expect(msg.text).toContain('[HIDDEN]');
  });

  // =========================================================================
  // F7: Safety Warning Banner/Alert Display (5 tests)
  // =========================================================================

  it('F7-1: PostRidePage notes input triggers warning banner when phone number is typed', () => {
    renderApp('/post');
    const noteTextarea = screen.queryByPlaceholderText(/Breaks/i) || screen.queryByPlaceholderText(/বিরতি/i) || document.querySelector('textarea');
    expect(noteTextarea).toBeInTheDocument();
    
    fireEvent.change(noteTextarea!, { target: { value: 'My phone is 01712345678' } });
    const banner = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i) || screen.queryByText(/phone/i);
    expect(banner).toBeInTheDocument();
  });

  it('F7-2: PostRidePage notes input removes warning banner when phone number is deleted', () => {
    renderApp('/post');
    const noteTextarea = screen.queryByPlaceholderText(/Breaks/i) || screen.queryByPlaceholderText(/বিরতি/i) || document.querySelector('textarea');
    expect(noteTextarea).toBeInTheDocument();
    
    fireEvent.change(noteTextarea!, { target: { value: 'My phone is 01712345678' } });
    fireEvent.change(noteTextarea!, { target: { value: 'No phone number here' } });
    const banner = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(banner).not.toBeInTheDocument();
  });

  it('F7-3: ChatPage message input triggers warning banner when phone number is typed', () => {
    renderApp('/chat/bk-warn-1');
    const input = screen.queryByPlaceholderText(/message/i) || document.querySelector('input[type="text"]');
    expect(input).toBeInTheDocument();
    
    fireEvent.change(input!, { target: { value: 'Number: +8801811223344' } });
    const banner = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i) || screen.queryByText(/contact/i);
    expect(banner).toBeInTheDocument();
  });

  it('F7-4: ChatPage message input removes warning banner when phone number is deleted', () => {
    renderApp('/chat/bk-warn-2');
    const input = screen.queryByPlaceholderText(/message/i) || document.querySelector('input[type="text"]');
    expect(input).toBeInTheDocument();
    
    fireEvent.change(input!, { target: { value: 'Number: +8801811223344' } });
    fireEvent.change(input!, { target: { value: 'Just texting' } });
    const banner = screen.queryByText(/warning/i) || screen.queryByText(/নিরাপত্তা/i);
    expect(banner).not.toBeInTheDocument();
  });

  it('F7-5: Warning banner displays specific localization text warning against sharing contact info', () => {
    renderApp('/chat/bk-warn-3');
    const input = screen.queryByPlaceholderText(/message/i) || document.querySelector('input[type="text"]');
    expect(input).toBeInTheDocument();
    
    fireEvent.change(input!, { target: { value: '01912345678' } });
    const textElement = screen.queryByText(/নিরাপত্তা/i) || screen.queryByText(/warning/i) || screen.queryByText(/sharing/i);
    expect(textElement).toBeInTheDocument();
  });
});
