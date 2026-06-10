import { Router, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';                     // ✅ import your custom type

const router = Router();
router.use(authenticate);

const deviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

router.post(
  '/',
  validate(deviceSchema),
  async (req: AuthRequest, res: Response) => {            // ✅ use AuthRequest
    const { token, platform } = req.body;
    const userId = req.userId!;

    await prisma.deviceToken.upsert({
      where: {
        userId_token: { userId, token },
      },
      update: { platform, createdAt: new Date() },
      create: { userId, token, platform },
    });

    res.status(201).json({ success: true });
  }
);

export { router as deviceRouter };