import { describe, it, expect } from 'vitest';
import { PAYMENT_MODES } from '../src/constants/index.js';

describe('Payment Mode Validation', () => {
  const validModes = ['CASH', 'UPI', 'CARD', 'KHATA'];

  it('contains exactly the 4 required payment modes', () => {
    expect(PAYMENT_MODES).toHaveLength(4);
    expect(PAYMENT_MODES).toEqual(expect.arrayContaining(validModes));
  });

  it('rejects arbitrary payment mode strings', () => {
    const invalid = ['PAYTM', 'CRYPTO', 'BARTER', '', 'cash'];
    invalid.forEach((mode) => {
      expect(PAYMENT_MODES.includes(mode)).toBe(false);
    });
  });
});
