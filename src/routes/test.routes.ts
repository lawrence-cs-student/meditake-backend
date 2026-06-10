import { Router, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../lib/prisma';
import { scheduleNotification } from '../lib/notificationQueue';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../types';   // ✅ import custom request type

const router = Router();

router.post(
  '/test-notification',
  authenticate,
  async (req: AuthRequest, res: Response) => {   // ✅ use AuthRequest
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: { devices: true },
    });

    if (!user || user.devices.length === 0) {
      return res.status(400).json({ error: 'No device tokens' });
    }

    const job = await prisma.notificationJob.create({
      data: {
        userId: user.id,
        type: 'reminder',
        payload: {
          medicationName: 'Test Med',
          dosage: '10mg',
          eventId: 'test',
        } as Prisma.InputJsonValue,
        scheduledFor: new Date(Date.now() + 10000),
        status: 'pending',
      },
    });

    await scheduleNotification(job.id, job.scheduledFor);
    res.json({ message: 'Test notification scheduled', jobId: job.id });
  }
);

export { router as testRouter };