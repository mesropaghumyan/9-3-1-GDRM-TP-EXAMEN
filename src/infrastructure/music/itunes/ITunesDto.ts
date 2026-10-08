import { isRecord } from '../isRecord.js';

/** Private third-party shape: `trackViewUrl` is deliberately not even declared. */
export interface ITunesResult {
  readonly trackName: string;
  readonly artistName: string;
}

export interface ITunesResponse {
  readonly results: readonly unknown[];
}

export function isITunesResponse(body: unknown): body is ITunesResponse {
  return isRecord(body) && Array.isArray(body['results']);
}

export function isITunesResult(item: unknown): item is ITunesResult {
  return (
    isRecord(item) &&
    typeof item['trackName'] === 'string' &&
    item['trackName'].trim() !== '' &&
    typeof item['artistName'] === 'string' &&
    item['artistName'].trim() !== ''
  );
}
