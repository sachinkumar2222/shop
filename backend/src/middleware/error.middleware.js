import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  if (!(err instanceof AppError)) {
    logger.error({ err }, 'Unhandled Error');
    error = new AppError('Internal Server Error', 500, 'INTERNAL_SERVER_ERROR', false);
  } else {
    logger.warn({ err }, 'Operational Error');
  }

  res.status(error.statusCode || 500).json({
    success: false,
    code: error.code || 'ERROR',
    message: error.message
  });
};
