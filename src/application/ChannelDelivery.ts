import type {
  ChannelAttempt,
  ChannelKind,
  Logger,
  NotificationChannelResolver,
  WakeUpNotification,
} from '../domain/index.js';

export interface DeliveryOutcome {
  /** Channel that delivered, or null when none did. */
  readonly channel: ChannelKind | null;
  readonly attempts: readonly ChannelAttempt[];
  /** True when the caller cancelled: the sequence stopped early. */
  readonly cancelled: boolean;
}

/**
 * Tries the channels in resolver order, each once, with its own timeout; the first success stops
 * the sequence. Built by the composition root because the timeout comes from configuration.
 */
export class ChannelDelivery {
  constructor(
    private readonly channels: NotificationChannelResolver,
    private readonly logger: Logger,
    private readonly sendTimeoutMs: number,
  ) {}

  async deliver(
    notification: WakeUpNotification,
    preferred: ChannelKind,
    signal?: AbortSignal,
  ): Promise<DeliveryOutcome> {
    const attempts: ChannelAttempt[] = [];
    for (const channel of this.channels.resolve(preferred)) {
      if (isCancelled(signal)) {
        return { channel: null, attempts, cancelled: true };
      }
      const timeout = AbortSignal.timeout(this.sendTimeoutMs);
      const attemptSignal = signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
      try {
        await abortable(channel.send(notification, attemptSignal), attemptSignal);
        attempts.push({ channel: channel.kind, succeeded: true });
        return { channel: channel.kind, attempts, cancelled: false };
      } catch (error) {
        if (isCancelled(signal)) {
          return { channel: null, attempts, cancelled: true };
        }
        const cause = timeout.aborted
          ? 'timeout'
          : error instanceof Error
            ? error.message
            : 'unknown-error';
        attempts.push({ channel: channel.kind, succeeded: false, cause });
        this.logger.warn('wakeup.channel.failed', { channel: channel.kind, cause });
      }
    }
    return { channel: null, attempts, cancelled: false };
  }
}

// Why: a function call keeps TypeScript from narrowing `aborted` to false across awaits.
function isCancelled(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

/** Rejects as soon as the signal aborts, even if the underlying call ignores it. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(new Error('aborted'));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    void promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort);
    });
  });
}
