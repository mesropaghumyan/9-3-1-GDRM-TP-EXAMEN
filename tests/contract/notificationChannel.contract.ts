import { describe, expect, it } from 'vitest';
import {
  createTrack,
  createUserId,
  NotificationDeliveryError,
  type ChannelKind,
  type NotificationChannel,
  type WakeUpNotification,
} from '../../src/domain/index.js';

export interface ChannelHarness {
  readonly channel: NotificationChannel;
  /** What the underlying mock received, in its own format. */
  received(): unknown;
}

const notification: WakeUpNotification = {
  recipient: createUserId('alice'),
  title: 'Réveil musical',
  body: "C'est l'heure",
  track: createTrack('Here Comes the Sun', 'The Beatles'),
};

/** Contract every NotificationChannel must honour (CAP-5). */
export function notificationChannelContract(
  name: string,
  kind: ChannelKind,
  create: () => ChannelHarness,
  createFailing: () => NotificationChannel,
  expectedReceived: unknown,
): void {
  describe(`NotificationChannel contract: ${name}`, () => {
    it('exposes its kind', () => {
      expect(create().channel.kind).toBe(kind);
    });

    it('notification -> converted to the mock format (recipient = user id)', async () => {
      const harness = create();

      await harness.channel.send(notification);

      expect(harness.received()).toEqual(expectedReceived);
    });

    it('failing mock -> NotificationDeliveryError', async () => {
      await expect(createFailing().send(notification)).rejects.toBeInstanceOf(
        NotificationDeliveryError,
      );
    });
  });
}
