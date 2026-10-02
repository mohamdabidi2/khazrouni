/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  verbose: true,
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
