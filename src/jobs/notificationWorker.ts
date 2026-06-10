import { Worker } from 'bullmq';
import { prisma } from '../lib/prisma';
import { sendPushNotification } from '../lib/push';
import { logger } from '../lib/pino';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { notificationJobId } = job.data;

    const notificationJob = await prisma.notificationJob.findUnique({
      where: { id: notificationJobId },
      include: {
        User: {
          include: { devices: true },
        },
      },
    });

    if (!notificationJob || notificationJob.status !== 'pending') return;

    const payload = notificationJob.payload as any;
    const title = `Time to take ${payload.medicationName}`;
    const body = payload.dosage
      ? `Take ${payload.dosage} now`
      : 'Take your medication now';

    let sent = false;

    for (const device of notificationJob.User.devices) {
      const result = await sendPushNotification(device.token, title, body, {
        eventId: payload.eventId,
      });
      if (result.success) {
        sent = true;
      }
    }

    if (sent) {
      await prisma.notificationJob.update({
        where: { id: notificationJobId },
        data: { status: 'sent', sentAt: new Date() },
      });
    } else {
      throw new Error('Failed to send to any device');
    }
  },
  {
    connection: { url: redisUrl },
  }
);

notificationWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= 3) {
    await prisma.notificationJob.update({
      where: { id: job.data.notificationJobId },
      data: { status: 'failed' },
    });
  }
  logger.error({ err, jobId: job?.id }, 'Notification job failed');
});

export { notificationWorker };