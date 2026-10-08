import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../../src/infrastructure/config/index.js';

describe('loadConfig', () => {
  it('empty environment -> typed defaults', () => {
    const config = loadConfig({});

    expect(config.music.providerOrder).toEqual(['itunes', 'musicbrainz', 'local']);
    expect(config.music.localTracks.length).toBeGreaterThanOrEqual(3);
    expect(config.notifications.channelFallbackOrder).toEqual(['EMAIL', 'SMS', 'PUSH']);
    expect(config.notifications.sendTimeoutMs).toBe(2000);
    expect(config.http.maxRetries).toBe(1);
    expect(config.breaker).toEqual({ failureThreshold: 3, halfOpenAfterMs: 30_000 });
  });

  it('valid overrides -> applied', () => {
    const config = loadConfig({
      MUSIC_PROVIDER_ORDER: 'itunes, local',
      CHANNEL_FALLBACK_ORDER: 'PUSH,SMS,EMAIL',
      NOTIFICATION_TIMEOUT_MS: '500',
    });

    expect(config.music.providerOrder).toEqual(['itunes', 'local']);
    expect(config.notifications.channelFallbackOrder).toEqual(['PUSH', 'SMS', 'EMAIL']);
    expect(config.notifications.sendTimeoutMs).toBe(500);
  });

  it('user agent -> overridable and never empty by default', () => {
    expect(loadConfig({}).music.musicbrainz.userAgent).not.toBe('');
    expect(
      loadConfig({ MUSICBRAINZ_USER_AGENT: 'App/1 ( me@x.org )' }).music.musicbrainz.userAgent,
    ).toBe('App/1 ( me@x.org )');
  });

  it('result -> frozen', () => {
    expect(Object.isFrozen(loadConfig({}))).toBe(true);
  });

  it.each([
    ['unknown provider', { MUSIC_PROVIDER_ORDER: 'spotify,local' }],
    ['chain not ending with local', { MUSIC_PROVIDER_ORDER: 'local,itunes' }],
    ['duplicate provider', { MUSIC_PROVIDER_ORDER: 'local,local' }],
    ['empty provider order', { MUSIC_PROVIDER_ORDER: '' }],
    ['unknown channel', { CHANNEL_FALLBACK_ORDER: 'EMAIL,FAX' }],
    ['blank user agent', { MUSICBRAINZ_USER_AGENT: '  ' }],
    ['non numeric timeout', { NOTIFICATION_TIMEOUT_MS: 'fast' }],
    ['timeout too small', { NOTIFICATION_TIMEOUT_MS: '5' }],
    ['timeout too large', { NOTIFICATION_TIMEOUT_MS: '600000' }],
  ])('%s -> explicit ConfigError', (_name, env) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
  });
});
