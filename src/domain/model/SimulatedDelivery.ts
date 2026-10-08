import type { ChannelKind } from './ChannelKind.js';

export interface SimulatedDelivery {
  readonly channel: ChannelKind;
  readonly recipient: string;
  readonly title: string;
}
