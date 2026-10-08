import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const src = join(root, 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** Source without comments: rules about calls must not trip over documentation. */
const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const files = sourceFiles(src).map((path) => ({
  path: relative(root, path).split('\\').join('/'),
  text: readFileSync(path, 'utf8'),
  code: stripComments(readFileSync(path, 'utf8')),
}));
const inLayer = (layer: string) => files.filter((file) => file.path.startsWith(`src/${layer}/`));
const importsOf = (text: string): string[] =>
  [...text.matchAll(/from '([^']+)'/g)].map((match) => match[1] ?? '');

describe('Import rules', () => {
  it.each(['domain', 'application'])(
    '%s -> imports neither infrastructure, main, container, node:* modules nor fetch',
    (layer) => {
      const offenders = inLayer(layer).flatMap((file) =>
        importsOf(file.text)
          .filter((target) => /infrastructure|\/main\/|container|^node:/.test(target))
          .map((target) => `${file.path} -> ${target}`),
      );
      const fetchCalls = inLayer(layer).filter((file) => /(?<![.\w])fetch\s*\(/.test(file.code));

      expect(offenders).toEqual([]);
      expect(fetchCalls.map((file) => file.path)).toEqual([]);
    },
  );

  it('tsyringe -> imported only by application, infrastructure and main', () => {
    const offenders = files
      .filter((file) => importsOf(file.text).includes('tsyringe'))
      .filter((file) => !/^src\/(application|infrastructure|main)\//.test(file.path));

    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('service locator -> container imported from tsyringe only in src/main', () => {
    const offenders = files
      .filter((file) => /import\s*\{[^}]*\bcontainer\b[^}]*\}\s*from 'tsyringe'/.test(file.text))
      .filter((file) => !file.path.startsWith('src/main/'));

    expect(offenders.map((file) => file.path)).toEqual([]);
  });
});

describe('Implicit dependencies', () => {
  it('fetch -> called only by infrastructure/http', () => {
    const offenders = files
      .filter((file) => /(?<![.\w])fetch\s*\(/.test(file.code))
      .filter((file) => !file.path.startsWith('src/infrastructure/http/'));

    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('process.env, process.argv -> read only in src/main', () => {
    const offenders = files
      .filter((file) => /process\.(env|argv)/.test(file.code))
      .filter((file) => !file.path.startsWith('src/main/'));

    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('process.stdout -> referenced only by StdoutLogWriter', () => {
    const offenders = files
      .filter((file) => /process\.stdout/.test(file.code))
      .filter((file) => file.path !== 'src/infrastructure/logging/StdoutLogWriter.ts');

    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('console.*, Math.random, Date.now -> absent from src', () => {
    const offenders = files.filter((file) => /console\.|Math\.random|Date\.now/.test(file.code));

    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('Date -> constructed only by SystemClock', () => {
    const offenders = files
      .filter((file) => /new Date\(/.test(file.code))
      .filter((file) => file.path !== 'src/infrastructure/clock/SystemClock.ts');

    expect(offenders.map((file) => file.path)).toEqual([]);
  });
});

describe('Third-party DTO leaks', () => {
  it.each(['trackViewUrl', 'artist-credit'])(
    '%s -> appears only under infrastructure/music',
    (field) => {
      const offenders = files
        .filter((file) => file.text.includes(field))
        .filter((file) => !file.path.startsWith('src/infrastructure/music/'));

      expect(offenders.map((file) => file.path)).toEqual([]);
    },
  );
});

describe('Concrete implementations', () => {
  it('application and domain -> never `new` an infrastructure class', () => {
    const infrastructureClasses = inLayer('infrastructure').flatMap((file) =>
      [...file.text.matchAll(/export (?:abstract )?class (\w+)/g)].map((match) => match[1] ?? ''),
    );
    expect(infrastructureClasses.length).toBeGreaterThan(10);

    const offenders = [...inLayer('application'), ...inLayer('domain')].flatMap((file) =>
      infrastructureClasses
        .filter((name) => new RegExp(`new ${name}\\(`).test(file.text))
        .map((name) => `${file.path}: new ${name}`),
    );

    expect(offenders).toEqual([]);
  });

  it('no `new` of a concrete implementation anywhere in src except container.ts', () => {
    // Allowed by CLAUDE.md §1.5: value objects, errors, and platform types.
    const allowed = /^(Map|Set|Date|URL|URLSearchParams|AbortController|Promise|Array|\w*Error)$/;
    const offenders = files
      .filter((file) => file.path !== 'src/main/container.ts')
      .flatMap((file) =>
        [...file.code.matchAll(/\bnew ([A-Z]\w*)/g)]
          .map((match) => match[1] ?? '')
          .filter((name) => !allowed.test(name))
          .map((name) => `${file.path}: new ${name}`),
      );

    expect(offenders).toEqual([]);
  });

  it('only src/main/container.ts registers implementations with the container', () => {
    const offenders = files
      .filter((file) => /\.(register|registerSingleton|registerInstance)\(/.test(file.text))
      .filter((file) => file.path !== 'src/main/container.ts');

    expect(offenders.map((file) => file.path)).toEqual([]);
  });
});
