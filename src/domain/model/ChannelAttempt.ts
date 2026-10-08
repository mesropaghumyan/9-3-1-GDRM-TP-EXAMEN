import type { ChannelKind } from './ChannelKind.js';

export interface ChannelAttempt {
  readonly channel: ChannelKind;
  readonly succeeded: boolean;
  readonly cause?: string;
}
