// Why: injection tokens for infrastructure-only collaborators (configuration objects and mocked clients).
export const LOCAL_TRACKS = Symbol('LocalTracks');
export const USER_PREFERENCES_DATA = Symbol('UserPreferencesData');
export const EMAIL_CLIENT = Symbol('EmailClient');
export const SMS_GATEWAY = Symbol('SmsGateway');
export const PUSH_SERVICE = Symbol('PushService');
export const HTTP_CONFIG = Symbol('HttpConfig');
export const BREAKER_CONFIG = Symbol('BreakerConfig');
export const ITUNES_CONFIG = Symbol('ItunesConfig');
