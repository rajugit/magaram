import { describe, expect, it } from 'vitest';
import {
  InactiveSocialProvider,
  SocialProviderUnavailableError,
  socialPublishInput,
} from '../src/social-contract.js';

describe('social provider contract', () => {
  it('requires consent and an idempotency key before publishing', () => {
    expect(() => socialPublishInput.parse({ accountId: 'account', text: 'செய்தி' })).toThrow();
  });

  it('requires sponsorship disclosure in outbound sponsored copy', () => {
    const adapter = new InactiveSocialProvider('facebook');
    expect(() =>
      adapter.validate(
        socialPublishInput.parse({
          accountId: 'account',
          idempotencyKey: 'idempotency-key-1234',
          text: 'Sponsored story',
          sponsored: true,
          consentId: 'consent',
        }),
      ),
    ).not.toThrow();
    expect(() =>
      adapter.validate(
        socialPublishInput.parse({
          accountId: 'account',
          idempotencyKey: 'idempotency-key-1234',
          text: 'Paid story',
          sponsored: true,
          consentId: 'consent',
        }),
      ),
    ).toThrow('disclosure');
  });

  it('fails closed when a provider is inactive', async () => {
    const adapter = new InactiveSocialProvider('instagram');
    await expect(
      adapter.publish(
        socialPublishInput.parse({
          accountId: 'account',
          idempotencyKey: 'idempotency-key-1234',
          text: 'செய்தி',
          consentId: 'consent',
        }),
      ),
    ).rejects.toBeInstanceOf(SocialProviderUnavailableError);
  });
});
