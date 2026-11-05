import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { TranslationProvider } from '../i18n';
import * as store from '../lib/store';
import { segmentFare } from '../lib/geo';
import { localDateKey } from '../lib/time';
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
const CUMILLA = { name: 'Cumilla', district: 'Cumilla', lat: 23.46, lng: 91.18 };
const CTG = { name: 'Chattogram', district: 'Chattogram', lat: 22.36, lng: 91.83 };

function becomeUser(id: string, name: string) {
  store.saveProfile({ id, name, phone: '01711000000', verified: { phone: true, nid: false, licence: false } });
}

function postRide(overrides: Partial<store.NewRide> = {}): Ride {
  return store.createRide({
    from: DHAKA,
    to: CTG,
    departure: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    seatsTotal: 3,
    pricePerSeat: 1500,
    car: 'Toyota Axio',
    luggage: 'medium',
    rules: [],
    ...overrides
  });
}

// Moves a ride's departure into the past (as if the trip has started).
function backdate(rideId: string, hoursAgo = 1) {
  const rides = JSON.parse(localStorage.getItem('deshride.rides.v1') || '[]');
  localStorage.setItem(
    'deshride.rides.v1',
    JSON.stringify(
      rides.map((r: Ride) =>
        r.id === rideId ? { ...r, departure: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString() } : r
      )
    )
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Request expiry and notifications', () => {
  it('a request expires after 12 hours and the rider is told', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide();
    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 1, 'bkash');
    expect(Date.parse(b.expiresAt!) - Date.parse(b.createdAt)).toBeCloseTo(12 * 3600 * 1000, -4);

    store.sweepLifecycle(Date.now() + 13 * 3600 * 1000);
    expect(store.getBooking(b.id)!.status).toBe('expired');
    expect(store.myNotifications().map((n) => n.kind)).toContain('requestExpired');
    // An expired request doesn't block asking again.
    expect(store.myBookingForRide(ride.id)).toBeUndefined();
  });

  it('a request expires at departure when that is sooner than 12 hours', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ departure: new Date(Date.now() + 2 * 3600 * 1000).toISOString() });
    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 1, 'bkash');
    expect(b.expiresAt).toBe(ride.departure);
  });

  it('the driver hears about new requests and the rider about acceptance', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide();
    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 1, 'bkash');
    becomeUser('drv-1', 'Driver One');
    expect(store.myNotifications()[0].kind).toBe('requestNew');
    store.updateBookingStatus(b.id, 'accepted');
    becomeUser('rider-1', 'Rider One');
    expect(store.unreadCount()).toBe(1);
    expect(store.myNotifications()[0].kind).toBe('requestAccepted');
    store.markNotificationsRead();
    expect(store.unreadCount()).toBe(0);
  });

  it('response rate counts answered requests against expired ones', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ seatsTotal: 4 });
    becomeUser('rider-1', 'Rider One');
    const a = store.requestBooking(ride.id, 1, 'bkash');
    becomeUser('rider-2', 'Rider Two');
    store.requestBooking(ride.id, 1, 'bkash');
    becomeUser('drv-1', 'Driver One');
    store.updateBookingStatus(a.id, 'accepted');
    store.sweepLifecycle(Date.now() + 13 * 3600 * 1000);
    expect(store.responseStats('drv-1')).toEqual({ rate: 0.5, total: 2 });
  });
});

describe('No-shows and reliability', () => {
  it('a driver no-show refunds the rider in full and marks the driver', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ instantBook: true });
    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 1, 'bkash');
    expect(store.reportNoShow(b.id, 'driver')).toMatch(/after departure/);
    backdate(ride.id);
    expect(store.reportNoShow(b.id, 'driver')).toBeNull();
    const after = store.getBooking(b.id)!;
    expect(after.payStatus).toBe('refunded');
    expect(after.refundPct).toBe(100);
    expect(store.reliability('drv-1').noShows).toBe(1);
  });

  it('a passenger no-show releases the fare to the driver', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ instantBook: true });
    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 1, 'bkash');
    backdate(ride.id);
    expect(store.reportNoShow(b.id, 'guest')).toMatch(/Only the driver/);
    becomeUser('drv-1', 'Driver One');
    expect(store.reportNoShow(b.id, 'guest')).toBeNull();
    expect(store.getBooking(b.id)!.payStatus).toBe('released');
    expect(store.reliability('rider-1').noShows).toBe(1);
  });

  it('cancelling a ride with confirmed riders counts against the driver', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ instantBook: true });
    becomeUser('rider-1', 'Rider One');
    store.requestBooking(ride.id, 1, 'bkash');
    becomeUser('drv-1', 'Driver One');
    store.cancelRide(ride.id);
    expect(store.reliability('drv-1')).toMatchObject({ cancelled: 1 });
  });
});

describe('Two-way reviews', () => {
  it('only the driver rates passengers, once, after the trip', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ instantBook: true });
    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 1, 'bkash');
    expect(store.ratePassenger(b.id, 5)).toMatch(/Only the driver/);
    becomeUser('drv-1', 'Driver One');
    expect(store.ratePassenger(b.id, 5)).toMatch(/after the trip/);
    store.completeRide(ride.id);
    expect(store.ratePassenger(b.id, 4)).toBeNull();
    expect(store.ratePassenger(b.id, 1)).toMatch(/Already/);
    expect(store.passengerRating('rider-1')).toEqual({ avg: 4, count: 1 });
  });
});

describe('Report & block', () => {
  it('blocking hides the driver’s rides and stops bookings both ways', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide();
    becomeUser('rider-1', 'Rider One');
    expect(store.searchRides({ fromDistrict: 'Dhaka' }).map((r) => r.id)).toContain(ride.id);
    store.blockUser('drv-1', 'Driver One');
    expect(store.searchRides({ fromDistrict: 'Dhaka' }).map((r) => r.id)).not.toContain(ride.id);
    expect(() => store.requestBooking(ride.id, 1, 'bkash')).toThrow();
    store.unblockUser('drv-1');
    expect(store.searchRides({ fromDistrict: 'Dhaka' }).map((r) => r.id)).toContain(ride.id);

    // The driver blocking the rider also stops the booking.
    becomeUser('drv-1', 'Driver One');
    store.blockUser('rider-1', 'Rider One');
    becomeUser('rider-1', 'Rider One');
    expect(() => store.requestBooking(ride.id, 1, 'bkash')).toThrow();
  });

  it('reports are saved with phone numbers hidden', () => {
    becomeUser('rider-1', 'Rider One');
    const r = store.reportUser({ targetId: 'drv-1', targetName: 'Driver One', reason: 'offAppPayment', note: 'asked me to bKash 01711223344' });
    expect(r.note).toContain('[HIDDEN]');
    expect(store.myReports()).toHaveLength(1);
  });
});

describe('Seat requests', () => {
  it('a rider posts a request, a driver offers a matching ride, the rider is told', () => {
    const date = localDateKey(new Date(Date.now() + 48 * 3600 * 1000));
    becomeUser('rider-1', 'Rider One');
    const req = store.postRideRequest({ from: CUMILLA, to: CTG, date, seats: 1 });
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ stops: [CUMILLA] });
    const other = postRide({ to: { name: 'Sylhet', district: 'Sylhet', lat: 24.9, lng: 91.87 } });
    expect(store.openRideRequests().map((r) => r.id)).toContain(req.id);
    expect(store.matchingRidesForRequest(req).map((r) => r.id)).toEqual([ride.id]);
    expect(store.offerRideToRequest(req.id, other.id)).toMatch(/doesn't match/);
    expect(store.offerRideToRequest(req.id, ride.id)).toBeNull();
    becomeUser('rider-1', 'Rider One');
    expect(store.myRideRequests()[0].offers).toHaveLength(1);
    expect(store.myNotifications()[0].kind).toBe('seatOffer');
    store.closeRideRequest(req.id);
    expect(store.openRideRequests()).toHaveLength(0);
  });
});

describe('Repeating rides', () => {
  it('weekly dates use local days and cap the series', () => {
    // 2026-11-05 is a Thursday.
    expect(store.weeklyDates('2026-11-05', '2026-11-30', [4])).toEqual([
      '2026-11-05',
      '2026-11-12',
      '2026-11-19',
      '2026-11-26'
    ]);
    expect(store.weeklyDates('2026-11-01', '2027-06-01', [0, 1, 2, 3, 4, 5, 6])).toHaveLength(store.MAX_SERIES_DATES);
  });

  it('a series keeps the time of day and cancelling it only touches future rides', () => {
    becomeUser('drv-1', 'Driver One');
    const base = new Date(Date.now() + 24 * 3600 * 1000);
    base.setHours(5, 30, 0, 0);
    const d2 = new Date(base);
    d2.setDate(d2.getDate() + 7);
    const rides = store.createRideSeries({ ...seriesInput(), departure: base.toISOString() }, [
      localDateKey(base),
      localDateKey(d2)
    ]);
    expect(rides).toHaveLength(2);
    expect(rides[0].seriesId).toBeDefined();
    expect(rides[0].seriesId).toBe(rides[1].seriesId);
    expect(new Date(rides[1].departure).getHours()).toBe(5);
    expect(localDateKey(rides[1].departure)).toBe(localDateKey(d2));
    backdate(rides[0].id);
    expect(store.cancelRideSeries(rides[0].seriesId!)).toBe(1);
    expect(store.getRide(rides[0].id)!.status).toBe('active');
    expect(store.getRide(rides[1].id)!.status).toBe('cancelled');
  });
});

function seriesInput(): store.NewRide {
  return {
    from: DHAKA,
    to: CTG,
    departure: new Date().toISOString(),
    seatsTotal: 3,
    pricePerSeat: 1500,
    car: 'Toyota Axio',
    luggage: 'medium',
    rules: []
  };
}

describe('Money: segments, breakdown, receipt and earnings', () => {
  it('a stopover segment pays a share of the fare', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ stops: [CUMILLA], instantBook: true });
    const part = segmentFare(ride, 1, 2);
    expect(part).toBeGreaterThanOrEqual(100);
    expect(part).toBeLessThan(1500);
    expect(part % 10).toBe(0);
    expect(segmentFare(ride, 0, 2)).toBe(1500);

    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 2, 'nagad', undefined, { pickupIdx: 1, dropoffIdx: 2 });
    expect(b.farePerSeat).toBe(part);
    expect(store.fareBreakdown(b, ride).gross).toBe(part * 2);
  });

  it('the 12% commission comes out of the driver payout, not the rider', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ instantBook: true });
    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 1, 'bkash');
    expect(store.fareBreakdown(b, ride)).toEqual({ gross: 1500, commission: 180, driverNet: 1320 });
    becomeUser('drv-1', 'Driver One');
    expect(store.driverEarnings()).toMatchObject({ held: 1320, releasing: 0, paid: 0 });
    store.completeRide(ride.id);
    expect(store.driverEarnings()).toMatchObject({ held: 0, releasing: 1320 });
  });

  it('the receipt page shows the fare and a refund', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ instantBook: true, departure: new Date(Date.now() + 72 * 3600 * 1000).toISOString() });
    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 1, 'bkash');
    store.cancelMyBooking(b.id);
    renderApp(`/receipt/${b.id}`);
    expect(screen.getByRole('heading', { name: 'Receipt' })).toBeInTheDocument();
    expect(screen.getByText('Refunded (100%)')).toBeInTheDocument();
    expect(screen.getByText('Booking fee')).toBeInTheDocument();
  });
});

describe('Profiles and alerts', () => {
  it('bios are capped and phone numbers hidden', () => {
    becomeUser('drv-1', 'Driver One');
    store.saveProfile({ ...store.getProfile(), bio: 'Call me on 01711223344 ' + 'x'.repeat(300) });
    const bio = store.getProfile().bio!;
    expect(bio).toContain('[HIDDEN]');
    expect(bio.length).toBeLessThanOrEqual(store.BIO_MAX);
  });

  it('a new ride on a saved route notifies the rider and shows on home', () => {
    becomeUser('rider-1', 'Rider One');
    store.addAlert('Dhaka', 'Chattogram');
    expect(store.findAlert('Dhaka', 'Chattogram')).toBeDefined();
    becomeUser('drv-1', 'Driver One');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 1000);
    const ride = postRide();
    vi.useRealTimers();
    becomeUser('rider-1', 'Rider One');
    expect(store.myNotifications()[0]).toMatchObject({ kind: 'alertMatch', rideId: ride.id });
    expect(store.alertMatches()[0].rides.map((r) => r.id)).toEqual([ride.id]);
    store.markAlertRidesSeen([ride.id]);
    expect(store.alertMatches()).toHaveLength(0);
  });

  it('search offers "Alert me" and toggles it on', () => {
    becomeUser('rider-1', 'Rider One');
    renderApp('/results?from=Dhaka&to=Rangpur');
    fireEvent.click(screen.getByRole('button', { name: 'Alert me' }));
    expect(screen.getByRole('button', { name: /Alert on/ })).toBeInTheDocument();
    expect(store.findAlert('Dhaka', 'Rangpur')).toBeDefined();
  });

  it('trip safety tools appear only once the seat is confirmed', () => {
    becomeUser('drv-1', 'Driver One');
    const ride = postRide({ instantBook: false });
    becomeUser('rider-1', 'Rider One');
    const b = store.requestBooking(ride.id, 1, 'bkash');
    const first = renderApp(`/ride/${ride.id}`);
    expect(screen.queryByText('Emergency 999')).toBeNull();
    first.unmount();
    becomeUser('drv-1', 'Driver One');
    store.updateBookingStatus(b.id, 'accepted');
    becomeUser('rider-1', 'Rider One');
    renderApp(`/ride/${ride.id}`);
    expect(screen.getByText('Emergency 999').closest('a')).toHaveAttribute('href', 'tel:999');
    expect(screen.getByRole('button', { name: /Share trip/ })).toBeInTheDocument();
  });
});
