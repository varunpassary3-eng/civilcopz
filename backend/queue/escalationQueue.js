const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

const escalationQueue = new Queue('escalation-engine', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

/**
 * Start the deadline monitoring background substrate.
 * Runs every hour to check for expired notices.
 */
async function startDeadlineMonitor() {
  console.log('⏳ [ESCALATION_QUEUE] Starting repeatable deadline monitor (1h interval)');
  
  await escalationQueue.add(
    'monitor-deadlines',
    {},
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
      jobId: 'DEADLINE_MONITOR_GLOBAL'
    }
  );
}

module.exports = { escalationQueue, startDeadlineMonitor };
