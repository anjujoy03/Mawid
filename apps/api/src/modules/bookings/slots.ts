import { addMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

export type Interval = { start: Date; end: Date };

export interface SlotOptions {
  /** YYYY-MM-DD, in the business timezone */
  date: string;
  timezone: string;
  openMinute: number;
  closeMinute: number;
  durationMinutes: number;
  busy: Interval[];
  now: Date;
  stepMinutes?: number;
  /** Don't offer slots starting sooner than this — the barber needs a heads-up. */
  leadMinutes?: number;
}

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** 0 = Sunday. The weekday of a calendar date doesn't depend on timezone. */
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export function generateSlots(opts: SlotOptions): Date[] {
  const step = opts.stepMinutes ?? 15;
  const earliest = addMinutes(opts.now, opts.leadMinutes ?? 60);
  const midnight = fromZonedTime(`${opts.date}T00:00:00`, opts.timezone);

  const slots: Date[] = [];
  for (let m = opts.openMinute; m + opts.durationMinutes <= opts.closeMinute; m += step) {
    // Adding minutes to local midnight is wrong by an hour on DST switch days.
    // Gulf timezones have no DST so this is fine for now.
    const start = addMinutes(midnight, m);
    const slot = { start, end: addMinutes(start, opts.durationMinutes) };

    if (start < earliest) continue;
    if (opts.busy.some((b) => overlaps(slot, b))) continue;
    slots.push(start);
  }
  return slots;
}
