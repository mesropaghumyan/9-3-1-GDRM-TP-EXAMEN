import type { ChannelKind } from '../model/index.js';
import type { NotificationChannel } from './NotificationChannel.js';

export interface NotificationChannelResolver {
  /** Preferred channel first, then the others in the configured fallback order. */
  resolve(preferred: ChannelKind): readonly NotificationChannel[];
}
export const NOTIFICATION_CHANNEL_RESOLVER = Symbol('NotificationChannelResolver');
