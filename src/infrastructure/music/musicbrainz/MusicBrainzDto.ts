import { isRecord } from '../isRecord.js';

/** Private third-party shapes: `artist-credit` never leaves this module. */
export interface MusicBrainzRecording {
  readonly title: string;
  readonly 'artist-credit': readonly { readonly name: string }[];
}

export interface MusicBrainzResponse {
  readonly recordings: readonly unknown[];
}

export function isMusicBrainzResponse(body: unknown): body is MusicBrainzResponse {
  return isRecord(body) && Array.isArray(body['recordings']);
}

function hasName(credit: unknown): credit is { name: string } {
  return isRecord(credit) && typeof credit['name'] === 'string' && credit['name'].trim() !== '';
}

export function isMusicBrainzRecording(item: unknown): item is MusicBrainzRecording {
  if (!isRecord(item) || typeof item['title'] !== 'string' || item['title'].trim() === '') {
    return false;
  }
  const credits = item['artist-credit'];
  return Array.isArray(credits) && credits.length > 0 && credits.every(hasName);
}
