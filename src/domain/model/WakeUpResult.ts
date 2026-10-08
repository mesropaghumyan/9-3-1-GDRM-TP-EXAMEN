import type { ChannelAttempt } from './ChannelAttempt.js';
import type { ChannelKind } from './ChannelKind.js';
import type { Track } from './Track.js';
import type { TrackSource } from './TrackSource.js';

export const FAILURE_REASONS = [
  'USER_NOT_FOUND',
  'ALL_CHANNELS_FAILED',
  'NO_TRACK_AVAILABLE',
  'CANCELLED',
] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

export interface WakeUpDelivered {
  readonly status: 'DELIVERED';
  readonly degraded: boolean;
  readonly track: Track;
  readonly trackSource: TrackSource;
  readonly providerName: string;
  readonly channel: ChannelKind;
  readonly attempts: readonly ChannelAttempt[];
}

export interface WakeUpFailed {
  readonly status: 'FAILED';
  readonly degraded: true;
  readonly reason: FailureReason;
  readonly track?: Track;
  readonly trackSource?: TrackSource;
  readonly providerName?: string;
  readonly attempts: readonly ChannelAttempt[];
}

export type WakeUpResult = WakeUpDelivered | WakeUpFailed;
