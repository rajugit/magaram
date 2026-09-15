import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const FOUNDATION_QUEUE = 'foundation-maintenance';

export interface FoundationJob {
  kind: 'expired-session-cleanup';
  requestedAt: string;
}

export function createRedisConnection(redisUrl: string): IORedis {
  return new IORedis(redisUrl, { maxRetriesPerRequest: null });
}

export function createFoundationQueue(connection: IORedis): Queue<FoundationJob> {
  return new Queue<FoundationJob>(FOUNDATION_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: { age: 60 * 60 * 24 * 7, count: 1_000 },
      removeOnFail: { age: 60 * 60 * 24 * 30, count: 5_000 },
    },
  });
}
