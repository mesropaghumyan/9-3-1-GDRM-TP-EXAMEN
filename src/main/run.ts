import { InvalidInputError, LOG_WRITER, type LogWriter } from '../domain/index.js';
import { loadConfig, type Environment } from '../infrastructure/config/index.js';
import { WAKE_UP_HANDLER, type WakeUpHandler } from '../presentation/index.js';
import { buildContainer } from './container.js';

/** Minimal command line: `<userId> <day> <weather>` (e.g. `alice LUNDI SOLEIL`). Returns the exit code. */
export async function run(argv: readonly string[], env: Environment): Promise<number> {
  const container = buildContainer(loadConfig(env));
  const output = container.resolve<LogWriter>(LOG_WRITER);
  const handler = container.resolve<WakeUpHandler>(WAKE_UP_HANDLER);
  const [userId = '', day = '', weather = ''] = argv;
  try {
    const result = await handler.handle({ userId, day, weather });
    output.write(JSON.stringify({ result }));
    return result.status === 'DELIVERED' ? 0 : 1;
  } catch (error) {
    if (error instanceof InvalidInputError) {
      output.write(JSON.stringify({ error: 'INVALID_INPUT', message: error.message }));
      return 2;
    }
    throw error;
  }
}
