import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { PrismaIdentityRepository } from './prisma-identity-repository.js';
import { createReadinessCheck } from './readiness.js';
import { createBedrockAiProvider, createSesPasswordResetDelivery } from './aws-integrations.js';

const config = loadConfig();
const aiProvider =
  config.AI_PROVIDER === 'bedrock'
    ? createBedrockAiProvider(config.AWS_REGION, config.AWS_BEDROCK_MODEL_ID)
    : undefined;
const passwordResetDelivery =
  config.EMAIL_PROVIDER === 'ses'
    ? createSesPasswordResetDelivery(
        config.AWS_REGION,
        config.SES_FROM_EMAIL!,
        config.PASSWORD_RESET_BASE_URL!,
      )
    : undefined;
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
  aiProvider,
  aiLimits: aiProvider
    ? {
        dailyPerUser: config.AI_DAILY_PER_USER,
        dailyGlobal: config.AI_DAILY_GLOBAL,
        maxInputChars: config.AI_MAX_INPUT_CHARS,
        maxOutputTokens: config.AI_MAX_OUTPUT_TOKENS,
        timeoutMs: config.AI_TIMEOUT_MS,
      }
    : undefined,
  passwordResetDelivery,
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
