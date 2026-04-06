const crypto = require('crypto');
const dbManager = require('./databaseManager');
const jwt = require('jsonwebtoken');

const getPrisma = () => {
  const client = dbManager.getWriteClient();
  if (!client) {
    throw new Error('SUBSTRATE_FRAGMENTATION: Judicial Database client not yet initialized.');
  }
  return client;
};

/**
 * Identity Binding Service
 * Strengthens identity verification beyond JWT with KYC, device fingerprinting, and multi-factor authentication
 */
class IdentityBindingService {
  constructor() {
    this.sessionTokens = new Map(); // In production, use Redis
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(userAgent, ipAddress, additionalData = {}) {
    const fingerprintData = {
      userAgent: userAgent || '',
      ipAddress: ipAddress || '',
      screenResolution: additionalData.screenResolution,
      timezone: additionalData.timezone,
      language: additionalData.language,
      platform: additionalData.platform,
      timestamp: Date.now()
    };

    const fingerprint = crypto.createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');

    return {
      fingerprint,
      components: fingerprintData
    };
  }

  /**
   * Enhanced login with device binding
   */
  async enhancedLogin(email, password, deviceInfo = {}) {
    // Basic authentication
      const user = await getPrisma().user.findUnique({
        where: { email }
      });

    if (!user || !(await this.verifyPassword(password, user.password))) {
      throw new Error('Invalid credentials');
    }

    // Generate device fingerprint
    const { fingerprint, components } = this.generateDeviceFingerprint(
      deviceInfo.userAgent,
      deviceInfo.ipAddress,
      deviceInfo.additionalData
    );

    // Check if device is known
    const knownDevice = await getPrisma().userDevice.findFirst({
      where: {
        userId: user.id,
        fingerprint,
        isActive: true
      }
    });

    let deviceId;
    let requiresVerification = false;

    if (!knownDevice) {
      // New device - requires verification
      const newDevice = await getPrisma().userDevice.create({
        data: {
          userId: user.id,
          fingerprint,
          deviceInfo: components,
          isActive: false, // Requires verification
          firstSeen: new Date(),
          lastSeen: new Date()
        }
      });

      deviceId = newDevice.id;
      requiresVerification = true;
    } else {
      // Known device - update last seen
      await getPrisma().userDevice.update({
        where: { id: knownDevice.id },
        data: { lastSeen: new Date() }
      });
      deviceId = knownDevice.id;
    }

    // Generate enhanced JWT with device binding
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      deviceId,
      fingerprint,
      issuedAt: Date.now(),
      sessionId: crypto.randomBytes(16).toString('hex')
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    // Store session
    this.sessionTokens.set(token, {
      userId: user.id,
      deviceId,
      fingerprint,
      createdAt: new Date(),
      lastActivity: new Date()
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerifiedProfessional: user.isVerifiedProfessional
      },
      requiresDeviceVerification: requiresVerification,
      deviceId
    };
  }

  /**
   * Verify device (multi-factor step)
   */
  async verifyDevice(deviceId, verificationCode) {
    const device = await getPrisma().userDevice.findUnique({
      where: { id: deviceId }
    });

    if (!device) {
      throw new Error('Device not found');
    }

    // In production, send actual verification code via email/SMS
    // For demo, accept any 6-digit code
    const isValidCode = /^\d{6}$/.test(verificationCode);

    if (isValidCode) {
      await getPrisma().userDevice.update({
        where: { id: deviceId },
        data: {
          isActive: true,
          verifiedAt: new Date()
        }
      });

      return { verified: true };
    }

    return { verified: false, error: 'Invalid verification code' };
  }

  /**
   * Enhanced token verification with device binding
   */
  async verifyEnhancedToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check session
      const session = this.sessionTokens.get(token);
      if (!session) {
        return { valid: false, error: 'Session expired' };
      }

      // Verify device is still active
      const device = await getPrisma().userDevice.findUnique({
        where: { id: decoded.deviceId }
      });

      if (!device || !device.isActive) {
        return { valid: false, error: 'Device not verified' };
      }

      // Update session activity
      session.lastActivity = new Date();

      // Check for suspicious activity
      const riskAssessment = await this.assessSessionRisk(session, decoded);

      return {
        valid: true,
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        },
        device: {
          id: device.id,
          fingerprint: device.fingerprint
        },
        session: {
          id: decoded.sessionId,
          riskLevel: riskAssessment.level,
          warnings: riskAssessment.warnings
        }
      };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Assess session risk
   */
  async assessSessionRisk(session, tokenData) {
    const warnings = [];
    let riskLevel = 'LOW';

    // Check session age
    const sessionAge = Date.now() - session.createdAt.getTime();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxSessionAge) {
      warnings.push('Session is old');
      riskLevel = 'MEDIUM';
    }

    // Check last activity
    const timeSinceActivity = Date.now() - session.lastActivity.getTime();
    const inactivityTimeout = 2 * 60 * 60 * 1000; // 2 hours

    if (timeSinceActivity > inactivityTimeout) {
      warnings.push('Session inactive for extended period');
      riskLevel = 'HIGH';
    }

    // Check device consistency
    const device = await getPrisma().userDevice.findUnique({
      where: { id: tokenData.deviceId }
    });

    if (device) {
      const timeSinceLastSeen = Date.now() - device.lastSeen.getTime();
      if (timeSinceLastSeen > 7 * 24 * 60 * 60 * 1000) { // 7 days
        warnings.push('Device not seen recently');
        riskLevel = 'MEDIUM';
      }
    }

    return { level: riskLevel, warnings };
  }

  /**
   * KYC verification for professional users
   */
  async submitKYC(userId, kycData) {
    const user = await getPrisma().user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate KYC data
    const validation = this.validateKYCData(kycData);
    if (!validation.valid) {
      throw new Error(`KYC validation failed: ${validation.errors.join(', ')}`);
    }

    // Hash sensitive data for storage
    const hashedKYC = {
      idHash: crypto.createHash('sha256').update(kycData.idNumber).digest('hex'),
      nameHash: crypto.createHash('sha256').update(kycData.fullName).digest('hex'),
      addressHash: crypto.createHash('sha256').update(kycData.address).digest('hex'),
      documents: kycData.documents.map(doc => ({
        type: doc.type,
        hash: crypto.createHash('sha256').update(doc.content).digest('hex'),
        uploadedAt: new Date()
      }))
    };

    // Create KYC record
    const kycRecord = await getPrisma().userKYC.create({
      data: {
        userId,
        kycData: hashedKYC,
        status: 'PENDING',
        submittedAt: new Date()
      }
    });

    // Update user verification status
    await getPrisma().user.update({
      where: { id: userId },
      data: {
        isVerifiedProfessional: false // Reset until verified
      }
    });

    return {
      kycId: kycRecord.id,
      status: 'PENDING',
      message: 'KYC submitted for verification'
    };
  }

  /**
   * Validate KYC data
   */
  validateKYCData(kycData) {
    const errors = [];

    if (!kycData.fullName || kycData.fullName.length < 2) {
      errors.push('Full name is required');
    }

    if (!kycData.idNumber || !/^[A-Z0-9]{8,20}$/.test(kycData.idNumber)) {
      errors.push('Valid ID number is required');
    }

    if (!kycData.address || kycData.address.length < 10) {
      errors.push('Complete address is required');
    }

    if (!kycData.documents || kycData.documents.length === 0) {
      errors.push('At least one identity document is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Verify KYC (admin function)
   */
  async verifyKYC(kycId, approved, adminId, notes = '') {
    const kycRecord = await getPrisma().userKYC.findUnique({
      where: { id: kycId },
      include: { user: true }
    });

    if (!kycRecord) {
      throw new Error('KYC record not found');
    }

    const newStatus = approved ? 'APPROVED' : 'REJECTED';

    await getPrisma().userKYC.update({
      where: { id: kycId },
      data: {
        status: newStatus,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        notes
      }
    });

    // Update user verification status
    if (approved) {
      await getPrisma().user.update({
        where: { id: kycRecord.userId },
        data: {
          isVerifiedProfessional: true
        }
      });
    }

    return {
      kycId,
      status: newStatus,
      userId: kycRecord.userId
    };
  }

  /**
   * Get user identity profile
   */
  async getIdentityProfile(userId) {
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        barCouncilId: true,
        isVerifiedProfessional: true,
        specialization: true,
        createdAt: true
      }
    });

    if (!user) {
      return null;
    }

    const devices = await getPrisma().userDevice.findMany({
      where: { userId },
      select: {
        id: true,
        fingerprint: true,
        isActive: true,
        firstSeen: true,
        lastSeen: true,
        verifiedAt: true
      }
    });

    const kycStatus = await getPrisma().userKYC.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      select: {
        status: true,
        submittedAt: true,
        verifiedAt: true
      }
    });

    return {
      user,
      devices: devices.map(d => ({
        id: d.id,
        isActive: d.isActive,
        firstSeen: d.firstSeen,
        lastSeen: d.lastSeen,
        verifiedAt: d.verifiedAt
      })),
      kyc: kycStatus ? {
        status: kycStatus.status,
        submittedAt: kycStatus.submittedAt,
        verifiedAt: kycStatus.verifiedAt
      } : null,
      identityStrength: this.calculateIdentityStrength(user, devices, kycStatus)
    };
  }

  /**
   * Calculate identity strength score
   */
  calculateIdentityStrength(user, devices, kyc) {
    let score = 0;
    const factors = [];

    // Base user account
    score += 20;
    factors.push('User account verified');

    // Professional verification
    if (user.isVerifiedProfessional) {
      score += 30;
      factors.push('Professional credentials verified');
    }

    // KYC completion
    if (kyc && kyc.status === 'APPROVED') {
      score += 25;
      factors.push('KYC approved');
    }

    // Device verification
    const activeDevices = devices.filter(d => d.isActive).length;
    if (activeDevices > 0) {
      score += Math.min(activeDevices * 10, 25);
      factors.push(`${activeDevices} device(s) verified`);
    }

    return {
      score: Math.min(score, 100),
      level: score >= 80 ? 'STRONG' : score >= 60 ? 'GOOD' : 'WEAK',
      factors
    };
  }

  /**
   * Revoke device access
   */
  async revokeDevice(deviceId, userId) {
    const device = await getPrisma().userDevice.findFirst({
      where: {
        id: deviceId,
        userId
      }
    });

    if (!device) {
      throw new Error('Device not found or not owned by user');
    }

    await getPrisma().userDevice.update({
      where: { id: deviceId },
      data: {
        isActive: false,
        revokedAt: new Date()
      }
    });

    // Invalidate related sessions
    // In production, broadcast session invalidation

    return { revoked: true, deviceId };
  }

  /**
   * Verify password (placeholder - implement proper bcrypt verification)
   */
  async verifyPassword(plainPassword, hashedPassword) {
    // In production, use bcrypt.compare
    return plainPassword === hashedPassword; // Placeholder
  }
}

module.exports = new IdentityBindingService();