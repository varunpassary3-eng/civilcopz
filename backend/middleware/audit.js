const auditLedgerService = require('../services/auditLedgerService');
const legalCompliance = require('../services/legalComplianceService');

module.exports = function audit(action) {
  return async (req, res, next) => {
    // Store original response methods for interception
    const originalSend = res.send;
    const originalJson = res.json;

    // Capture response data for audit
    let responseData = null;
    let statusCode = null;

    // Intercept response to capture data
    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Capture final status code
    res.on('finish', async () => {
      statusCode = res.statusCode;

      try {
        const userId = req.user?.id || "anonymous";
        const userRole = req.user?.role || "unknown";
        const resourceId = req.params?.id || req.body?.id || "unknown";

        // Create comprehensive audit trail entry
        await auditLedgerService.createAuditEntry(
          'API_REQUEST',
          `${req.method} ${req.originalUrl}`,
          action,
          null, // oldValues - not applicable for requests
          {
            method: req.method,
            path: req.originalUrl,
            query: req.query,
            requestBody: req.method !== 'GET' ? legalCompliance.maskSensitiveData(JSON.stringify(req.body)) : null,
            responseStatus: statusCode,
            responseSize: responseData ? Buffer.byteLength(JSON.stringify(responseData)) : 0,
            duration: Date.now() - (req.startTime || Date.now())
          },
          userId,
          userRole,
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent'),
          req.sessionID || 'no-session'
        );

        // Create legacy legal compliance audit log for backward compatibility
        await legalCompliance.createAuditLog({
          action: action,
          userId: userId,
          userRole: userRole,
          resource: "case",
          resourceId: resourceId,
          changes: {
            method: req.method,
            path: req.originalUrl,
            requestBody: req.method !== 'GET' ? legalCompliance.maskSensitiveData(JSON.stringify(req.body)) : null,
            responseStatus: statusCode,
            responseSize: responseData ? Buffer.byteLength(JSON.stringify(responseData)) : 0
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID || 'no-session'
        });
      } catch (error) {
        console.error('Audit logging failed:', error);
        // Continue execution even if audit logging fails
      }
    });

    next();
  };
};