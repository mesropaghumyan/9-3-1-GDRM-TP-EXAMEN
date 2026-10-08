import { createTrack } from '../../src/domain/index.js';
import { LocalFallbackMusicProvider } from '../../src/infrastructure/music/local/index.js';
import { musicProviderContract } from './musicProvider.contract.js';

musicProviderContract(
  'LocalFallbackMusicProvider',
  () => new LocalFallbackMusicProvider([createTrack('Here Comes the Sun', 'The Beatles')]),
  { title: 'Here Comes the Sun' },
);
