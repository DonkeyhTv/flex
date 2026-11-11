import {
  bookableDays,
  halves,
  mondayOf,
  refuseDate,
  slotOf,
  today,
  windowEnd,
} from './calendar.js';

describe('calendar', () => {
  it('counts days in Brussels, not in UTC', () => {
    // 23:30 UTC on 31 March is already 1 April in Brussels (summer time).
    expect(today(new Date('2026-03-31T23:30:00Z'))).toBe('2026-04-01');
    // 23:30 UTC on 15 January is 00:30 on the 16th (winter time).
    expect(today(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16');
  });

  it('opens two weeks of working days, today included', () => {
    // Wednesday 11 November 2026.
    const days = bookableDays('2026-11-11');
    expect(days[0]).toBe('2026-11-11');
    expect(days.at(-1)).toBe('2026-11-24');
    expect(windowEnd('2026-11-11')).toBe('2026-11-24');
    expect(days).toHaveLength(10);
    expect(days).not.toContain('2026-11-14');
  });

  it('says why a date cannot be booked', () => {
    const from = '2026-11-11';
    expect(refuseDate('2026-11-12', from)).toBeNull();
    expect(refuseDate('2026-11-10', from)).toBe('past_date');
    expect(refuseDate('2026-11-25', from)).toBe('beyond_window');
    expect(refuseDate('2026-11-14', from)).toBe('weekend');
    expect(refuseDate('2026-02-30', from)).toBe('invalid_date');
    expect(refuseDate('tomorrow', from)).toBe('invalid_date');
  });

  it('finds the Monday of a week', () => {
    expect(mondayOf('2026-11-11')).toBe('2026-11-09');
    expect(mondayOf('2026-11-15')).toBe('2026-11-09');
    expect(mondayOf('2026-11-16')).toBe('2026-11-16');
  });

  it('maps slots to half-days and back', () => {
    for (const slot of ['day', 'am', 'pm'] as const) {
      expect(slotOf(halves(slot))).toBe(slot);
    }
  });
});
