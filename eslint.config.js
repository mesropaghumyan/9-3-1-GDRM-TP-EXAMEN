import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/', '_bmad/', '.claude/', 'tests/fixtures/'] },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
      ],
      'no-console': 'error',
      'no-empty': 'error',
      // Why: dépendances implicites interdites (CLAUDE.md §0.5) ; le temps passe par le port Clock.
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Use the Clock port instead of new Date().',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Use the Clock port instead of Date.now().',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Math.random() is non-deterministic and forbidden.',
        },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.cjs', 'vitest.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
);
