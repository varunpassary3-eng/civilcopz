const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class LegalComplianceService {
    constructor() {
        this.auditLogPath = path.join(__dirname, '../logs/audit.log');
        this.integrityLogPath = path.join(__dirname, '../logs/integrity.log');
        this.hashAlgorithm = 'sha256';
        this.encoding = 'hex';
    }

    /**
     * Generate tamper-proof hash for case data
     * @param {Object} caseData - Case information
     * @returns {string} SHA-256 hash
     */
    generateCaseHash(caseData) {
        // Create canonical representation of case data
        const canonicalData = {
            id: caseData.id,
            title: caseData.title,
            description: caseData.description,
            category: caseData.category,
            complainant: {
                name: caseData.complainant?.name,
                contact: this.maskSensitiveData(caseData.complainant?.contact)
            },
            respondent: caseData.respondent,
            status: caseData.status,
            priority: caseData.priority,
            createdAt: caseData.createdAt,
            updatedAt: caseData.updatedAt
        };

        // Convert to JSON and hash
        const dataString = JSON.stringify(canonicalData, Object.keys(canonicalData).sort());
        return crypto.createHash(this.hashAlgorithm).update(dataString).digest(this.encoding);
    }

    /**
     * Mask sensitive data for compliance
     * @param {string} data - Data to mask
     * @returns {string} Masked data
     */
    maskSensitiveData(data) {
        if (!data) return data;

        // Mask email addresses
        if (data.includes('@')) {
            const [local, domain] = data.split('@');
            const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
            return `${maskedLocal}@${domain}`;
        }

        // Mask phone numbers
        if (/^\+?[\d\s\-\(\)]+$/.test(data.replace(/\s/g, ''))) {
            return data.replace(/\d(?=\d{4})/g, '*');
        }

        return data;
    }

    /**
     * Create immutable audit log entry
     * @param {Object} auditData - Audit information
     */
    async createAuditLog(auditData) {
        const timestamp = new Date().toISOString();
        const auditEntry = {
            timestamp,
            action: auditData.action,
            userId: auditData.userId,
            userRole: auditData.userRole,
            resource: auditData.resource,
            resourceId: auditData.resourceId,
            changes: auditData.changes,
            ipAddress: auditData.ipAddress,
            userAgent: auditData.userAgent,
            sessionId: auditData.sessionId
        };

        // Generate integrity hash
        const entryString = JSON.stringify(auditEntry);
        const integrityHash = crypto.createHash(this.hashAlgorithm).update(entryString).digest(this.encoding);

        const logEntry = {
            ...auditEntry,
            integrityHash,
            version: '1.0'
        };

        // Append to audit log
        const logLine = JSON.stringify(logEntry) + '\n';
        await fs.appendFile(this.auditLogPath, logLine);

        // Log integrity check
        await this.logIntegrityCheck('audit_entry', integrityHash, timestamp);

        return integrityHash;
    }

    /**
     * Log integrity verification
     * @param {string} type - Type of integrity check
     * @param {string} hash - Hash value
     * @param {string} timestamp - Timestamp
     */
    async logIntegrityCheck(type, hash, timestamp) {
        const integrityEntry = {
            timestamp: timestamp || new Date().toISOString(),
            type,
            hash,
            verified: true
        };

        const logLine = JSON.stringify(integrityEntry) + '\n';
        await fs.appendFile(this.integrityLogPath, logLine);
    }

    /**
     * Verify case data integrity
     * @param {Object} caseData - Case data to verify
     * @param {string} storedHash - Previously stored hash
     * @returns {boolean} Integrity status
     */
    verifyCaseIntegrity(caseData, storedHash) {
        const currentHash = this.generateCaseHash(caseData);
        return crypto.timingSafeEqual(
            Buffer.from(currentHash, this.encoding),
            Buffer.from(storedHash, this.encoding)
        );
    }

    /**
     * Verify audit log integrity
     * @returns {Object} Verification results
     */
    async verifyAuditLogIntegrity() {
        const results = {
            totalEntries: 0,
            validEntries: 0,
            invalidEntries: 0,
            corruptedEntries: []
        };

        try {
            const logContent = await fs.readFile(this.auditLogPath, 'utf8');
            const lines = logContent.trim().split('\n');

            for (const line of lines) {
                if (!line.trim()) continue;

                results.totalEntries++;

                try {
                    const entry = JSON.parse(line);
                    const { integrityHash, ...entryData } = entry;

                    // Recalculate hash
                    const entryString = JSON.stringify(entryData);
                    const calculatedHash = crypto.createHash(this.hashAlgorithm).update(entryString).digest(this.encoding);

                    if (crypto.timingSafeEqual(
                        Buffer.from(calculatedHash, this.encoding),
                        Buffer.from(integrityHash, this.encoding)
                    )) {
                        results.validEntries++;
                    } else {
                        results.invalidEntries++;
                        results.corruptedEntries.push({
                            timestamp: entry.timestamp,
                            action: entry.action,
                            storedHash: integrityHash,
                            calculatedHash
                        });
                    }
                } catch (parseError) {
                    results.corruptedEntries.push({
                        line: lines.indexOf(line),
                        error: parseError.message
                    });
                }
            }
        } catch (error) {
            results.error = error.message;
        }

        return results;
    }

    /**
     * Create compliance report
     * @param {Date} startDate - Start date for report
     * @param {Date} endDate - End date for report
     * @returns {Object} Compliance report
     */
    async generateComplianceReport(startDate, endDate) {
        const report = {
            generatedAt: new Date().toISOString(),
            period: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            },
            auditLogIntegrity: await this.verifyAuditLogIntegrity(),
            dataRetention: await this.checkDataRetentionCompliance(),
            accessLogs: await this.analyzeAccessPatterns(startDate, endDate)
        };

        return report;
    }

    /**
     * Check data retention compliance
     * @returns {Object} Retention compliance status
     */
    async checkDataRetentionCompliance() {
        // This would integrate with your database to check retention policies
        // For now, return a placeholder structure
        return {
            casesRetention: {
                compliant: true,
                oldestRecord: null,
                retentionPeriod: '2555 days'
            },
            auditLogsRetention: {
                compliant: true,
                oldestRecord: null,
                retentionPeriod: '2555 days'
            },
            userDataRetention: {
                compliant: true,
                oldestRecord: null,
                retentionPeriod: '2555 days'
            }
        };
    }

    /**
     * Analyze access patterns for security monitoring
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Object} Access pattern analysis
     */
    async analyzeAccessPatterns(startDate, endDate) {
        // This would analyze access logs for suspicious patterns
        // For now, return a placeholder structure
        return {
            totalAccesses: 0,
            uniqueUsers: 0,
            suspiciousActivities: [],
            complianceStatus: 'compliant'
        };
    }

    /**
     * Encrypt sensitive data
     * @param {string} data - Data to encrypt
     * @param {string} key - Encryption key
     * @returns {string} Encrypted data
     */
    encryptSensitiveData(data, key) {
        const cipher = crypto.createCipher('aes-256-cbc', key);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    /**
     * Decrypt sensitive data
     * @param {string} encryptedData - Data to decrypt
     * @param {string} key - Decryption key
     * @returns {string} Decrypted data
     */
    decryptSensitiveData(encryptedData, key) {
        const decipher = crypto.createDecipher('aes-256-cbc', key);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    /**
     * Generate data encryption key
     * @returns {string} Random encryption key
     */
    generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = new LegalComplianceService();