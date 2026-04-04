require('dotenv').config({ path: '.env.test' });
const jest = require('jest');

console.log('🔧 Loading test environment...');
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('REDIS_PORT:', process.env.REDIS_PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const options = {
  projects: [__dirname],
  testPathPattern: 'tests/',
  setupFilesAfterEnv: [],
  testEnvironment: 'node',
  collectCoverage: false,
  verbose: true
};

jest.runCLI(options, [__dirname]).then((results) => {
  process.exit(results.results.success ? 0 : 1);
}).catch((error) => {
  console.error('Jest failed:', error);
  process.exit(1);
});