import type { Track } from './Track.js';

export interface ResolvedTrack {
  readonly track: Track;
  readonly providerName: string;
  /** Providers tried before this one answered; any value above 0 makes the wake-up degraded. */
  readonly skippedProviders: number;
  /** True when the local list answered only because the other providers could not. */
  readonly isLocalFallback: boolean;
}
