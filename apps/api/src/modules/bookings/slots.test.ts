import { describe, expect, it } from 'vitest';
import { generateSlots, overlaps, weekdayOf } from './slots';

const TZ = 'Asia/Riyadh'; // UTC+3
const base = {
  date: '2026-11-01',
  timezone: TZ,
  openMinute: 10 * 60,
  closeMinute: 12 * 60,
  durationMinutes: 30,
  busy: [],
  now: new Date('2026-10-30T00:00:00Z'),
};

const hhmm = (d: Date) => d.toISOString().slice(11, 16);

describe('generateSlots', () => {
  it('returns slots in UTC for the local opening hours', () => {
    const slots = generateSlots(base);
    // 10:00 Riyadh is 07:00 UTC; last 30-min slot that fits before 12:00 starts at 11:30
    expect(slots.map(hhmm)).toEqual(['07:00', '07:15', '07:30', '07:45', '08:00', '08:15', '08:30']);
  });

  it('skips anything overlapping an existing booking', () => {
    const slots = generateSlots({
      ...base,
      busy: [{ start: new Date('2026-11-01T07:30:00Z'), end: new Date('2026-11-01T08:00:00Z') }],
    });
    // 07:15 would end at 07:45, so it's out too. 08:00 touches but doesn't overlap.
    expect(slots.map(hhmm)).toEqual(['07:00', '08:00', '08:15', '08:30']);
  });

  it('respects lead time on the same day', () => {
    const slots = generateSlots({ ...base, now: new Date('2026-11-01T06:50:00Z'), leadMinutes: 60 });
    expect(hhmm(slots[0])).toBe('08:00');
  });

  it('returns nothing when the service is longer than the opening window', () => {
    expect(generateSlots({ ...base, durationMinutes: 180 })).toEqual([]);
  });
});

describe('overlaps', () => {
  const at = (h: number) => new Date(Date.UTC(2026, 0, 1, h));
  it('treats touching intervals as free', () => {
    expect(overlaps({ start: at(1), end: at(2) }, { start: at(2), end: at(3) })).toBe(false);
  });
  it('catches containment', () => {
    expect(overlaps({ start: at(1), end: at(4) }, { start: at(2), end: at(3) })).toBe(true);
  });
});

describe('weekdayOf', () => {
  it('works regardless of server timezone', () => {
    expect(weekdayOf('2026-10-30')).toBe(5); // Friday
  });
});
