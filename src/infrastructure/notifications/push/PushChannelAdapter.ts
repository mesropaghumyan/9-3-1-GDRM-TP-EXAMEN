import { inject, injectable } from 'tsyringe';
import {
  NotificationDeliveryError,
  type ChannelKind,
  type NotificationChannel,
  type WakeUpNotification,
} from '../../../domain/index.js';
import { PUSH_SERVICE } from '../../tokens.js';
import type { PushService } from './PushService.js';

@injectable()
export class PushChannelAdapter implements NotificationChannel {
  readonly kind: ChannelKind = 'PUSH';

  constructor(@inject(PUSH_SERVICE) private readonly service: PushService) {}

  async send(notification: WakeUpNotification): Promise<void> {
    let result: { ok: boolean; id: string };
    try {
      result = await this.service.dispatch({
        deviceId: notification.recipient,
        heading: notification.title,
        message: notification.body,
      });
    } catch (error) {
      throw new NotificationDeliveryError('push delivery failed', { cause: error });
    }
    if (!result.ok) {
      throw new NotificationDeliveryError('push service rejected the payload');
    }
  }
}
