const { exec } = require("child_process");

/**
 * Cloud Function for automated rollback on deployment alerts
 * Triggers on Cloud Monitoring alerts via Pub/Sub
 */
exports.rollbackOnAlert = async (event, context) => {
  try {
    const message = JSON.parse(Buffer.from(event.data, 'base64').toString());
    console.log('Received alert:', JSON.stringify(message, null, 2));

    // Validate this is an open incident for CivilCOPZ backend
    if (message.incident?.state !== "open") {
      console.log('Incident not open, ignoring');
      return;
    }

    // Check if it's a deployment-related alert (error rate > 2%)
    const condition = message.incident?.condition;
    if (!condition || !condition.displayName?.includes('Error Rate')) {
      console.log('Not a deployment error alert, ignoring');
      return;
    }

    console.log('🚨 Deployment alert triggered → Initiating rollback');

    // Get current traffic configuration
    const { stdout: trafficOutput } = await execPromise(`
      gcloud run services describe civilcopz-backend \
        --region us-central1 \
        --format="value(status.traffic)"
    `);

    const traffic = JSON.parse(trafficOutput);
    console.log('Current traffic:', traffic);

    // Find the previous revision (traffic[1] is typically the previous)
    if (traffic.length < 2) {
      console.log('No previous revision available for rollback');
      return;
    }

    const previousRevision = traffic[1].revisionName;
    console.log(`Rolling back to previous revision: ${previousRevision}`);

    // Execute rollback
    await execPromise(`
      gcloud run services update-traffic civilcopz-backend \
        --region us-central1 \
        --to-revisions ${previousRevision}=100
    `);

    console.log('✅ Rollback completed successfully');

    // Optional: Send notification (could integrate with Slack, email, etc.)
    // await sendNotification('Rollback executed due to deployment alert');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    // Could add retry logic or escalation here
  }
};

/**
 * Promise wrapper for exec
 */
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}