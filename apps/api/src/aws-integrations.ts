import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
import { SESv2Client, SendEmailCommand, type SendEmailCommandOutput } from '@aws-sdk/client-sesv2';

import { ApiError } from './api-response.js';
import type { AiProvider } from './ai-service.js';
import type { PasswordResetDelivery } from './identity.js';

export interface BedrockClient {
  send(
    command: ConverseCommand,
    options?: { abortSignal?: AbortSignal },
  ): Promise<ConverseCommandOutput>;
}

function proposalFromText(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(trimmed);
}

export class BedrockAiProvider implements AiProvider {
  readonly name = 'Amazon Bedrock';
  constructor(
    readonly model: string,
    private readonly client: BedrockClient,
  ) {}

  async generate(input: {
    system: string;
    input: string;
    maxOutputTokens: number;
    signal: AbortSignal;
  }): Promise<{ value: unknown; inputTokens: number; outputTokens: number }> {
    const response = await this.client.send(
      new ConverseCommand({
        modelId: this.model,
        system: [{ text: input.system }],
        messages: [{ role: 'user', content: [{ text: input.input }] }],
        inferenceConfig: { maxTokens: input.maxOutputTokens, temperature: 0.2 },
      }),
      { abortSignal: input.signal },
    );
    const text = (response.output?.message?.content ?? [])
      .flatMap((block) => (typeof block.text === 'string' ? [block.text] : []))
      .join('\n');
    if (!text || response.stopReason === 'content_filtered')
      throw new Error('BEDROCK_EMPTY_OR_FILTERED_OUTPUT');
    return {
      value: proposalFromText(text),
      inputTokens: response.usage?.inputTokens ?? 0,
      outputTokens: response.usage?.outputTokens ?? 0,
    };
  }
}

export function createBedrockAiProvider(region: string, model: string): BedrockAiProvider {
  return new BedrockAiProvider(model, new BedrockRuntimeClient({ region }));
}

export interface SesClient {
  send(command: SendEmailCommand): Promise<SendEmailCommandOutput>;
}

export class SesPasswordResetDelivery implements PasswordResetDelivery {
  constructor(
    private readonly from: string,
    private readonly baseUrl: string,
    private readonly client: SesClient,
  ) {}

  async deliver(input: { recipient: string; token: string; expiresAt: Date }): Promise<void> {
    const resetUrl = new URL('/reset-password', this.baseUrl);
    resetUrl.searchParams.set('token', input.token);
    try {
      await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: this.from,
          Destination: { ToAddresses: [input.recipient] },
          Content: {
            Simple: {
              Subject: { Data: 'Reset your மகரம் மீடியா password', Charset: 'UTF-8' },
              Body: {
                Text: {
                  Charset: 'UTF-8',
                  Data: `A password reset was requested for your மகரம் மீடியா account.\n\nReset your password: ${resetUrl}\n\nThis link expires at ${input.expiresAt.toISOString()}. If you did not request it, you can ignore this email.`,
                },
              },
            },
          },
        }),
      );
    } catch {
      throw new ApiError(
        503,
        'DELIVERY_UNAVAILABLE',
        'Password reset delivery is temporarily unavailable. Try again later.',
      );
    }
  }
}

export function createSesPasswordResetDelivery(
  region: string,
  from: string,
  baseUrl: string,
): SesPasswordResetDelivery {
  return new SesPasswordResetDelivery(from, baseUrl, new SESv2Client({ region }));
}
