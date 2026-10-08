import type { Track } from './Track.js';
import type { UserId } from './UserId.js';

export interface WakeUpNotification {
  readonly recipient: UserId;
  readonly title: string;
  readonly body: string;
  readonly track: Track;
}
