const crypto = require('crypto');
const { GoogleAuth } = require('google-auth-library');
const timestampAuthority = require('./timestampAuthorityService');
const dbManager = require('./databaseManager');

const getPrisma = () => {
  const client = dbManager.getWriteClient();
  if (!client) {
    throw new Error('SUBSTRATE_FRAGMENTATION: Judicial Database client not yet initialized.');
  }
  return client;
};

/**
 * Chain of Custody Service
 * Tracks complete lifecycle of evidence: upload → access → modification → transfer
 */
class ChainOfCustodyService {
  constructor() {
    this.auth = new GoogleAuth();
  }

  /**
   * Generate digital signature for custody record
   */
  async signCustodyRecord(recordData) {
    try {
      const client = await this.auth.getClient();
      const projectId = await this.auth.getProjectId();
      const url = `https://cloudkms.googleapis.com/v1/projects/${projectId}/locations/global/keyRings/civilcopz-keyring/cryptoKeys/civilcopz-signing-key/cryptoKeyVersions/1:asymmetricSign`;

      const hash = crypto.createHash('sha256').update(JSON.stringify(recordData)).digest('hex');

      const response = await client.request({
        url,
        method: 'POST',
        data: {
          digest: {
            sha256: Buffer.from(hash, 'hex').toString('base64')
          }
        }
      });

      return response.data.signature;
    } catch (error) {
      console.error('KMS signing failed:', error);
      // Fallback to hash-only
      return crypto.createHash('sha256').update(JSON.stringify(recordData)).digest('hex');
    }
  }

  /**
   * Record evidence upload (initial custody)
   */
  async recordUpload(caseId, evidenceId, actor, reason = 'Initial upload', transferMethod = 'ELECTRONIC', ipAddress, userAgent, deviceFingerprint) {
    const recordData = {
      caseId,
      evidenceId,
      action: 'UPLOAD',
      fromActor: null,
      toActor: actor,
      reason,
      transferMethod,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      deviceFingerprint
    };

    const digitalSignature = await this.signCustodyRecord(recordData);

    const custodyRecord = await getPrisma().chainOfCustody.create({
      data: {
        ...recordData,
        digitalSignature
      }
    });

    // Timestamp the record for court admissibility
    try {
      await timestampAuthority.timestampCustodyRecord(custodyRecord.id);
    } catch (error) {
      console.warn('Failed to timestamp custody record:', error);
    }

    return custodyRecord;
  }

  /**
   * Record evidence access/view
   */
  async recordAccess(caseId, evidenceId, actor, reason = 'Evidence review', ipAddress, userAgent, deviceFingerprint) {
    // Get current custodian
    const lastRecord = await getPrisma().chainOfCustody.findFirst({
      where: { caseId, evidenceId },
      orderBy: { timestamp: 'desc' }
    });

    const fromActor = lastRecord ? lastRecord.toActor : 'SYSTEM';

    const recordData = {
      caseId,
      evidenceId,
      action: 'ACCESS',
      fromActor,
      toActor: actor,
      reason,
      transferMethod: 'ELECTRONIC',
      timestamp: new Date(),
      ipAddress,
      userAgent,
      deviceFingerprint
    };

    const digitalSignature = await this.signCustodyRecord(recordData);

    const custodyRecord = await getPrisma().chainOfCustody.create({
      data: {
        ...recordData,
        digitalSignature
      }
    });

    return custodyRecord;
  }

  /**
   * Record evidence modification
   */
  async recordModification(caseId, evidenceId, actor, reason = 'Evidence update', ipAddress, userAgent, deviceFingerprint) {
    const lastRecord = await getPrisma().chainOfCustody.findFirst({
      where: { caseId, evidenceId },
      orderBy: { timestamp: 'desc' }
    });

    const fromActor = lastRecord ? lastRecord.toActor : 'SYSTEM';

    const recordData = {
      caseId,
      evidenceId,
      action: 'MODIFY',
      fromActor,
      toActor: actor,
      reason,
      transferMethod: 'ELECTRONIC',
      timestamp: new Date(),
      ipAddress,
      userAgent,
      deviceFingerprint
    };

    const digitalSignature = await this.signCustodyRecord(recordData);

    const custodyRecord = await getPrisma().chainOfCustody.create({
      data: {
        ...recordData,
        digitalSignature
      }
    });

    // Timestamp for court admissibility
    try {
      await timestampAuthority.timestampCustodyRecord(custodyRecord.id);
    } catch (error) {
      console.warn('Failed to timestamp custody record:', error);
    }

    return custodyRecord;
  }

  /**
   * Record custody transfer between parties
   */
  async recordTransfer(caseId, evidenceId, fromActor, toActor, reason, transferMethod = 'ELECTRONIC', ipAddress, userAgent, deviceFingerprint) {
    const recordData = {
      caseId,
      evidenceId,
      action: 'TRANSFER',
      fromActor,
      toActor,
      reason,
      transferMethod,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      deviceFingerprint
    };

    const digitalSignature = await this.signCustodyRecord(recordData);

    const custodyRecord = await getPrisma().chainOfCustody.create({
      data: {
        ...recordData,
        digitalSignature
      }
    });

    // Timestamp for court admissibility
    try {
      await timestampAuthority.timestampCustodyRecord(custodyRecord.id);
    } catch (error) {
      console.warn('Failed to timestamp custody record:', error);
    }

    return custodyRecord;
  }

  /**
   * Record evidence sealing (final custody state)
   */
  async recordSealing(caseId, evidenceId, actor, reason = 'Evidence sealed for court submission', ipAddress, userAgent, deviceFingerprint) {
    const lastRecord = await getPrisma().chainOfCustody.findFirst({
      where: { caseId, evidenceId },
      orderBy: { timestamp: 'desc' }
    });

    const fromActor = lastRecord ? lastRecord.toActor : 'SYSTEM';

    const recordData = {
      caseId,
      evidenceId,
      action: 'SEAL',
      fromActor,
      toActor: actor,
      reason,
      transferMethod: 'ELECTRONIC',
      timestamp: new Date(),
      ipAddress,
      userAgent,
      deviceFingerprint
    };

    const digitalSignature = await this.signCustodyRecord(recordData);

    const custodyRecord = await getPrisma().chainOfCustody.create({
      data: {
        ...recordData,
        digitalSignature
      }
    });

    // Timestamp for court admissibility
    try {
      await timestampAuthority.timestampCustodyRecord(custodyRecord.id);
    } catch (error) {
      console.warn('Failed to timestamp custody record:', error);
    }

    return custodyRecord;
  }

  /**
   * Get complete chain of custody for evidence
   */
  async getChainOfCustody(caseId, evidenceId) {
    const records = await getPrisma().chainOfCustody.findMany({
      where: { caseId, evidenceId },
      orderBy: { timestamp: 'asc' },
      include: {
        case: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    // Verify chain integrity
    const chainValid = await this.verifyChainIntegrity(records);

    return {
      caseId,
      evidenceId,
      chainValid,
      totalRecords: records.length,
      records: records.map(record => ({
        id: record.id,
        action: record.action,
        fromActor: record.fromActor,
        toActor: record.toActor,
        reason: record.reason,
        transferMethod: record.transferMethod,
        timestamp: record.timestamp,
        trustedTimestamp: record.trustedTimestamp,
        ipAddress: record.ipAddress,
        userAgent: record.userAgent,
        deviceFingerprint: record.deviceFingerprint,
        digitalSignature: record.digitalSignature
      }))
    };
  }

  /**
   * Verify integrity of custody chain
   */
  async verifyChainIntegrity(records) {
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const recordData = {
        caseId: record.caseId,
        evidenceId: record.evidenceId,
        action: record.action,
        fromActor: record.fromActor,
        toActor: record.toActor,
        reason: record.reason,
        transferMethod: record.transferMethod,
        timestamp: record.timestamp,
        ipAddress: record.ipAddress,
        userAgent: record.userAgent,
        deviceFingerprint: record.deviceFingerprint
      };

      const expectedSignature = await this.signCustodyRecord(recordData);

      if (record.digitalSignature !== expectedSignature) {
        return false;
      }

      // Verify trusted timestamp if present
      if (record.trustedTimestamp) {
        const recordHash = crypto.createHash('sha256').update(JSON.stringify(recordData)).digest('hex');
        const timestampValid = await timestampAuthority.verifyTimestamp(recordHash, record.trustedTimestamp);
        if (!timestampValid.isValid) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get current custodian of evidence
   */
  async getCurrentCustodian(caseId, evidenceId) {
    const lastRecord = await getPrisma().chainOfCustody.findFirst({
      where: { caseId, evidenceId },
      orderBy: { timestamp: 'desc' }
    });

    if (!lastRecord) {
      return null;
    }

    return {
      custodian: lastRecord.toActor,
      since: lastRecord.timestamp,
      lastAction: lastRecord.action,
      recordId: lastRecord.id
    };
  }

  /**
   * Get custody summary for case
   */
  async getCaseCustodySummary(caseId) {
    const records = await getPrisma().chainOfCustody.findMany({
      where: { caseId },
      orderBy: { timestamp: 'asc' },
      select: {
        evidenceId: true,
        action: true,
        toActor: true,
        timestamp: true,
        trustedTimestamp: true
      }
    });

    // Group by evidence
    const evidenceMap = new Map();

    records.forEach(record => {
      if (!evidenceMap.has(record.evidenceId)) {
        evidenceMap.set(record.evidenceId, {
          evidenceId: record.evidenceId,
          totalActions: 0,
          custodians: new Set(),
          lastAction: null,
          firstTimestamp: null,
          lastTimestamp: null,
          hasTrustedTimestamps: false
        });
      }

      const evidence = evidenceMap.get(record.evidenceId);
      evidence.totalActions++;
      evidence.custodians.add(record.toActor);
      evidence.lastAction = record.action;
      evidence.lastTimestamp = record.timestamp;

      if (!evidence.firstTimestamp) {
        evidence.firstTimestamp = record.timestamp;
      }

      if (record.trustedTimestamp) {
        evidence.hasTrustedTimestamps = true;
      }
    });

    return {
      caseId,
      totalEvidence: evidenceMap.size,
      evidence: Array.from(evidenceMap.values()).map(ev => ({
        ...ev,
        custodians: Array.from(ev.custodians),
        custodyDuration: ev.lastTimestamp && ev.firstTimestamp ?
          ev.lastTimestamp.getTime() - ev.firstTimestamp.getTime() : 0
      }))
    };
  }
}

module.exports = new ChainOfCustodyService();