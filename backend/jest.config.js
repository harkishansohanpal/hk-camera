module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/src/__tests__/setup.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};
