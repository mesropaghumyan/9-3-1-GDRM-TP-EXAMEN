import { afterEach, describe, expect, it, vi } from 'vitest';
import { FetchHttpClient, HttpTransportError } from '../../../src/infrastructure/http/index.js';

const client = new FetchHttpClient({ maxRetries: 1 });
const options = { timeoutMs: 1000 };
const json = (status: number, body: unknown = { ok: true }): Response =>
  new Response(JSON.stringify(body), { status });

function stubFetch(...replies: (Response | Error)[]) {
  const fetchMock = vi.fn((): Promise<Response> => {
    const reply = replies.shift();
    return reply instanceof Error || reply === undefined
      ? Promise.reject(reply ?? new Error('unexpected call'))
      : Promise.resolve(reply);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('FetchHttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('200 -> status and parsed body, with headers and a signal', async () => {
    const fetchMock = stubFetch(json(200, { a: 1 }));

    const response = await client.getJson('https://x.test/', {
      ...options,
      headers: { 'User-Agent': 'ua' },
    });

    expect(response).toEqual({ status: 200, body: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://x.test/',
      expect.objectContaining({
        headers: { 'User-Agent': 'ua' },
        signal: expect.any(AbortSignal) as unknown,
      }),
    );
  });

  it('5xx then 200 -> exactly one retry', async () => {
    const fetchMock = stubFetch(json(503), json(200));

    expect((await client.getJson('https://x.test/', options)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('5xx twice -> the 5xx is returned after a single retry', async () => {
    const fetchMock = stubFetch(json(500), json(502));

    expect((await client.getJson('https://x.test/', options)).status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('4xx -> never replayed', async () => {
    const fetchMock = stubFetch(json(429));

    expect((await client.getJson('https://x.test/', options)).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('network error then success -> retried once', async () => {
    const fetchMock = stubFetch(new TypeError('fetch failed'), json(200));

    expect((await client.getJson('https://x.test/', options)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('network error twice -> HttpTransportError carrying the cause', async () => {
    stubFetch(new TypeError('a'), new TypeError('b'));

    await expect(client.getJson('https://x.test/', options)).rejects.toBeInstanceOf(
      HttpTransportError,
    );
  });

  it('invalid JSON body -> body null', async () => {
    stubFetch(new Response('<html>', { status: 200 }));

    expect(await client.getJson('https://x.test/', options)).toEqual({ status: 200, body: null });
  });

  it('caller signal aborted -> original error rethrown, no retry', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = stubFetch(new DOMException('aborted', 'AbortError'));

    await expect(
      client.getJson('https://x.test/', { ...options, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
