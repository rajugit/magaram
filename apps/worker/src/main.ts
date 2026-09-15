import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';

const environmentSchema = z.object({
  REDIS_URL: z.string().url(),
});

const environment = environmentSchema.parse(process.env);
const connection = new IORedis(environment.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  'foundation-maintenance',
  async (job) => {
    if (job.name !== 'expired-session-cleanup') {
      throw new Error(`Unsupported Phase 1 job: ${job.name}`);
    }

    // Cleanup is intentionally a no-op until a database-backed retention service is approved.
    return { status: 'acknowledged' };
  },
  { connection },
);

worker.on('completed', (job) => {
  console.info(JSON.stringify({ level: 'info', message: 'Worker job completed', jobId: job.id }));
});

worker.on('failed', (job, error) => {
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'Worker job failed',
      jobId: job?.id,
      error: error.message,
    }),
  );
});

async function shutdown(signal: string) {
  console.info(JSON.stringify({ level: 'info', message: 'Worker stopping', signal }));
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
