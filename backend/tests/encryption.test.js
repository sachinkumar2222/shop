import { describe, it, expect, beforeAll } from 'vitest';
import {
  encryptPii,
  decryptPii,
  isPiiEncrypted,
  getUserEmailLookup,
  getBarcodeLookup,
  decryptUser,
  decryptProduct,
  decryptCategory,
  decryptProductBatch,
} from '../src/utils/customer-privacy.js';

describe('Data-Crypto and End-to-End Encryption Suite', () => {
  beforeAll(() => {
    process.env.PII_ENCRYPTION_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  });

  describe('Core AES-256-GCM Encryption', () => {
    it('encrypts and decrypts strings correctly with enc:v1 prefix', () => {
      const plaintext = 'Chandan Agarbatti Special 100g';
      const ciphertext = encryptPii(plaintext);

      expect(ciphertext).toMatch(/^enc:v1:/);
      expect(isPiiEncrypted(ciphertext)).toBe(true);
      expect(ciphertext).not.toBe(plaintext);

      const decrypted = decryptPii(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it('returns null/undefined intact', () => {
      expect(encryptPii(null)).toBe(null);
      expect(decryptPii(null)).toBe(null);
      expect(encryptPii(undefined)).toBe(undefined);
      expect(decryptPii(undefined)).toBe(undefined);
    });

    it('is idempotent when encrypting already encrypted string', () => {
      const ciphertext = encryptPii('Hello World');
      const doubleEncrypted = encryptPii(ciphertext);
      expect(doubleEncrypted).toBe(ciphertext);
      expect(decryptPii(doubleEncrypted)).toBe('Hello World');
    });
  });

  describe('Deterministic Lookup Hashes', () => {
    it('generates consistent email lookup hashes for normalized emails', () => {
      const email1 = 'Admin@ShreePooja.Com  ';
      const email2 = 'admin@shreepooja.com';
      const hash1 = getUserEmailLookup(email1);
      const hash2 = getUserEmailLookup(email2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('generates consistent barcode lookup hashes', () => {
      const barcode1 = '8901234567890';
      const barcode2 = ' 8901234567890 ';
      const hash1 = getBarcodeLookup(barcode1);
      const hash2 = getBarcodeLookup(barcode2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('Domain Object Decryption Helpers', () => {
    it('decrypts user payload correctly', () => {
      const user = {
        id: 'u-1',
        name: encryptPii('Ravi Saini'),
        email: encryptPii('ravi@shreepooja.com'),
        emailLookup: getUserEmailLookup('ravi@shreepooja.com'),
        role: 'ADMIN',
      };

      const decrypted = decryptUser(user);
      expect(decrypted.name).toBe('Ravi Saini');
      expect(decrypted.email).toBe('ravi@shreepooja.com');
      expect(decrypted.role).toBe('ADMIN');
      expect(decrypted.emailLookup).toBeUndefined(); // stripped from public user object
    });

    it('decrypts category payload correctly', () => {
      const category = {
        id: 'c-1',
        nameEn: encryptPii('Havan Samagri'),
        nameHi: encryptPii('हवन सामग्री'),
      };

      const decrypted = decryptCategory(category);
      expect(decrypted.nameEn).toBe('Havan Samagri');
      expect(decrypted.nameHi).toBe('हवन सामग्री');
    });

    it('decrypts product batch vendor correctly', () => {
      const batch = {
        id: 'b-1',
        vendor: encryptPii('Gupta Traders Ajmer'),
        purchaseCost: 120,
      };

      const decrypted = decryptProductBatch(batch);
      expect(decrypted.vendor).toBe('Gupta Traders Ajmer');
      expect(decrypted.purchaseCost).toBe(120);
    });

    it('decrypts nested product with units and batches', () => {
      const product = {
        id: 'p-1',
        nameEn: encryptPii('Pure Chandan Tika'),
        nameHi: encryptPii('शुद्ध चंदन टीका'),
        barcode: encryptPii('8901112223334'),
        barcodeLookup: getBarcodeLookup('8901112223334'),
        category: {
          nameEn: encryptPii('Pooja Essentials'),
          nameHi: encryptPii('पूजा सामग्री'),
        },
        units: [
          {
            nameEn: 'piece',
            nameHi: encryptPii('पीस'),
            barcode: encryptPii('8901112223334'),
          },
        ],
        batches: [
          {
            id: 'b-1',
            vendor: encryptPii('Ayodhya Wholesalers'),
          },
        ],
      };

      const decrypted = decryptProduct(product);
      expect(decrypted.nameEn).toBe('Pure Chandan Tika');
      expect(decrypted.nameHi).toBe('शुद्ध चंदन टीका');
      expect(decrypted.barcode).toBe('8901112223334');
      expect(decrypted.barcodeLookup).toBeUndefined();
      expect(decrypted.category.nameEn).toBe('Pooja Essentials');
      expect(decrypted.units[0].nameHi).toBe('पीस');
      expect(decrypted.batches[0].vendor).toBe('Ayodhya Wholesalers');
    });
  });
});
