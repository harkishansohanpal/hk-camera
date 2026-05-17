module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: ['eslint:recommended'],
  plugins: ['react-hooks'],
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
  },
};
