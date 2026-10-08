import {
  NotificationDeliveryError,
  type ChannelKind,
  type NotificationChannel,
  type WakeUpNotification,
} from '../../src/domain/index.js';

export class FakeNotificationChannel implements NotificationChannel {
  readonly sent: WakeUpNotification[] = [];

  constructor(
    readonly kind: ChannelKind,
    private readonly fails = false,
  ) {}

  send(notification: WakeUpNotification): Promise<void> {
    if (this.fails) {
      return Promise.reject(new NotificationDeliveryError(`${this.kind} down`));
    }
    this.sent.push(notification);
    return Promise.resolve();
  }
}
