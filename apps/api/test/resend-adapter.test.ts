import { describe, expect, it } from 'vite-plus/test';
import { createResendAdapter, type ResendTransport } from '../src/infrastructure/resend-adapter.js';

describe('Resend adapter', () => {
  it('sends an application-owned transactional email directly through the transport', async () => {
    const requests: unknown[] = [];
    const transport: ResendTransport = {
      send: async (request) => {
        requests.push(request);
        return { messageId: 'email_123' };
      },
    };
    const adapter = createResendAdapter(
      {
        apiKey: 're_test_safe_value',
        fromEmail: 'Yard <noreply@yard.example>',
      },
      transport,
    );

    await expect(
      adapter.send({
        html: '<p>Your RSVP was approved.</p>',
        subject: 'RSVP approved',
        text: 'Your RSVP was approved.',
        to: ['participant@example.com'],
      }),
    ).resolves.toEqual({ messageId: 'email_123' });
    expect(requests).toEqual([
      {
        from: 'Yard <noreply@yard.example>',
        html: '<p>Your RSVP was approved.</p>',
        subject: 'RSVP approved',
        text: 'Your RSVP was approved.',
        to: ['participant@example.com'],
      },
    ]);
  });

  it('hides provider failure details and rejects empty recipients', async () => {
    const providerSecret = 'resend-provider-secret';
    const adapter = createResendAdapter(
      {
        apiKey: 're_test_safe_value',
        fromEmail: 'Yard <noreply@yard.example>',
      },
      {
        send: async () => {
          throw new Error(providerSecret);
        },
      },
    );

    const failure = await adapter
      .send({ html: '<p>Hello</p>', subject: 'Hello', to: ['person@example.com'] })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('Transactional email delivery failed');
    expect((failure as Error).message).not.toContain(providerSecret);
    await expect(adapter.send({ html: '<p>Hello</p>', subject: 'Hello', to: [] })).rejects.toThrow(
      'At least one email recipient is required',
    );
  });
});
