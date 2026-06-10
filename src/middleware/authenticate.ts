import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis';
import { logger } from '../lib/pino';
import { AppError } from '../utils/error';
import { AuthRequest } from '../types';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  const isBlocked = await redis.get(`bl_${token}`);
  if (isBlocked) {
    logger.warn('Attempt to use revoked token');
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch (err) {
    logger.warn({ err }, 'Invalid token');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};