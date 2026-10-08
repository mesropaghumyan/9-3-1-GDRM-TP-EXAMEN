import type { HttpClient, HttpRequestOptions, HttpResponse } from '../../src/domain/index.js';

export interface RecordedRequest {
  readonly url: string;
  readonly options: HttpRequestOptions;
}

type Reply = HttpResponse | Error;

/** Scripted HttpClient: replies are consumed in order, the last one repeats. */
export class FakeHttpClient implements HttpClient {
  readonly requests: RecordedRequest[] = [];
  private index = 0;

  constructor(private readonly replies: readonly Reply[]) {}

  getJson(url: string, options: HttpRequestOptions): Promise<HttpResponse> {
    this.requests.push({ url, options });
    const reply = this.replies[Math.min(this.index, this.replies.length - 1)];
    this.index += 1;
    if (reply === undefined) {
      return Promise.reject(new Error('FakeHttpClient has no scripted reply'));
    }
    return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply);
  }
}
