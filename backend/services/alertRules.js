const alertingService = require('./alertingService');
const os = require('os');

/**
 * CivilCOPZ Alert Rule Engine (Operations-Grade - Phase 2)
 * Tracking request volumes, error rates, and resource saturation.
 */

let errorCount = 0;
let requestCount = 0;

/**
 * Track incoming HTTP requests
 */
function trackRequest() {
    requestCount++;
}

/**
 * Track HTTP error responses (4xx/5xx)
 */
function trackError() {
    errorCount++;
}

/**
 * Rule Engine Loop: Execute every 60 seconds
 */
setInterval(async () => {
    // 1. Error Rate Monitoring (Phase 2 & 5)
    if (requestCount > 0) {
        const errorRate = (errorCount / requestCount) * 100;
        if (errorRate > 5) {
            await alertingService.sendAlert({
                type: "CRITICAL_RELIABILITY",
                message: `High error rate detected: ${errorRate.toFixed(2)}% in the last 60s window.`
            });
        }
    }

    // 2. Resource Saturation Monitoring (Phase 5)
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    if (memoryUsage > 80) {
        await alertingService.sendAlert({
            type: "SYSTEM_SATURATION",
            message: `Memory usage of ${memoryUsage.toFixed(2)}% exceeds 80% industrial threshold.`
        });
    }

    // 3. Queue Monitoring Placeholder (Phase 7)
    // Actual queue size is checked in the monitoringService/queue loop

    // Reset counters for next window
    errorCount = 0;
    requestCount = 0;

}, 60000);

module.exports = { trackRequest, trackError };
