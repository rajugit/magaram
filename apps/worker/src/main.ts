import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';
import { PrismaClient, handleMaintenanceJob } from '@magaram/api/maintenance';
import { ingestNewsSource } from '@magaram/api/news-discovery';

const environmentSchema = z.object({
  REDIS_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
});

const parsed = environmentSchema.safeParse(process.env);
if (!parsed.success) throw new Error('Worker requires valid database and Redis configuration.');
const environment = parsed.data;
const connection = new IORedis(environment.REDIS_URL, { maxRetriesPerRequest: null });
const db = new PrismaClient();
await db.$connect();
const queue = new Queue('foundation-maintenance', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 604800, count: 1000 },
    removeOnFail: { age: 2592000, count: 5000 },
  },
});

const worker = new Worker(
  'foundation-maintenance',
  async (job) => {
    return handleMaintenanceJob(db, job.name);
  },
  { connection },
);
const discoveryQueue = new Queue('news-discovery', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 604800, count: 1000 },
    removeOnFail: { age: 2592000, count: 5000 },
  },
});
const discoveryWorker = new Worker(
  'news-discovery',
  async () => {
    const sources = await db.newsSource.findMany({ where: { enabled: true } });
    const due = sources.filter(
      (source) =>
        !source.lastSuccessfulFetch ||
        source.lastSuccessfulFetch.getTime() + source.pollingSeconds * 1000 <= Date.now(),
    );
    const results = [];
    for (const source of due) {
      try {
        results.push({ sourceId: source.id, ...(await ingestNewsSource(db, source)) });
      } catch {
        results.push({ sourceId: source.id, failed: true });
      }
    }
    return { checked: sources.length, due: due.length, results };
  },
  { connection, concurrency: 1 },
);
await queue.upsertJobScheduler(
  'identity-retention-v1',
  { every: 3600000 },
  { name: 'expired-session-cleanup', data: {} },
);
await discoveryQueue.upsertJobScheduler(
  'news-source-poll-v1',
  { every: 300_000 },
  { name: 'news-source-poll', data: {} },
);
await queue.upsertJobScheduler(
  'editorial-publication-v1',
  { every: 60000 },
  { name: 'scheduled-publication', data: {} },
);
worker.on('error', () =>
  console.error(JSON.stringify({ level: 'error', message: 'Worker connection error' })),
);
connection.on('error', () =>
  console.error(JSON.stringify({ level: 'error', message: 'Redis connection error' })),
);

worker.on('completed', (job) => {
  console.info(JSON.stringify({ level: 'info', message: 'Worker job completed', jobId: job.id }));
});

worker.on('failed', (job) => {
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'Worker job failed',
      jobId: job?.id,
    }),
  );
});
discoveryWorker.on('error', () =>
  console.error(JSON.stringify({ level: 'error', message: 'News discovery worker error' })),
);

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.info(JSON.stringify({ level: 'info', message: 'Worker stopping', signal }));
  await worker.close();
  await discoveryWorker.close();
  await queue.close();
  await discoveryQueue.close();
  await connection.quit();
  await db.$disconnect();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
