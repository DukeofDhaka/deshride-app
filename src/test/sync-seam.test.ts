import { describe, it, expect, afterEach, vi } from 'vitest';
import * as store from '../lib/store';

// The store sends every write to the server through setRemote(). These tests
// use a fake remote; supabase/tests and the two-phone run cover the real one.
afterEach(() => store.setRemote(null));

function fakeRemote(fail?: string) {
  const calls: { op: string; args: Record<string, unknown> }[] = [];
  const refresh = vi.fn();
  store.setRemote({
    call: (op, args) => {
      calls.push({ op, args });
      return fail ? Promise.reject(new Error(fail)) : Promise.resolve();
    },
    refresh
  });
  return { calls, refresh };
}

describe('server sync seam', () => {
  it('sends writes to the matching server function with the cached id', () => {
    const { calls } = fakeRemote();
    store.saveProfile({ id: 'me', name: 'Arif', phone: '01711000000', verified: { phone: true, nid: false, licence: false } });
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
    store.cancelRide(ride.id);
    expect(calls.map((c) => c.op)).toEqual(['upsert_my_profile', 'create_ride', 'cancel_ride']);
    expect((calls[1].args.p as { id: string }).id).toBe(ride.id);
    expect(calls[2].args).toEqual({ ride_id: ride.id });
  });

  it('a refused write re-pulls from the server and tells the UI why', async () => {
    const { refresh } = fakeRemote('Not enough seats left.');
    const seen = new Promise<string>((resolve) =>
      window.addEventListener('deshride-sync-error', (e) => resolve((e as CustomEvent<string>).detail), { once: true })
    );
    store.addAlert('Dhaka', 'Sylhet');
    expect(await seen).toBe('Not enough seats left.');
    expect(refresh).toHaveBeenCalled();
  });

  it('online, the server owns notifications, the sweep and demo rides', () => {
    fakeRemote();
    store.pushNotification({ userId: 'x', kind: 'requestNew' });
    expect(localStorage.getItem('deshride.notifications.v1')).toBeNull();
    store.ensureSeed();
    expect(localStorage.getItem('deshride.rides.v1')).toBeNull();
  });

  it('online, trust numbers come from the server summary', () => {
    fakeRemote();
    store.replaceCache(store.TRUST_KEY, {
      d1: { driverAvg: 4.6, driverCount: 12, passengerAvg: null, passengerCount: 0, cancelled: 1, noShows: 0, trips: 20, requestsResolved: 10, requestsAnswered: 9 }
    });
    expect(store.driverRating('d1')).toEqual({ avg: 4.6, count: 12 });
    expect(store.reliability('d1')).toEqual({ trips: 20, cancelled: 1, noShows: 0 });
    expect(store.responseStats('d1')).toEqual({ rate: 0.9, total: 10 });
  });
});
