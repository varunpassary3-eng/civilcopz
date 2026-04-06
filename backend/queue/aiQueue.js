const { Queue } = require('bullmq');

// Redis connection configuration
const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3, // Prevent infinite boot hang during VPC failures
  connectTimeout: 5000,
};

// Create AI processing queue
const aiQueue = new Queue('ai-processing', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100,    // Keep last 100 failed jobs
    attempts: 3,          // Retry failed jobs 3 times
    lockDuration: 30000,  // Authoritative: Prevent duplication during shutdown
    backoff: {
      type: 'exponential',
      delay: 2000,        // Initial delay 2 seconds
    },
  },
});

// Add job to queue
aiQueue.addJob = async (type, data) => {
  return await aiQueue.add(type, data, {
    priority: type === 'urgent-classification' ? 10 : 5,
  });
};

module.exports = aiQueue;