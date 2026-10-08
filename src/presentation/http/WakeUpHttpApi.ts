import { InvalidInputError, type Logger } from '../../domain/index.js';
import type { WakeUpHandler } from '../WakeUpHandler.js';
import type { ApiRequest, ApiResponse } from './ApiExchange.js';

const JSON_TYPE = 'application/json';

const json = (status: number, payload: unknown): ApiResponse => ({
  status,
  contentType: JSON_TYPE,
  body: JSON.stringify(payload),
});

const invalidInput = (message: string): ApiResponse =>
  json(400, { error: 'INVALID_INPUT', message });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * HTTP routing and (de)serialization only; validation and business rules stay in the handler.
 * Contract: docs/api/openapi.yaml. A provider or channel failure is a 200 carrying `FAILED`.
 */
export class WakeUpHttpApi {
  constructor(
    private readonly handler: WakeUpHandler,
    private readonly logger: Logger,
    private readonly openApiDocument: string,
  ) {}

  async handle(request: ApiRequest, signal?: AbortSignal): Promise<ApiResponse> {
    switch (request.path) {
      case '/health':
        return request.method === 'GET' ? json(200, { status: 'UP' }) : this.methodNotAllowed();
      case '/openapi.yaml':
        return request.method === 'GET'
          ? { status: 200, contentType: 'application/yaml', body: this.openApiDocument }
          : this.methodNotAllowed();
      case '/wake-ups':
        return request.method === 'POST'
          ? this.wakeUp(request.body, signal)
          : this.methodNotAllowed();
      default:
        return json(404, { error: 'NOT_FOUND', message: `no route for ${request.path}` });
    }
  }

  private methodNotAllowed(): ApiResponse {
    return json(405, { error: 'METHOD_NOT_ALLOWED', message: 'method not allowed on this route' });
  }

  private async wakeUp(rawBody: string, signal: AbortSignal | undefined): Promise<ApiResponse> {
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch {
      return invalidInput('request body is not valid JSON');
    }
    if (
      !isRecord(payload) ||
      typeof payload['userId'] !== 'string' ||
      typeof payload['day'] !== 'string' ||
      typeof payload['weather'] !== 'string'
    ) {
      return invalidInput('userId, day and weather must all be strings');
    }
    try {
      const result = await this.handler.handle(
        { userId: payload['userId'], day: payload['day'], weather: payload['weather'] },
        signal,
      );
      return json(200, result);
    } catch (error) {
      if (error instanceof InvalidInputError) {
        return invalidInput(error.message);
      }
      // Why: never leak internals to the caller; the cause is logged for the operator.
      this.logger.error('http.unexpected-error', {
        cause: error instanceof Error ? error.message : 'unknown-error',
      });
      return json(500, { error: 'INTERNAL_ERROR', message: 'unexpected error' });
    }
  }
}
