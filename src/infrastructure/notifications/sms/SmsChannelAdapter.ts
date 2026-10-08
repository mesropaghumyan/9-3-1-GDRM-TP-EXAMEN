import { inject, injectable } from 'tsyringe';
import {
  NotificationDeliveryError,
  type ChannelKind,
  type NotificationChannel,
  type WakeUpNotification,
} from '../../../domain/index.js';
import { SMS_GATEWAY } from '../../tokens.js';
import type { SmsGateway } from './SmsGateway.js';

@injectable()
export class SmsChannelAdapter implements NotificationChannel {
  readonly kind: ChannelKind = 'SMS';

  constructor(@inject(SMS_GATEWAY) private readonly gateway: SmsGateway) {}

  async send(notification: WakeUpNotification): Promise<void> {
    let accepted: boolean;
    try {
      accepted = await this.gateway.push(notification.recipient, notification.body);
    } catch (error) {
      throw new NotificationDeliveryError('sms delivery failed', { cause: error });
    }
    if (!accepted) {
      throw new NotificationDeliveryError('sms gateway refused the message');
    }
  }
}
