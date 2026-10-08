/** Règles de couches AD-1 / CLAUDE.md §1.1. */
const layer = (name, forbiddenTargets, comment) => ({
  name: `${name}-no-forbidden-layer`,
  comment,
  severity: 'error',
  from: { path: `^src/${name}/` },
  to: { path: forbiddenTargets },
});

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    layer(
      'domain',
      '^src/(application|infrastructure|presentation|main)/',
      'Le domaine ne dépend de rien.',
    ),
    {
      name: 'domain-no-third-party',
      comment: 'Domaine pur : ni package tiers (tsyringe inclus) ni module Node.',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'core'],
      },
    },
    layer(
      'application',
      '^src/(infrastructure|presentation|main)/',
      "L'application n'importe ni infrastructure, ni présentation, ni main.",
    ),
    {
      name: 'application-only-tsyringe',
      comment: "L'application n'importe de tiers que tsyringe (décorateurs) ; pas de Node I/O.",
      severity: 'error',
      from: { path: '^src/application/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'core'],
        pathNot: '^node_modules/tsyringe/',
      },
    },
    layer(
      'infrastructure',
      '^src/(presentation|main)/',
      "L'infrastructure n'importe ni présentation ni main.",
    ),
    layer(
      'presentation',
      '^src/(infrastructure|main)/',
      "La présentation n'importe ni infrastructure ni main.",
    ),
    {
      name: 'container-only-in-main',
      comment: 'Pas de service locator : container.ts importé uniquement depuis src/main.',
      severity: 'error',
      from: { pathNot: '^src/main/' },
      to: { path: '^src/main/container' },
    },
    {
      name: 'tsyringe-layers',
      comment: 'tsyringe uniquement dans application, infrastructure et main.',
      severity: 'error',
      from: { path: '^src/(domain|presentation)/' },
      to: { path: '^node_modules/tsyringe/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main', 'types'],
    },
  },
};
