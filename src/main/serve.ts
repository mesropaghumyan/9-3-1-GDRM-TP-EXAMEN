import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { LOGGER, type Logger } from '../domain/index.js';
import { loadConfig, type Environment } from '../infrastructure/config/index.js';
import { createHttpServer, WAKE_UP_HTTP_API, type WakeUpHttpApi } from '../presentation/index.js';
import { buildContainer } from './container.js';

// Why: the contract is read once here (the composition root owns file access) and served as-is.
const OPENAPI_URL = new URL('../../docs/api/openapi.yaml', import.meta.url);

/** Starts the HTTP server described by docs/api/openapi.yaml and resolves once it listens. */
export async function serve(env: Environment): Promise<Server> {
  const config = loadConfig(env);
  const container = buildContainer(config, await readFile(OPENAPI_URL, 'utf8'));
  const logger = container.resolve<Logger>(LOGGER);
  const api = container.resolve<WakeUpHttpApi>(WAKE_UP_HTTP_API);
  const server = createHttpServer(api);
  await new Promise<void>((resolve) => {
    server.listen(config.server.port, resolve);
  });
  const address = server.address();
  logger.info('server.listening', {
    port: typeof address === 'object' && address !== null ? address.port : config.server.port,
  });
  return server;
}
