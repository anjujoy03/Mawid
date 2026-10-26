import { describe, expect, it } from 'vitest';
import { normalizeSaudiMobile, toLatinDigits } from './phone';

describe('normalizeSaudiMobile', () => {
  it.each([
    ['0501234567', '966501234567'],
    ['501234567', '966501234567'],
    ['+966 50 123 4567', '966501234567'],
    ['00966501234567', '966501234567'],
    ['050-123-4567', '966501234567'],
    ['٠٥٠١٢٣٤٥٦٧', '966501234567'],
    ['۰۵۰۱۲۳۴۵۶۷', '966501234567'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeSaudiMobile(input)).toBe(expected);
  });

  it.each(['', '0112345678', '05012345', '+971501234567', 'call me'])('rejects %j', (input) => {
    expect(normalizeSaudiMobile(input)).toBeNull();
  });
});

describe('toLatinDigits', () => {
  it('leaves non-digit text alone', () => {
    expect(toLatinDigits('غرفة ٣')).toBe('غرفة 3');
  });
});
