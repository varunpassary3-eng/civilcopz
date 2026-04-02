const axios = require('axios');
const nodemailer = require('nodemailer');

// Alerting and monitoring service
class AlertingService {
    constructor() {
        this.alertHistory = new Map();
        this.alertCooldown = 5 * 60 * 1000; // 5 minutes cooldown between similar alerts

        // Configure email transporter
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Alert thresholds
        this.thresholds = {
            responseTime: 5000, // 5 seconds
            errorRate: 0.05, // 5% error rate
            cpuUsage: 90, // 90% CPU
            memoryUsage: 90, // 90% memory
            diskUsage: 90, // 90% disk
            queueDepth: 1000, // 1000 queued jobs
            dbConnections: 90 // 90% of max connections
        };
    }

    /**
     * Send alert through multiple channels
     * @param {Object} alert - Alert configuration
     */
    async sendAlert(alert) {
        const alertKey = `${alert.type}-${alert.severity}-${alert.source}`;

        // Check cooldown
        if (this.alertHistory.has(alertKey)) {
            const lastAlert = this.alertHistory.get(alertKey);
            if (Date.now() - lastAlert < this.alertCooldown) {
                return; // Skip alert due to cooldown
            }
        }

        this.alertHistory.set(alertKey, Date.now());

        // Send alerts through multiple channels
        const alertPromises = [
            this.sendEmailAlert(alert),
            this.sendSentryAlert(alert),
            this.sendUptimeRobotAlert(alert),
            this.logAlert(alert)
        ];

        try {
            await Promise.allSettled(alertPromises);
        } catch (error) {
            console.error('Alert sending failed:', error);
        }
    }

    /**
     * Send email alert
     * @param {Object} alert - Alert data
     */
    async sendEmailAlert(alert) {
        if (!process.env.SMTP_USER || !process.env.ALERT_EMAIL) {
            return;
        }

        const subject = `[${alert.severity.toUpperCase()}] CivilCOPZ Alert: ${alert.title}`;
        const body = this.formatAlertEmail(alert);

        try {
            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: process.env.ALERT_EMAIL,
                subject,
                html: body
            });
        } catch (error) {
            console.error('Email alert failed:', error);
        }
    }

    /**
     * Send alert to Sentry
     * @param {Object} alert - Alert data
     */
    async sendSentryAlert(alert) {
        if (!process.env.SENTRY_DSN) {
            return;
        }

        try {
            const Sentry = require('@sentry/node');
            if (Sentry.getCurrentHub().getClient()) {
                Sentry.captureMessage(`Alert: ${alert.title}`, {
                    level: alert.severity === 'critical' ? 'fatal' : alert.severity,
                    tags: {
                        alert_type: alert.type,
                        alert_source: alert.source
                    },
                    extra: alert
                });
            }
        } catch (error) {
            console.error('Sentry alert failed:', error);
        }
    }

    /**
     * Send alert to Uptime Robot (for external monitoring)
     * @param {Object} alert - Alert data
     */
    async sendUptimeRobotAlert(alert) {
        if (!process.env.UPTIME_ROBOT_API_KEY) {
            return;
        }

        // Uptime Robot alerts are typically handled by their monitoring
        // This would be for custom integrations
        console.log('Uptime Robot alert:', alert.title);
    }

    /**
     * Log alert to console and monitoring system
     * @param {Object} alert - Alert data
     */
    async logAlert(alert) {
        const logData = {
            timestamp: new Date().toISOString(),
            type: 'alert',
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
            source: alert.source,
            metrics: alert.metrics,
            recommendations: alert.recommendations
        };

        console.error('🚨 ALERT:', JSON.stringify(logData, null, 2));

        // Send to monitoring service if available
        if (global.monitoringService) {
            global.monitoringService.recordAlert(logData);
        }
    }

    /**
     * Format alert for email
     * @param {Object} alert - Alert data
     * @returns {string} HTML email body
     */
    formatAlertEmail(alert) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: ${this.getSeverityColor(alert.severity)};">
                    🚨 ${alert.severity.toUpperCase()}: ${alert.title}
                </h2>

                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>Description:</h3>
                    <p>${alert.description}</p>
                </div>

                <div style="background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>Details:</h3>
                    <ul>
                        <li><strong>Source:</strong> ${alert.source}</li>
                        <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                        <li><strong>Type:</strong> ${alert.type}</li>
                        ${alert.metrics ? `<li><strong>Metrics:</strong> ${JSON.stringify(alert.metrics)}</li>` : ''}
                    </ul>
                </div>

                ${alert.recommendations ? `
                <div style="background: #e8f4fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
                    <h3>Recommended Actions:</h3>
                    <ul>
                        ${alert.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                    <p>This alert was generated by CivilCOPZ monitoring system.</p>
                    <p>Please investigate immediately if this is a critical alert.</p>
                </div>
            </div>
        `;
    }

    /**
     * Get color for severity level
     * @param {string} severity - Alert severity
     * @returns {string} Color code
     */
    getSeverityColor(severity) {
        switch (severity) {
            case 'critical': return '#d32f2f';
            case 'high': return '#f57c00';
            case 'medium': return '#fbc02d';
            case 'low': return '#388e3c';
            default: return '#666';
        }
    }

    // Predefined alert types

    /**
     * Alert for high response times
     * @param {number} responseTime - Response time in ms
     * @param {string} endpoint - API endpoint
     */
    async alertHighResponseTime(responseTime, endpoint) {
        if (responseTime > this.thresholds.responseTime) {
            await this.sendAlert({
                type: 'performance',
                severity: responseTime > 10000 ? 'critical' : 'high',
                title: 'High Response Time Detected',
                description: `Response time of ${responseTime}ms exceeds threshold of ${this.thresholds.responseTime}ms`,
                source: endpoint,
                metrics: { responseTime, threshold: this.thresholds.responseTime },
                recommendations: [
                    'Check database query performance',
                    'Review caching strategy',
                    'Consider scaling application instances',
                    'Check for memory leaks'
                ]
            });
        }
    }

    /**
     * Alert for high error rates
     * @param {number} errorRate - Error rate (0-1)
     * @param {string} service - Service name
     */
    async alertHighErrorRate(errorRate, service) {
        if (errorRate > this.thresholds.errorRate) {
            await this.sendAlert({
                type: 'reliability',
                severity: errorRate > 0.1 ? 'critical' : 'high',
                title: 'High Error Rate Detected',
                description: `Error rate of ${(errorRate * 100).toFixed(2)}% exceeds threshold of ${(this.thresholds.errorRate * 100)}%`,
                source: service,
                metrics: { errorRate, threshold: this.thresholds.errorRate },
                recommendations: [
                    'Check application logs for error patterns',
                    'Review recent deployments',
                    'Check database connectivity',
                    'Verify external service dependencies'
                ]
            });
        }
    }

    /**
     * Alert for system resource usage
     * @param {string} resource - Resource type (cpu, memory, disk)
     * @param {number} usage - Usage percentage
     */
    async alertHighResourceUsage(resource, usage) {
        const threshold = this.thresholds[`${resource}Usage`];
        if (usage > threshold) {
            await this.sendAlert({
                type: 'system',
                severity: usage > 95 ? 'critical' : 'high',
                title: `High ${resource.toUpperCase()} Usage`,
                description: `${resource.toUpperCase()} usage of ${usage}% exceeds threshold of ${threshold}%`,
                source: 'system_monitoring',
                metrics: { usage, threshold, resource },
                recommendations: [
                    `Check ${resource} intensive processes`,
                    'Consider scaling resources',
                    'Review application performance',
                    'Check for memory leaks'
                ]
            });
        }
    }

    /**
     * Alert for queue depth issues
     * @param {number} queueDepth - Current queue depth
     * @param {string} queueName - Queue name
     */
    async alertQueueDepth(queueDepth, queueName) {
        if (queueDepth > this.thresholds.queueDepth) {
            await this.sendAlert({
                type: 'queue',
                severity: queueDepth > 2000 ? 'critical' : 'high',
                title: 'High Queue Depth',
                description: `Queue ${queueName} has ${queueDepth} pending jobs, exceeds threshold of ${this.thresholds.queueDepth}`,
                source: queueName,
                metrics: { queueDepth, threshold: this.thresholds.queueDepth },
                recommendations: [
                    'Check worker processes',
                    'Scale queue workers',
                    'Review job processing performance',
                    'Check for stuck jobs'
                ]
            });
        }
    }

    /**
     * Alert for database issues
     * @param {string} issue - Database issue type
     * @param {Object} details - Issue details
     */
    async alertDatabaseIssue(issue, details) {
        await this.sendAlert({
            type: 'database',
            severity: 'critical',
            title: 'Database Issue Detected',
            description: `Database issue: ${issue}`,
            source: 'database_monitoring',
            metrics: details,
            recommendations: [
                'Check database connectivity',
                'Review database logs',
                'Check disk space',
                'Consider failover procedures'
            ]
        });
    }

    /**
     * Alert for security events
     * @param {string} event - Security event type
     * @param {Object} details - Event details
     */
    async alertSecurityEvent(event, details) {
        await this.sendAlert({
            type: 'security',
            severity: 'high',
            title: 'Security Event Detected',
            description: `Security event: ${event}`,
            source: 'security_monitoring',
            metrics: details,
            recommendations: [
                'Review security logs',
                'Check for unauthorized access',
                'Update security policies if needed',
                'Notify security team'
            ]
        });
    }

    /**
     * Get alert history
     * @param {number} limit - Number of recent alerts to return
     * @returns {Array} Recent alerts
     */
    getAlertHistory(limit = 50) {
        return Array.from(this.alertHistory.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([key, timestamp]) => ({
                alertKey: key,
                timestamp: new Date(timestamp).toISOString()
            }));
    }
}

module.exports = new AlertingService();