const { Worker } = require('bullmq');
const Sentry = require('@sentry/node');
const dbManager = require('../services/databaseManager');
const aiService = require('../services/aiService');

const getPrisma = () => dbManager.getWriteClient();
const aiRequestTimeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 30000);

// Redis connection configuration
const maxRetriesPerRequest = 3;
const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: null,
};

// Initialize Sentry for worker (Phase 6)
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

// Create AI processing worker
const aiWorker = new Worker('ai-processing', async job => {
  console.log(`Processing AI job: ${job.id} - ${job.name}`);

  try {
    const { caseId, description, title, company } = job.data;

    // Phase 8: Timeout handling for AI service
    const aiResult = await Promise.race([
      aiService.classifyCase(description),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`AI Classification Timeout (${aiRequestTimeoutMs}ms)`)), aiRequestTimeoutMs))
    ]);

    console.log(`AI classification completed for case ${caseId}:`, aiResult);

    const caseLifecycle = require('../services/caseLifecycle');

    // Update case with AI classification results
    await getPrisma().case.update({
      where: { id: caseId },
      data: {
        aiCategory: aiResult.category,
        aiSeverity: aiResult.severity,
        aiConfidence: aiResult.confidence,
        aiKeyIssues: aiResult.keyIssues || [],
        aiSuggestedAction: aiResult.suggestedAction,
        aiRelevantLaws: aiResult.relevantLaws || [],
        aiProcessedAt: new Date(),
      },
    });

    // Auto-transition to Under_Review after AI processing
    await caseLifecycle.updateCaseStatus(
      caseId, 
      'Under_Review', 
      'AI', 
      `AI analysis complete. Classified as ${aiResult.category} with ${aiResult.severity} severity.`
    );

    console.log(`Case ${caseId} updated and transitioned to Under_Review`);

    return {
      caseId,
      ...aiResult,
      processedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`AI processing failed for job ${job.id}:`, error);
    
    // Phase 6: Sentry Error Tracking
    Sentry.captureException(error, {
      extra: { job: job.id, caseId: job.data.caseId }
    });

    // Update case with error status
    if (job.data.caseId) {
      try {
        await getPrisma().case.update({
          where: { id: job.data.caseId },
          data: {
            aiProcessingError: error.message,
            aiProcessedAt: new Date(),
          },
        });
      } catch (dbError) {
        console.error(`Failed to update case ${job.data.caseId} with error:`, dbError);
      }
    }

    throw error;
  }
}, { connection });

// Mock AI classification function
async function mockAIClassification(description) {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // Simple keyword-based classification (replace with real AI)
  const lowerDesc = description.toLowerCase();

  let category = 'Other';
  let severity = 'Low';
  let confidence = 0.7;

  if (lowerDesc.includes('bank') || lowerDesc.includes('account') || lowerDesc.includes('transaction')) {
    category = 'Banking';
    severity = 'High';
    confidence = 0.85;
  } else if (lowerDesc.includes('telecom') || lowerDesc.includes('phone') || lowerDesc.includes('mobile')) {
    category = 'Telecom';
    severity = 'Medium';
    confidence = 0.8;
  } else if (lowerDesc.includes('insurance') || lowerDesc.includes('policy') || lowerDesc.includes('claim')) {
    category = 'Insurance';
    severity = 'Medium';
    confidence = 0.75;
  } else if (lowerDesc.includes('e-commerce') || lowerDesc.includes('online') || lowerDesc.includes('shopping')) {
    category = 'E-Commerce';
    severity = 'Low';
    confidence = 0.7;
  }

  // Add some randomness to simulate AI uncertainty
  if (Math.random() > 0.8) {
    severity = severity === 'High' ? 'Medium' : severity === 'Medium' ? 'Low' : 'Medium';
    confidence -= 0.1;
  }

  return { category, severity, confidence: Math.max(0.5, confidence) };
}

// Event handlers
aiWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

aiWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

aiWorker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} stalled`);
});

console.log('AI Worker started and listening for jobs...');

module.exports = aiWorker;
