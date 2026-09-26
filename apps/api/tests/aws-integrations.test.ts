import type { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { describe, expect, it, vi } from 'vitest';

import {
  BedrockAiProvider,
  SesPasswordResetDelivery,
  WorkspaceSmtpPasswordResetDelivery,
} from '../src/aws-integrations.js';

describe('Amazon integrations', () => {
  it('uses Bedrock Converse with the configured model, limits and abort signal', async () => {
    const send = vi.fn().mockResolvedValue({
      output: {
        message: {
          content: [
            {
              text: '{"text":"தமிழ் முன்மொழிவு","sourceIds":["source-1"],"warnings":[],"claims":[]}',
            },
          ],
        },
      },
      usage: { inputTokens: 19, outputTokens: 12 },
    });
    const provider = new BedrockAiProvider('apac.amazon.nova-micro-v1:0', { send });
    const controller = new AbortController();
    await expect(
      provider.generate({
        system: 'Return JSON only.',
        input: '{"article":"source-bound"}',
        maxOutputTokens: 400,
        signal: controller.signal,
      }),
    ).resolves.toEqual({
      value: { text: 'தமிழ் முன்மொழிவு', sourceIds: ['source-1'], warnings: [], claims: [] },
      inputTokens: 19,
      outputTokens: 12,
    });
    const command = send.mock.calls[0][0] as ConverseCommand;
    expect(command.input).toMatchObject({
      modelId: 'apac.amazon.nova-micro-v1:0',
      inferenceConfig: { maxTokens: 400, temperature: 0.2 },
    });
    expect(send.mock.calls[0][1]).toEqual({ abortSignal: controller.signal });
  });

  it('sends a one-recipient SES reset message without exposing the token to the API', async () => {
    const send = vi.fn().mockResolvedValue({ $metadata: {} });
    const delivery = new SesPasswordResetDelivery('magaram.in@gmail.com', 'https://65.2.18.204', {
      send,
    });
    await delivery.deliver({
      recipient: 'editor@example.test',
      token: 'a'.repeat(43),
      expiresAt: new Date('2026-09-17T12:00:00.000Z'),
    });
    const command = send.mock.calls[0][0] as SendEmailCommand;
    expect(command.input).toMatchObject({
      FromEmailAddress: 'magaram.in@gmail.com',
      Destination: { ToAddresses: ['editor@example.test'] },
    });
    const body = command.input.Content?.Simple?.Body?.Text?.Data || '';
    expect(body).toContain('https://65.2.18.204/reset-password?token=');
    expect(body).toContain('a'.repeat(43));
  });

  it('sends a one-recipient Workspace SMTP reset message', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'test-message' });
    const delivery = new WorkspaceSmtpPasswordResetDelivery(
      'admin@magarammedia.in',
      'https://magarammedia.in',
      {
        sendMail,
      },
    );
    await delivery.deliver({
      recipient: 'editor@example.test',
      token: 'b'.repeat(43),
      expiresAt: new Date('2026-09-17T12:00:00.000Z'),
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'admin@magarammedia.in',
        to: 'editor@example.test',
        subject: 'Reset your மகரம் மீடியா password',
      }),
    );
    expect(sendMail.mock.calls[0][0].text).toContain(
      'https://magarammedia.in/reset-password?token=',
    );
  });
});
