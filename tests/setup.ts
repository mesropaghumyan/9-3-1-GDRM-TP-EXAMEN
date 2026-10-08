import 'reflect-metadata';
import { beforeEach, vi } from 'vitest';

// Why: aucun appel réseau réel en test (CLAUDE.md §6.1) ; toute requête non prévue échoue bruyamment.
beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('Network access is forbidden in tests: inject a fake HttpClient instead.');
  });
});
