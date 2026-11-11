import { addDays, bookableDays, formatDay, isIsoDate, mondayOf, today } from './dates';
import { errorMessage } from './labels';

describe('dates', () => {
  it('counts days in Brussels', () => {
    expect(today(new Date('2026-03-31T23:30:00Z'))).toBe('2026-04-01');
  });

  it('lists the working days of the next two weeks', () => {
    const days = bookableDays('2026-11-13'); // a Friday
    expect(days[0]).toBe('2026-11-13');
    expect(days[1]).toBe('2026-11-16');
    expect(days).toHaveLength(10);
  });

  it('walks across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(mondayOf('2027-01-03')).toBe('2026-12-28');
  });

  it('only accepts real dates from the address bar', () => {
    expect(isIsoDate('2026-11-12')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('<script>')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it('writes days in the page language, whatever the time zone', () => {
    expect(formatDay('2026-11-12', 'fr', { weekday: 'long', day: 'numeric', month: 'long' })).toBe(
      'jeudi 12 novembre',
    );
    expect(formatDay('2026-11-12', 'nl', { weekday: 'long', day: 'numeric', month: 'long' })).toBe(
      'donderdag 12 november',
    );
  });
});

describe('error messages', () => {
  it('turns API codes into sentences, and falls back for the rest', () => {
    expect(errorMessage({ status: 409, code: 'desk_taken' })).toContain(
      'Quelqu’un vient de réserver ce bureau',
    );
    expect(errorMessage({ status: 429, code: null })).toContain('Trop de tentatives');
    expect(errorMessage({ status: 0, code: null })).toContain('Le serveur ne répond pas');
    expect(errorMessage({ status: 500, code: null })).toContain('Une erreur est survenue');
  });
});
