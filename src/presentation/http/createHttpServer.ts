import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { WakeUpHttpApi } from './WakeUpHttpApi.js';

const MAX_BODY_BYTES = 16 * 1024;

class BodyTooLargeError extends Error {
  override readonly name = 'BodyTooLargeError';
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    // Why: without a stream encoding, IncomingMessage always yields Buffers.
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new BodyTooLargeError('request body too large');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Thin adapter from node:http to the transport-agnostic API; the caller owns `listen`. */
export function createHttpServer(api: WakeUpHttpApi): Server {
  return createServer((request, response) => {
    // Why: an aborted connection cancels the wake-up and every outgoing call (RG-13).
    const controller = new AbortController();
    response.on('close', () => {
      if (!response.writableEnded) {
        controller.abort();
      }
    });
    void (async () => {
      try {
        const body = await readBody(request);
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        const result = await api.handle(
          { method: request.method ?? 'GET', path, body },
          controller.signal,
        );
        response.writeHead(result.status, { 'Content-Type': result.contentType });
        response.end(result.body);
      } catch (error) {
        const tooLarge = error instanceof BodyTooLargeError;
        response.writeHead(tooLarge ? 413 : 500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR' }));
      }
    })();
  });
}
