import type { SimulatedDelivery } from '../model/index.js';

export interface NotificationSink {
  record(entry: SimulatedDelivery): void;
}
export const NOTIFICATION_SINK = Symbol('NotificationSink');
