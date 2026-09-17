import { z } from 'zod';

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_VERSION: z.string().trim().min(1).max(80).default('0.1.0'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    WEB_ORIGIN: z.string().url(),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
    AWS_REGION: z.string().trim().min(1).max(80).default('ap-south-1'),
    AI_PROVIDER: z.enum(['inactive', 'bedrock']).default('inactive'),
    AWS_BEDROCK_MODEL_ID: z.string().trim().min(1).max(300).default('apac.amazon.nova-micro-v1:0'),
    AI_DAILY_PER_USER: z.coerce.number().int().min(1).max(100).default(10),
    AI_DAILY_GLOBAL: z.coerce.number().int().min(1).max(1000).default(50),
    AI_MAX_INPUT_CHARS: z.coerce.number().int().min(100).max(30000).default(12000),
    AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(100).max(4000).default(1200),
    AI_TIMEOUT_MS: z.coerce.number().int().min(50).max(60000).default(30000),
    EMAIL_PROVIDER: z.enum(['inactive', 'ses']).default('inactive'),
    SES_FROM_EMAIL: z.string().trim().email().max(320).optional(),
    PASSWORD_RESET_BASE_URL: z.string().url().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.EMAIL_PROVIDER === 'ses' && !value.SES_FROM_EMAIL)
      context.addIssue({
        code: 'custom',
        path: ['SES_FROM_EMAIL'],
        message: 'SES_FROM_EMAIL is required when Amazon SES delivery is enabled.',
      });
    if (value.EMAIL_PROVIDER === 'ses' && !value.PASSWORD_RESET_BASE_URL)
      context.addIssue({
        code: 'custom',
        path: ['PASSWORD_RESET_BASE_URL'],
        message: 'PASSWORD_RESET_BASE_URL is required when Amazon SES delivery is enabled.',
      });
    if (
      value.NODE_ENV === 'production' &&
      value.EMAIL_PROVIDER === 'ses' &&
      value.PASSWORD_RESET_BASE_URL &&
      !value.PASSWORD_RESET_BASE_URL.startsWith('https://')
    )
      context.addIssue({
        code: 'custom',
        path: ['PASSWORD_RESET_BASE_URL'],
        message: 'Production password-reset links must use HTTPS.',
      });
  });

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }

  return result.data;
}
