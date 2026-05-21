module.exports = {
  root: true,
  env: { node: true, es2021: true, jest: true },
  extends: ['eslint:recommended'],
  plugins: ['security'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-non-literal-regexp': 'warn',
  },
};
