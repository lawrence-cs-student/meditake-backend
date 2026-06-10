import dotenv from 'dotenv';
dotenv.config();
import { eventGenerationQueue } from './lib/queue';
import { Worker } from 'bullmq';
import { generateEvents } from './jobs/eventGenerationJob';
import app from './app';
import './jobs/notificationWorker'; // Just importing starts the worker

const PORT = process.env.PORT || 3000;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Schedule a repeatable job – daily at midnight
eventGenerationQueue.add(
  'generate-events',
  {},
  {
    repeat: { pattern: '0 0 * * *' },
    removeOnComplete: true,
    removeOnFail: 100,
  }
).catch(err => console.error('Failed to schedule daily event generation', err));

// Worker that processes the job
new Worker('event-generation', async job => {
  if (job.name === 'generate-events') {
    await generateEvents();
  }
}, { connection: { url: redisUrl } });   // object form

// Start server and generate events immediately (for testing)
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  generateEvents().catch(err => console.error('Initial event generation failed', err));
});