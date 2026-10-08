import { inject, injectable } from 'tsyringe';
import {
  LOGGER,
  type Logger,
  type NotificationSink,
  type SimulatedDelivery,
} from '../../domain/index.js';

/** Simulated deliveries are written to the structured log, never to the console. */
@injectable()
export class LoggerNotificationSink implements NotificationSink {
  constructor(@inject(LOGGER) private readonly logger: Logger) {}

  record(entry: SimulatedDelivery): void {
    this.logger.info('notification.simulated', {
      channel: entry.channel,
      recipient: entry.recipient,
      title: entry.title,
    });
  }
}
