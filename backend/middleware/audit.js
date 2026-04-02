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
        // Create immutable audit log entry
        await legalCompliance.createAuditLog({
          action: action,
          userId: req.user?.id || "anonymous",
          userRole: req.user?.role || "unknown",
          resource: "case",
          resourceId: req.params?.id || req.body?.id || "unknown",
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
        console.error('Legal compliance audit logging failed:', error);
        // Continue execution even if audit logging fails
      }
    });

    next();
  };
};