export interface HttpResponse {
  readonly status: number;
  readonly body: unknown;
}

export interface HttpRequestOptions {
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}

export interface HttpClient {
  getJson(url: string, options: HttpRequestOptions): Promise<HttpResponse>;
}
export const HTTP_CLIENT = Symbol('HttpClient');
