import type { ChannelKind, WakeUpNotification } from '../model/index.js';

export interface NotificationChannel {
  readonly kind: ChannelKind;
  /** @throws NotificationDeliveryError */
  send(notification: WakeUpNotification, signal?: AbortSignal): Promise<void>;
}
export const NOTIFICATION_CHANNEL = Symbol('NotificationChannel');
