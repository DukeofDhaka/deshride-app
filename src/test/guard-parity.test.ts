import { describe, it, expect } from 'vitest';
import cases from './fixtures/guard-cases.json';
import { guardMessage } from '../lib/contactGuard';

// The same cases run against the SQL guard in supabase/tests/run.sh, so the
// app and the server hide exactly the same things.
describe('contact guard parity cases', () => {
  for (const c of cases as { text: string; history?: string[]; out: string; flags: string[] }[]) {
    it(c.text, () => {
      expect(guardMessage(c.text, c.history ?? [])).toEqual({ text: c.out, flags: c.flags });
    });
  }
});
