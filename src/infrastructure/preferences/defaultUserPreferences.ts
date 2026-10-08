import type { UserPreferences } from '../../domain/index.js';

// Why: stands in for the internal preferences service (mocked); not business logic.
export const DEFAULT_USER_PREFERENCES: ReadonlyMap<string, UserPreferences> = new Map([
  [
    'alice',
    {
      trackByWeather: new Map([
        ['SUNNY', { title: 'Here Comes the Sun', artist: 'The Beatles' }],
        ['RAIN', { title: "Singin' in the Rain", artist: 'Gene Kelly' }],
        ['SNOW', { title: 'Let It Snow', artist: 'Dean Martin' }],
      ]),
      fallbackTrack: { title: 'Three Little Birds', artist: 'Bob Marley' },
      preferredChannel: 'EMAIL',
    },
  ],
  [
    'bob',
    {
      trackByWeather: new Map([
        ['SUNNY', { title: 'Walking on Sunshine' }],
        ['RAIN', { title: 'Purple Rain', artist: 'Prince' }],
        ['SNOW', { title: 'Let It Snow', artist: 'Dean Martin' }],
        ['CLOUDY', { title: 'Cloudy', artist: 'Simon & Garfunkel' }],
      ]),
      fallbackTrack: { title: 'Good Day Sunshine', artist: 'The Beatles' },
      preferredChannel: 'SMS',
    },
  ],
  [
    'carol',
    {
      trackByWeather: new Map([['SUNNY', { title: 'Good Day Sunshine', artist: 'The Beatles' }]]),
      fallbackTrack: { title: 'Three Little Birds', artist: 'Bob Marley' },
      preferredChannel: 'PUSH',
    },
  ],
]);
