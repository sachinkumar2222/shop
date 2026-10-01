import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  if (statusCode >= 500) {
    logger.error({ err }, 'Unhandled Error');
  } else {
    logger.warn({ err }, `Operational Error: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    code,
    message
  });
};
