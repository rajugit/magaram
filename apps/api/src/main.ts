import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { PrismaIdentityRepository } from './prisma-identity-repository.js';
import { createReadinessCheck } from './readiness.js';

const config = loadConfig();
const prisma = new PrismaClient();
const redis = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
redis.on('error', () =>
  console.error(JSON.stringify({ level: 'error', message: 'Redis unavailable' })),
);
const app = createApp({
  config,
  db: prisma,
  identityRepository: new PrismaIdentityRepository(prisma),
  isReady: createReadinessCheck(prisma, redis),
});

const server = app.listen(config.API_PORT, '127.0.0.1', () => {
  console.info(
    JSON.stringify({
      level: 'info',
      message: 'API listening',
      port: config.API_PORT,
      environment: config.NODE_ENV,
    }),
  );
});

async function shutdown(signal: string) {
  console.info(JSON.stringify({ level: 'info', message: 'API stopping', signal }));
  server.close();
  await Promise.all([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
