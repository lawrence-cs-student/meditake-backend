import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const notificationQueue = new Queue('notifications', {
  connection: { url: redisUrl },
});

export const scheduleNotification = async (
  notificationJobId: string,
  scheduledFor: Date
) => {
  const delay = scheduledFor.getTime() - Date.now();
  if (delay <= 0) return;

  await notificationQueue.add(
    'send-notification',
    { notificationJobId },
    {
      delay,
      attempts: 3,                          
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
};