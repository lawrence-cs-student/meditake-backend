import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { logger } from '../lib/pino';
import { AppError } from '../utils/error';


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export const signup = async (input: { name: string; email: string; password: string }) => {
  try {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      logger.warn({ email: input.email }, 'Signup failed - email already registered');
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
    });

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });

    logger.info({ userId: user.id }, 'User signed up successfully');
    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ err, input }, 'Unexpected error during signup');
    throw new AppError('Internal server error', 500);
  }
};

export const login = async (input: { email: string; password: string }) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      logger.warn({ email: input.email }, 'Login failed - user not found');
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      logger.warn({ userId: user.id }, 'Login failed - invalid password');
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });

    logger.info({ userId: user.id }, 'User logged in');
    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ err, input }, 'Unexpected error during login');
    throw new AppError('Internal server error', 500);
  }
};

export const logout = async (token: string) => {
  try {
    if (!token) {
      throw new AppError('Token is required', 400);
    }

    const decoded = jwt.decode(token) as { exp: number } | null;
    if (!decoded?.exp) {
      logger.warn('Logout attempt with invalid token');
      
      return;
    }

    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.set(`bl_${token}`, '1', 'EX', ttl);
      logger.info({ tokenExp: decoded.exp }, 'Token added to blocklist');
    } else {
      logger.info('Token already expired, no need to blocklist');
    }
  } catch (err) {
    logger.error({ err }, 'Error during logout');
    
  }
};