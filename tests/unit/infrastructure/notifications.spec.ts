import { describe, expect, it } from 'vitest';
import { createTrack, createUserId, NotificationDeliveryError } from '../../../src/domain/index.js';
import { LoggerNotificationSink } from '../../../src/infrastructure/logging/index.js';
import {
  EmailChannelAdapter,
  FakeEmailClient,
} from '../../../src/infrastructure/notifications/email/index.js';
import {
  FakePushService,
  PushChannelAdapter,
} from '../../../src/infrastructure/notifications/push/index.js';
import {
  FakeSmsGateway,
  SmsChannelAdapter,
} from '../../../src/infrastructure/notifications/sms/index.js';
import { buildWakeUpNotification } from '../../../src/application/index.js';
import { RecordingLogger } from '../../fakes/RecordingLogger.js';
import { RecordingNotificationSink } from '../../fakes/RecordingNotificationSink.js';

const notification = buildWakeUpNotification(
  createUserId('alice'),
  createTrack('Here Comes the Sun', 'The Beatles'),
);

describe('buildWakeUpNotification', () => {
  it('track -> French subject, title and artist in the body, recipient = user id', () => {
    expect(notification.title).toBe('Réveil musical');
    expect(notification.body).toContain('Here Comes the Sun');
    expect(notification.body).toContain('The Beatles');
    expect(notification.recipient).toBe('alice');
  });
});

describe('Simulated channels', () => {
  it('mocks -> record through the sink only, one entry per channel', async () => {
    const sink = new RecordingNotificationSink();

    await new EmailChannelAdapter(new FakeEmailClient(sink)).send(notification);
    await new SmsChannelAdapter(new FakeSmsGateway(sink)).send(notification);
    await new PushChannelAdapter(new FakePushService(sink)).send(notification);

    expect(sink.entries.map((entry) => entry.channel)).toEqual(['EMAIL', 'SMS', 'PUSH']);
    expect(sink.entries.every((entry) => entry.recipient === 'alice')).toBe(true);
  });

  it('sms gateway rejecting -> NotificationDeliveryError carrying the cause', async () => {
    const adapter = new SmsChannelAdapter({ push: () => Promise.reject(new Error('timeout')) });

    await expect(adapter.send(notification)).rejects.toBeInstanceOf(NotificationDeliveryError);
  });

  it('push service throwing -> NotificationDeliveryError', async () => {
    const adapter = new PushChannelAdapter({ dispatch: () => Promise.reject(new Error('boom')) });

    await expect(adapter.send(notification)).rejects.toBeInstanceOf(NotificationDeliveryError);
  });
});

describe('LoggerNotificationSink', () => {
  it('record -> info log with channel, recipient and title, never the console', () => {
    const logger = new RecordingLogger();

    new LoggerNotificationSink(logger).record({ channel: 'SMS', recipient: 'alice', title: 'x' });

    expect(logger.calls).toEqual([
      {
        level: 'info',
        event: 'notification.simulated',
        fields: { channel: 'SMS', recipient: 'alice', title: 'x' },
      },
    ]);
  });
});
