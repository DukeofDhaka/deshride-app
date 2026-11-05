import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { TranslationProvider } from '../i18n';
import * as store from '../lib/store';
import { guardMessage, censorPhoneNumbers, detectOffAppPayment, containsContactInfo } from '../lib/contactGuard';
import { seedAcceptedBooking } from './helpers';

function renderApp(route = '/') {
  return render(
    <TranslationProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </TranslationProvider>
  );
}

describe('contact guard', () => {
  it('hides numbers written in digits, including the country code', () => {
    expect(guardMessage('My number is +8801712345678, call me').text).toBe('My number is [HIDDEN], call me');
  });

  it('hides numbers spelled out in English and Bangla', () => {
    for (const text of [
      'zero one seven one two three four five six seven eight',
      'oh one seven 1 2 three four 5 6 seven eight',
      'শূন্য এক সাত এক দুই তিন চার পাঁচ ছয় সাত আট',
      'জিরো ওয়ান সেভেন ওয়ান টু থ্রি ফোর ফাইভ সিক্স সেভেন এইট'
    ]) {
      const r = guardMessage(text);
      expect(r.text).toBe('[HIDDEN]');
      expect(r.flags).toContain('contact');
    }
  });

  it('hides a number typed a few digits per message', () => {
    expect(guardMessage('01', []).flags).toEqual([]);
    expect(guardMessage('712', ['01']).flags).toEqual([]);
    const last = guardMessage('345678', ['01', '712']);
    expect(last.text).toBe('[HIDDEN]');
    expect(last.flags).toContain('contact');
  });

  it('hides messaging links, app handles and email addresses', () => {
    expect(censorPhoneNumbers('whatsapp me at wa.me/8801711')).not.toMatch(/wa\.me|whatsapp me/i);
    expect(censorPhoneNumbers('join t.me/deshride_driver')).toBe('join [HIDDEN]');
    expect(censorPhoneNumbers('mail me a.b@gmail.com')).toBe('mail me [HIDDEN]');
    expect(containsContactInfo('ইমোতে নক দিন')).toBe(true);
  });

  it('leaves prices, dates, times and everyday counting alone', () => {
    for (const text of [
      'fare is 17000 Tk on 01-08-2026',
      'I have one bag and two kids, leaving at seven',
      'এক জন যাত্রী, দুই ব্যাগ',
      'Meet at gate 2 at 07:30'
    ]) {
      expect(guardMessage(text)).toEqual({ text, flags: [] });
    }
  });

  it('tags talk of paying outside the app without hiding it', () => {
    for (const text of ['Just bKash me the fare', 'pay me in cash at pickup', 'আমাকে বিকাশ করে দিন', 'ক্যাশ দিলেই হবে', 'অগ্রিম ৫০০ টাকা দিন']) {
      expect(detectOffAppPayment(text)).toBe(true);
      const r = guardMessage(text);
      expect(r.text).toBe(text);
      expect(r.flags).toEqual(['payment']);
    }
    expect(detectOffAppPayment('I paid with bKash in the app')).toBe(false);
  });
});

describe('chat and booking screens', () => {
  it('a split number is hidden when sent through the store', () => {
    const id = seedAcceptedBooking();
    store.sendMessage(id, 'my no 01');
    store.sendMessage(id, '7123');
    const last = store.sendMessage(id, '45678');
    expect(last.text).toBe('[HIDDEN]');
    expect(last.flags).toContain('contact');
  });

  it('the chat pins the pay-in-app notice and warns under payment talk', () => {
    const id = seedAcceptedBooking();
    // The other party (the driver) asks for cash.
    const booking = store.getBooking(id)!;
    const msgs = JSON.parse(localStorage.getItem('deshride.messages.v1') || '[]');
    msgs.push({
      id: 'msg-x',
      bookingId: id,
      senderId: 'drv-helper',
      senderName: 'Helper Driver',
      text: 'just pay me cash, cheaper',
      flags: ['payment'],
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('deshride.messages.v1', JSON.stringify(msgs));
    renderApp(`/chat/${booking.id}`);
    expect(screen.getByText(/Phone numbers and contact details are hidden here/)).toBeInTheDocument();
    expect(screen.getByText(/don't pay outside the app/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Report or block Helper Driver/ }));
    const reason = screen.getByLabelText('Asked for payment outside DeshRide') as HTMLInputElement;
    expect(reason.checked).toBe(true);
  });

  it('typing a payment request shows a warning before sending', () => {
    const id = seedAcceptedBooking();
    renderApp(`/chat/${id}`);
    fireEvent.change(screen.getByPlaceholderText(/type a message/i), { target: { value: 'can I bKash you directly?' } });
    expect(screen.getByText(/all payments go through the app/)).toBeInTheDocument();
  });

  it('no phone numbers or call links on a confirmed booking, only 999', () => {
    store.saveProfile({ id: 'rider-1', name: 'Rider', phone: '01812000000', verified: { phone: true, nid: false, licence: false } });
    const id = seedAcceptedBooking();
    const rideId = store.getBooking(id)!.rideId;
    expect(store.getBooking(id)!.guestPhone).toBeUndefined();
    const { container, unmount } = renderApp(`/ride/${rideId}`);
    const tel = [...container.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href'));
    expect(tel).toEqual(['tel:999']);
    expect(container.textContent).not.toContain('01812000000');
    unmount();
    const rides = renderApp('/rides');
    expect(rides.container.querySelectorAll('a[href^="tel:"]')).toHaveLength(0);
  });

  it('posted rides no longer carry the driver phone number', () => {
    store.saveProfile({ id: 'drv-x', name: 'D', phone: '01712000000', verified: { phone: true, nid: false, licence: false } });
    const ride = store.createRide({
      from: { name: 'Dhaka', district: 'Dhaka', lat: 23.75, lng: 90.38 },
      to: { name: 'Sylhet', district: 'Sylhet', lat: 24.9, lng: 91.87 },
      departure: new Date(Date.now() + 864e5).toISOString(),
      seatsTotal: 3,
      pricePerSeat: 1200,
      car: 'Axio',
      luggage: 'small',
      rules: []
    });
    expect(ride.driver.phone).toBeUndefined();
  });
});
