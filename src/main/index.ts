import 'reflect-metadata';
import { run } from './run.js';
import { serve } from './serve.js';

// Why: the composition root is the only place allowed to read process.argv / process.env.
const [command] = process.argv.slice(2);
if (command === 'serve') {
  await serve(process.env);
} else {
  process.exitCode = await run(process.argv.slice(2), process.env);
}
