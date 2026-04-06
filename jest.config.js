module.exports = {
  testEnvironment: 'node',
  verbose: true,
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.js'],
  setupFiles: ['<rootDir>/test/setup.js'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/test/reports/coverage',
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: '<rootDir>/test/reports/junit', outputName: 'test-results.xml' }]
  ],
  testTimeout: 30000
};
