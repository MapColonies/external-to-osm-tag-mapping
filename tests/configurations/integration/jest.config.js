module.exports = {
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  coverageReporters: ['text', 'text-summary', 'html', 'json'],
  rootDir: '../../../.',
  testMatch: ['<rootDir>/tests/integration/**/*.spec.ts'],
  setupFiles: ['<rootDir>/tests/configurations/jest.setup.ts'],
  setupFilesAfterEnv: ['jest-openapi', '<rootDir>/tests/configurations/initJestOpenapi.setup.ts'],
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
  collectCoverageFrom: ['<rootDir>/src/schema/**/*.ts', '!**/node_modules/**', '!**/vendor/**', '!*/common/**', '!**/models/**', '!<rootDir>/src/*'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10,
    },
  },
};
