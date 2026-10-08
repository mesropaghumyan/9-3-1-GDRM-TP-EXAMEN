import 'reflect-metadata';
import { run } from './run.js';

// Why: the composition root is the only place allowed to read process.argv / process.env.
process.exitCode = await run(process.argv.slice(2), process.env);
