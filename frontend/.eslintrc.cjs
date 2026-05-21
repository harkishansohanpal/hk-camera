module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: ['eslint:recommended'],
  plugins: ['react-hooks', 'security'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  overrides: [
    {
      files: ['*.test.js', '*.test.jsx'],
      globals: {
        vi: 'readonly', beforeEach: 'readonly', afterEach: 'readonly',
        describe: 'readonly', it: 'readonly', expect: 'readonly',
      },
    },
  ],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
  },
};
