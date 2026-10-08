import type {
  ChannelKind,
  Logger,
  NotificationChannel,
  NotificationChannelResolver,
} from '../domain/index.js';

/**
 * Factory injected through a useFactory (it needs the configured order): preferred channel
 * first, then the others in the fallback order, without duplicates.
 */
export class ChannelResolver implements NotificationChannelResolver {
  constructor(
    private readonly channels: readonly NotificationChannel[],
    private readonly fallbackOrder: readonly ChannelKind[],
    private readonly logger: Logger,
  ) {}

  resolve(preferred: ChannelKind): readonly NotificationChannel[] {
    const order = [preferred, ...this.fallbackOrder.filter((kind) => kind !== preferred)];
    const resolved: NotificationChannel[] = [];
    for (const kind of order) {
      const channel = this.channels.find((candidate) => candidate.kind === kind);
      if (channel === undefined) {
        this.logger.warn('notification.channel.unregistered', { channel: kind });
      } else {
        resolved.push(channel);
      }
    }
    return resolved;
  }
}
