module.exports = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
  coverageReporters: ['text-summary', 'html', 'json'],
  reporters: [
    'default',
    ['jest-html-reporters', { multipleReportsUnitePath: './reports', pageTitle: 'unit', publicPath: './reports', filename: 'unit.html' }],
  ],
  rootDir: '../../../.',
  setupFiles: ['<rootDir>/tests/configurations/jest.setup.js'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!**/node_modules/**', '!**/vendor/**'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10,
    },
  },
};
