import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../src/utils/phone.js';

describe('Phone Number Normalizer', () => {
  it('normalizes 10-digit number', () => {
    expect(normalizePhone('9829012345')).toBe('+919829012345');
  });

  it('normalizes number starting with 0', () => {
    expect(normalizePhone('09829012345')).toBe('+919829012345');
  });

  it('normalizes number starting with 91', () => {
    expect(normalizePhone('919829012345')).toBe('+919829012345');
  });

  it('keeps already normalized +91 number', () => {
    expect(normalizePhone('+919829012345')).toBe('+919829012345');
  });

  it('strips spaces and dashes', () => {
    expect(normalizePhone('+91 98290-12345')).toBe('+919829012345');
  });

  it('returns null for empty input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});
