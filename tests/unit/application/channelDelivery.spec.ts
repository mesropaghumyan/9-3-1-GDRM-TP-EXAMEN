import { describe, expect, it } from 'vitest';
import { ChannelDelivery, ChannelResolver } from '../../../src/application/index.js';
import { createTrack, createUserId, type WakeUpNotification } from '../../../src/domain/index.js';
import {
  FakeNotificationChannel,
  HangingNotificationChannel,
} from '../../fakes/FakeNotificationChannel.js';
import { RecordingLogger } from '../../fakes/RecordingLogger.js';

const notification: WakeUpNotification = {
  recipient: createUserId('alice'),
  title: 't',
  body: 'b',
  track: createTrack('a', 'b'),
};

function build(channels: ConstructorParameters<typeof ChannelResolver>[0], timeoutMs = 30) {
  const logger = new RecordingLogger();
  const delivery = new ChannelDelivery(
    new ChannelResolver(channels, ['EMAIL', 'SMS', 'PUSH'], logger),
    logger,
    timeoutMs,
  );
  return { delivery, logger };
}

describe('ChannelDelivery', () => {
  it('preferred channel works -> single attempt, others untouched', async () => {
    const sms = new FakeNotificationChannel('SMS');
    const email = new FakeNotificationChannel('EMAIL');
    const { delivery } = build([email, sms]);

    const outcome = await delivery.deliver(notification, 'SMS');

    expect(outcome).toEqual({
      channel: 'SMS',
      attempts: [{ channel: 'SMS', succeeded: true }],
      cancelled: false,
    });
    expect(email.sent).toHaveLength(0);
  });

  it('preferred down -> next channel of the order, attempts list both, switch logged in warn', async () => {
    const { delivery, logger } = build([
      new FakeNotificationChannel('EMAIL', true),
      new FakeNotificationChannel('SMS'),
    ]);

    const outcome = await delivery.deliver(notification, 'EMAIL');

    expect(outcome.channel).toBe('SMS');
    expect(outcome.attempts).toEqual([
      { channel: 'EMAIL', succeeded: false, cause: 'EMAIL down' },
      { channel: 'SMS', succeeded: true },
    ]);
    expect(logger.calls.find((call) => call.event === 'wakeup.channel.failed')).toMatchObject({
      level: 'warn',
      fields: { channel: 'EMAIL', cause: 'EMAIL down' },
    });
  });

  it('channel hanging past the timeout -> recorded as timeout, next channel tried', async () => {
    const hanging = new HangingNotificationChannel('EMAIL');
    const { delivery } = build([hanging, new FakeNotificationChannel('SMS')]);

    const outcome = await delivery.deliver(notification, 'EMAIL');

    expect(outcome.attempts[0]).toEqual({ channel: 'EMAIL', succeeded: false, cause: 'timeout' });
    expect(outcome.channel).toBe('SMS');
  });

  it('all channels down -> no channel, one failed attempt each', async () => {
    const { delivery } = build([
      new FakeNotificationChannel('EMAIL', true),
      new FakeNotificationChannel('SMS', true),
      new FakeNotificationChannel('PUSH', true),
    ]);

    const outcome = await delivery.deliver(notification, 'EMAIL');

    expect(outcome.channel).toBeNull();
    expect(outcome.attempts.map((a) => a.succeeded)).toEqual([false, false, false]);
  });

  it('caller aborts during a send -> cancelled, no further channel tried', async () => {
    const controller = new AbortController();
    const hanging = new HangingNotificationChannel('EMAIL');
    const next = new FakeNotificationChannel('SMS');
    const { delivery } = build([hanging, next], 5000);

    const pending = delivery.deliver(notification, 'EMAIL', controller.signal);
    controller.abort();
    const outcome = await pending;

    expect(outcome).toMatchObject({ channel: null, cancelled: true });
    expect(next.sent).toHaveLength(0);
    expect(hanging.signals[0]?.aborted).toBe(true);
  });

  it('signal already aborted -> cancelled before any send', async () => {
    const controller = new AbortController();
    controller.abort();
    const channel = new FakeNotificationChannel('EMAIL');
    const { delivery } = build([channel]);

    expect(await delivery.deliver(notification, 'EMAIL', controller.signal)).toMatchObject({
      cancelled: true,
    });
    expect(channel.sent).toHaveLength(0);
  });

  it('non-Error rejection -> unknown-error cause', async () => {
    const odd = {
      kind: 'EMAIL' as const,
      // Why: simulates a misbehaving adapter that rejects with a non-Error value.
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      send: () => Promise.reject('boom'),
    };
    const { delivery } = build([odd]);

    expect((await delivery.deliver(notification, 'EMAIL')).attempts[0]?.cause).toBe(
      'unknown-error',
    );
  });
});
