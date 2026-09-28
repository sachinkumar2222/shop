import { randomUUID } from 'crypto';

/**
 * Attaches a unique request ID to every request.
 * Useful for log tracing across services.
 */
export const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
