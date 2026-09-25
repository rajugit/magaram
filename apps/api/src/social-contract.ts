import { z } from 'zod';

export const socialProviders = [
  'facebook',
  'instagram',
  'x',
  'whatsapp',
  'telegram',
  'youtube',
] as const;
export type SocialProvider = (typeof socialProviders)[number];

export const socialPublishInput = z
  .object({
    accountId: z.string().min(1).max(191),
    idempotencyKey: z.string().min(16).max(191),
    text: z.string().trim().min(1).max(5000),
    articleId: z.string().max(191).optional(),
    mediaUrl: z.string().url().max(2000).optional(),
    sponsored: z.boolean().default(false),
    consentId: z.string().min(1).max(191),
  })
  .strict();
export type SocialPublishInput = z.infer<typeof socialPublishInput>;

export type SocialCapabilities = {
  text: boolean;
  image: boolean;
  video: boolean;
  delete: boolean;
  metrics: boolean;
};

export type SocialPublishResult = {
  externalId: string;
  publishedAt: Date;
};

export interface SocialProviderAdapter {
  readonly provider: SocialProvider;
  readonly capabilities: SocialCapabilities;
  validate(input: SocialPublishInput): void;
  publish(input: SocialPublishInput, signal?: AbortSignal): Promise<SocialPublishResult>;
  delete(externalId: string, signal?: AbortSignal): Promise<void>;
}

export class SocialProviderUnavailableError extends Error {
  constructor(provider: SocialProvider) {
    super(`The ${provider} provider is not configured.`);
    this.name = 'SocialProviderUnavailableError';
  }
}

export class InactiveSocialProvider implements SocialProviderAdapter {
  readonly capabilities: SocialCapabilities = {
    text: false,
    image: false,
    video: false,
    delete: false,
    metrics: false,
  };

  constructor(public readonly provider: SocialProvider) {}

  validate(input: SocialPublishInput) {
    if (input.sponsored && !/sponsor|ஆதரவு/i.test(input.text))
      throw new Error('Sponsored social content must include a disclosure.');
  }

  async publish(input: SocialPublishInput, signal?: AbortSignal): Promise<SocialPublishResult> {
    void input;
    void signal;
    throw new SocialProviderUnavailableError(this.provider);
  }

  async delete(externalId: string, signal?: AbortSignal): Promise<void> {
    void externalId;
    void signal;
    throw new SocialProviderUnavailableError(this.provider);
  }
}
