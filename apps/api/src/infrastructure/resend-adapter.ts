import { Resend } from 'resend';
import { readResendConfig, type ResendConfig } from './config.js';
import type {
  EmailDelivery,
  TransactionalEmailInput,
  TransactionalEmailSender,
} from './provider-types.js';

export type {
  EmailDelivery,
  TransactionalEmailInput,
  TransactionalEmailSender,
} from './provider-types.js';

export type ResendRequest = Readonly<
  TransactionalEmailInput & {
    from: string;
  }
>;

/** Provider-neutral transport seam used by the adapter and deterministic tests. */
export type ResendTransport = Readonly<{
  send: (request: ResendRequest) => Promise<EmailDelivery>;
}>;

/** Sends immediate transactional email; scheduling and delivery policy remain outside this adapter. */
export function createResendAdapter(
  config: ResendConfig = readResendConfig(),
  transport: ResendTransport = createResendTransport(config),
): TransactionalEmailSender {
  return {
    async send(input) {
      const request = toResendRequest(config, input);

      try {
        const delivery = await transport.send(request);

        if (!delivery.messageId.trim()) {
          throw new Error('Resend did not return a message ID');
        }

        return delivery;
      } catch {
        throw new Error('Transactional email delivery failed');
      }
    },
  };
}

function createResendTransport(config: ResendConfig): ResendTransport {
  const resend = new Resend(config.apiKey);

  return {
    async send(request) {
      try {
        const result = await resend.emails.send({
          from: request.from,
          html: request.html,
          subject: request.subject,
          ...(request.text === undefined ? {} : { text: request.text }),
          to: [...request.to],
        });

        if (result.error || !result.data?.id) {
          throw new Error('Resend rejected the email');
        }

        return { messageId: result.data.id };
      } catch {
        throw new Error('Resend email request failed');
      }
    },
  };
}

function toResendRequest(config: ResendConfig, input: TransactionalEmailInput): ResendRequest {
  if (input.to.length === 0 || input.to.some((recipient) => !recipient.trim())) {
    throw new Error('At least one email recipient is required');
  }

  if (!input.subject.trim()) {
    throw new Error('Email subject is required');
  }

  if (!input.html.trim()) {
    throw new Error('Email HTML content is required');
  }

  if (input.text !== undefined && !input.text.trim()) {
    throw new Error('Email text content cannot be empty');
  }

  return {
    from: config.fromEmail,
    html: input.html,
    subject: input.subject,
    ...(input.text === undefined ? {} : { text: input.text }),
    to: input.to.map((recipient) => recipient.trim()),
  };
}
