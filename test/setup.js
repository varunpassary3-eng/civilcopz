require('dotenv').config({ path: 'backend/.env.test' });

process.env.NODE_ENV = 'test';

// Global error handling for tests
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
