import type { PrismaClient } from '@prisma/client';
import type IORedis from 'ioredis';

export function createReadinessCheck(prisma: PrismaClient, redis: IORedis): () => Promise<boolean> {
  return async () => {
    try {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.all([prisma.$queryRaw`SELECT 1`, redis.ping()]),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Readiness timeout')), 2000);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
      return true;
    } catch {
      return false;
    }
  };
}
