module.exports = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageReporters: ['text', 'text-summary', 'html', 'json'],
  rootDir: '../../../.',
  testMatch: ['<rootDir>/tests/integration/**/*.spec.ts'],
  setupFiles: ['<rootDir>/tests/configurations/jest.setup.js'],
  coverageDirectory: '<rootDir>/coverage/integration',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      { multipleReportsUnitePath: './reports', pageTitle: 'integration', publicPath: './reports', filename: 'integration.html' },
    ],
  ],
  collectCoverage: true,
  moduleDirectories: ['node_modules', 'src'],
  collectCoverageFrom: ['<rootDir>/src/schema/**/*.ts', '!<rootDir>/src/schema/providers/**/*.ts', '!**/node_modules/**', '!**/vendor/**'],
  preset: 'ts-jest',
  testEnvironment: 'node',
};
