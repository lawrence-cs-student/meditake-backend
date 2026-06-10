import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/pino';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled request error');

  const status = err.status || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
};