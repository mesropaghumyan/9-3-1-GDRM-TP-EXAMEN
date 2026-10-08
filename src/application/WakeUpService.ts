import { inject, injectable } from 'tsyringe';
import {
  LOGGER,
  TRACK_RESOLVER,
  USER_PREFERENCES_PROVIDER,
  type DayOfWeek,
  type Logger,
  type TrackResolver,
  type UserId,
  type UserPreferencesProvider,
  type WakeUpResult,
  type WeatherType,
} from '../domain/index.js';
import { buildWakeUpNotification } from './buildWakeUpNotification.js';
import { ChannelDelivery } from './ChannelDelivery.js';
import { CHANNEL_DELIVERY, TRACK_SELECTION_POLICY } from './tokens.js';
import { TrackSelectionPolicy } from './TrackSelectionPolicy.js';
import type { WakeUpUseCase } from './WakeUpUseCase.js';

/** Facade: preferences -> track choice -> track search -> channel resolution -> delivery. */
@injectable()
export class WakeUpService implements WakeUpUseCase {
  constructor(
    @inject(USER_PREFERENCES_PROVIDER) private readonly preferences: UserPreferencesProvider,
    @inject(TRACK_SELECTION_POLICY) private readonly policy: TrackSelectionPolicy,
    @inject(TRACK_RESOLVER) private readonly tracks: TrackResolver,
    @inject(CHANNEL_DELIVERY) private readonly delivery: ChannelDelivery,
    @inject(LOGGER) private readonly logger: Logger,
  ) {}

  async trigger(
    userId: UserId,
    day: DayOfWeek,
    weather: WeatherType,
    signal?: AbortSignal,
  ): Promise<WakeUpResult> {
    // Why: the day is traced only; it never influences the track choice (RG-03).
    this.logger.info('wakeup.started', { userId, day, weather });

    const preferences = await this.preferences.get(userId, signal);
    const selection = this.policy.select(preferences, weather);
    this.logger.info('wakeup.track.selected', { source: selection.source });

    const resolved = await this.tracks.resolve(selection.query, signal);
    const trackSource = resolved.isLocalFallback ? 'LOCAL_FALLBACK' : selection.source;
    const notification = buildWakeUpNotification(userId, resolved.track);

    const outcome = await this.delivery.deliver(notification, preferences.preferredChannel, signal);
    if (outcome.channel !== null) {
      return Object.freeze({
        status: 'DELIVERED',
        // RG-11: degraded when a later provider answered or a non-preferred channel delivered.
        degraded: resolved.skippedProviders > 0 || outcome.attempts.length > 1,
        track: resolved.track,
        trackSource,
        providerName: resolved.providerName,
        channel: outcome.channel,
        attempts: outcome.attempts,
      });
    }

    this.logger.error('wakeup.failed', { reason: 'ALL_CHANNELS_FAILED' });
    return Object.freeze({
      status: 'FAILED',
      degraded: true,
      reason: 'ALL_CHANNELS_FAILED',
      track: resolved.track,
      trackSource,
      providerName: resolved.providerName,
      attempts: outcome.attempts,
    });
  }
}
