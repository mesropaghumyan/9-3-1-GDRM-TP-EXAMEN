import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serve } from '../../src/main/serve.js';

let server: Server;
let port: number;

function call(method: string, path: string, body = ''): Promise<{ status: number; body: string }> {
  return new Promise((resolveCall, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolveCall({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

describe('HTTP server (real container, local list as the only provider)', () => {
  beforeEach(async () => {
    // The server logs through the real stdout writer; keep the test output readable.
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    server = await serve({ PORT: '0', MUSIC_PROVIDER_ORDER: 'local' });
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((done) => {
      server.close(() => {
        done();
      });
    });
    vi.restoreAllMocks();
  });

  it('POST /wake-ups with a valid body -> 200 DELIVERED', async () => {
    const response = await call(
      'POST',
      '/wake-ups',
      JSON.stringify({ userId: 'alice', day: 'LUNDI', weather: 'SOLEIL' }),
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      status: 'DELIVERED',
      channel: 'EMAIL',
      providerName: 'local',
    });
  });

  it('POST /wake-ups for an unknown user -> 200 with an explicit FAILED result', async () => {
    const response = await call(
      'POST',
      '/wake-ups',
      JSON.stringify({ userId: 'ghost', day: 'LUNDI', weather: 'SOLEIL' }),
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ status: 'FAILED', reason: 'USER_NOT_FOUND' });
  });

  it('POST /wake-ups with an invalid day -> 400 INVALID_INPUT', async () => {
    const response = await call(
      'POST',
      '/wake-ups',
      JSON.stringify({ userId: 'alice', day: 'FUNDAY', weather: 'SOLEIL' }),
    );

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ error: 'INVALID_INPUT' });
  });

  it('POST /wake-ups with an oversized body -> 413', async () => {
    const response = await call('POST', '/wake-ups', 'x'.repeat(20_000));

    expect(response.status).toBe(413);
  });

  it('GET /health -> 200', async () => {
    expect((await call('GET', '/health')).status).toBe(200);
  });

  it('GET /openapi.yaml -> the published contract, byte for byte', async () => {
    const response = await call('GET', '/openapi.yaml');

    expect(response.status).toBe(200);
    expect(response.body).toBe(
      readFileSync(resolve(import.meta.dirname, '../../docs/api/openapi.yaml'), 'utf8'),
    );
  });
});
