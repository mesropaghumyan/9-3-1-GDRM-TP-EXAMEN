import { inject, injectable } from 'tsyringe';
import {
  NotificationDeliveryError,
  type ChannelKind,
  type NotificationChannel,
  type WakeUpNotification,
} from '../../../domain/index.js';
import { EMAIL_CLIENT } from '../../tokens.js';
import type { EmailClient } from './EmailClient.js';

@injectable()
export class EmailChannelAdapter implements NotificationChannel {
  readonly kind: ChannelKind = 'EMAIL';

  constructor(@inject(EMAIL_CLIENT) private readonly client: EmailClient) {}

  send(notification: WakeUpNotification): Promise<void> {
    try {
      this.client.sendMail(
        notification.recipient,
        notification.title,
        `<p>${notification.body}</p>`,
        true,
      );
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(
        new NotificationDeliveryError('email delivery failed', { cause: error }),
      );
    }
  }
}
