import { describe, expect, it } from 'vitest';
import type { WakeUpUseCase } from '../../../src/application/index.js';
import type { WakeUpResult } from '../../../src/domain/index.js';
import { WakeUpHandler, WakeUpHttpApi } from '../../../src/presentation/index.js';
import { RecordingLogger } from '../../fakes/RecordingLogger.js';

const delivered: WakeUpResult = {
  status: 'DELIVERED',
  degraded: false,
  track: { title: 't', artist: 'a' },
  trackSource: 'WEATHER',
  providerName: 'local',
  channel: 'EMAIL',
  attempts: [{ channel: 'EMAIL', succeeded: true }],
};
const failed: WakeUpResult = {
  status: 'FAILED',
  degraded: true,
  reason: 'USER_NOT_FOUND',
  attempts: [],
};

function build(behavior: WakeUpResult | Error) {
  const calls: unknown[][] = [];
  const useCase: WakeUpUseCase = {
    trigger: (...args) => {
      calls.push(args);
      return behavior instanceof Error ? Promise.reject(behavior) : Promise.resolve(behavior);
    },
  };
  const logger = new RecordingLogger();
  return {
    api: new WakeUpHttpApi(new WakeUpHandler(useCase), logger, 'openapi: 3.0.3'),
    calls,
    logger,
  };
}

const post = (body: string) => ({ method: 'POST', path: '/wake-ups', body });
const valid = JSON.stringify({ userId: 'alice', day: 'LUNDI', weather: 'SOLEIL' });

describe('WakeUpHttpApi', () => {
  it('valid body -> 200 with the DELIVERED result', async () => {
    const { api, calls } = build(delivered);

    const response = await api.handle(post(valid));

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual(delivered);
    expect(calls[0]).toEqual(['alice', 'MONDAY', 'SUNNY', undefined]);
  });

  it('use case returning FAILED -> still 200, the failure is explicit in the body', async () => {
    const { api } = build(failed);

    const response = await api.handle(post(valid));

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ status: 'FAILED', reason: 'USER_NOT_FOUND' });
  });

  it.each([
    ['malformed JSON', '{nope'],
    ['JSON array', '[]'],
    ['missing field', JSON.stringify({ userId: 'a', day: 'LUNDI' })],
    ['non-string field', JSON.stringify({ userId: 1, day: 'LUNDI', weather: 'SOLEIL' })],
    ['unknown day', JSON.stringify({ userId: 'a', day: 'FUNDAY', weather: 'SOLEIL' })],
    ['unknown weather', JSON.stringify({ userId: 'a', day: 'LUNDI', weather: 'BROUILLARD' })],
    ['blank userId', JSON.stringify({ userId: ' ', day: 'LUNDI', weather: 'SOLEIL' })],
  ])('%s -> 400 INVALID_INPUT and the use case is never called', async (_name, body) => {
    const { api, calls } = build(delivered);

    const response = await api.handle(post(body));

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ error: 'INVALID_INPUT' });
    expect(calls).toHaveLength(0);
  });

  it('unexpected error -> 500 without leaking the cause, which is logged', async () => {
    const { api, logger } = build(new TypeError('secret detail'));

    const response = await api.handle(post(valid));

    expect(response.status).toBe(500);
    expect(response.body).not.toContain('secret detail');
    expect(logger.events('error')).toEqual(['http.unexpected-error']);
  });

  it('GET /health -> 200 UP', async () => {
    const response = await build(delivered).api.handle({
      method: 'GET',
      path: '/health',
      body: '',
    });

    expect(response).toMatchObject({ status: 200, body: JSON.stringify({ status: 'UP' }) });
  });

  it('GET /openapi.yaml -> the contract as YAML', async () => {
    const response = await build(delivered).api.handle({
      method: 'GET',
      path: '/openapi.yaml',
      body: '',
    });

    expect(response).toEqual({
      status: 200,
      contentType: 'application/yaml',
      body: 'openapi: 3.0.3',
    });
  });

  it.each([
    ['GET', '/wake-ups'],
    ['POST', '/health'],
    ['DELETE', '/openapi.yaml'],
  ])('%s %s -> 405', async (method, path) => {
    expect((await build(delivered).api.handle({ method, path, body: '' })).status).toBe(405);
  });

  it('unknown path -> 404', async () => {
    expect(
      (await build(delivered).api.handle({ method: 'GET', path: '/nope', body: '' })).status,
    ).toBe(404);
  });
});
