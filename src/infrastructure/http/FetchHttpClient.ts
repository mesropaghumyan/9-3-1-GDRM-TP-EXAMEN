import { inject, injectable } from 'tsyringe';
import type { HttpClient, HttpRequestOptions, HttpResponse } from '../../domain/index.js';
import type { HttpConfig } from '../config/index.js';
import { HTTP_CONFIG } from '../tokens.js';
import { HttpTransportError } from './HttpTransportError.js';

/** The only caller of the global `fetch`. Bounded: per-attempt timeout, one retry at most. */
@injectable()
export class FetchHttpClient implements HttpClient {
  constructor(@inject(HTTP_CONFIG) private readonly config: HttpConfig) {}

  async getJson(url: string, options: HttpRequestOptions): Promise<HttpResponse> {
    for (let attempt = 0; ; attempt += 1) {
      const canRetry = attempt < this.config.maxRetries;
      // Why: a fresh timeout per attempt, otherwise a retry would start with an expired signal.
      const timeout = AbortSignal.timeout(options.timeoutMs);
      const signal =
        options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout]);
      try {
        const response = await fetch(url, { headers: { ...options.headers }, signal });
        // Why: only 5xx is worth replaying; a 4xx (e.g. 429) would just worsen the rate limit.
        if (response.status >= 500 && canRetry) {
          continue;
        }
        return { status: response.status, body: await readJson(response) };
      } catch (error) {
        if (options.signal?.aborted === true) {
          throw error;
        }
        if (!canRetry) {
          throw new HttpTransportError(`request failed: ${url}`, { cause: error });
        }
      }
    }
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    // Why: an unreadable body is reported as null; adapters treat it as "provider unavailable".
    return null;
  }
}
