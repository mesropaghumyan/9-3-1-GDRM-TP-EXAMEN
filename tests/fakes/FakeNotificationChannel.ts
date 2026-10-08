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

/** Channel whose send never settles on its own and ignores the signal (worst case for timeouts). */
export class HangingNotificationChannel implements NotificationChannel {
  readonly signals: (AbortSignal | undefined)[] = [];

  constructor(readonly kind: ChannelKind) {}

  send(_notification: WakeUpNotification, signal?: AbortSignal): Promise<void> {
    this.signals.push(signal);
    return new Promise<void>(() => undefined);
  }
}
