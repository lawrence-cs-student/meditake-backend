import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const eventGenerationQueue = new Queue('event-generation', {
  connection: { url: redisUrl },        
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
  },
});