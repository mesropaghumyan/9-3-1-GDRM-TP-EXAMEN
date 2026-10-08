import { describe, expect, it } from 'vitest';
import { ChannelResolver } from '../../../src/application/index.js';
import { FakeNotificationChannel } from '../../fakes/FakeNotificationChannel.js';
import { RecordingLogger } from '../../fakes/RecordingLogger.js';

const all = [
  new FakeNotificationChannel('EMAIL'),
  new FakeNotificationChannel('SMS'),
  new FakeNotificationChannel('PUSH'),
];

describe('ChannelResolver', () => {
  it.each([
    ['EMAIL', ['EMAIL', 'SMS', 'PUSH']],
    ['SMS', ['SMS', 'EMAIL', 'PUSH']],
    ['PUSH', ['PUSH', 'EMAIL', 'SMS']],
  ] as const)('preferred %s -> %j', (preferred, expected) => {
    const resolver = new ChannelResolver(all, ['EMAIL', 'SMS', 'PUSH'], new RecordingLogger());

    expect(resolver.resolve(preferred).map((channel) => channel.kind)).toEqual(expected);
  });

  it('configured order -> followed after the preferred channel', () => {
    const resolver = new ChannelResolver(all, ['PUSH', 'SMS', 'EMAIL'], new RecordingLogger());

    expect(resolver.resolve('EMAIL').map((channel) => channel.kind)).toEqual([
      'EMAIL',
      'PUSH',
      'SMS',
    ]);
  });

  it('channel missing from the registered list -> skipped and logged', () => {
    const logger = new RecordingLogger();
    const resolver = new ChannelResolver(
      [all[0] as FakeNotificationChannel],
      ['EMAIL', 'SMS'],
      logger,
    );

    expect(resolver.resolve('EMAIL').map((channel) => channel.kind)).toEqual(['EMAIL']);
    expect(logger.events('warn')).toEqual(['notification.channel.unregistered']);
  });
});
