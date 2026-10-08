import type { NotificationSink, SimulatedDelivery } from '../../src/domain/index.js';

export class RecordingNotificationSink implements NotificationSink {
  readonly entries: SimulatedDelivery[] = [];

  record(entry: SimulatedDelivery): void {
    this.entries.push(entry);
  }
}
