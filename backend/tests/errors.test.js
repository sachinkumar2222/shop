import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InsufficientStockError,
} from '../src/utils/AppError.js';

describe('AppError Classes', () => {
  it('AppError has correct statusCode and code', () => {
    const err = new AppError('Something went wrong', 500, 'SERVER_ERROR');
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('SERVER_ERROR');
    expect(err.isOperational).toBe(true);
  });

  it('ValidationError returns 400', () => {
    const err = new ValidationError('Name is required');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('AuthenticationError returns 401', () => {
    const err = new AuthenticationError('Invalid token');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
  });

  it('AuthorizationError returns 403', () => {
    const err = new AuthorizationError('Forbidden');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('AUTHORIZATION_ERROR');
  });

  it('NotFoundError returns 404', () => {
    const err = new NotFoundError('Product not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND_ERROR');
  });

  it('ConflictError returns 409', () => {
    const err = new ConflictError('Duplicate barcode');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT_ERROR');
  });

  it('InsufficientStockError returns 400 with correct code', () => {
    const err = new InsufficientStockError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('INSUFFICIENT_STOCK');
    expect(err.message).toBe('Insufficient stock for this product.');
  });

  it('InsufficientStockError accepts custom message', () => {
    const err = new InsufficientStockError('Only 3 left in stock');
    expect(err.message).toBe('Only 3 left in stock');
  });
});
