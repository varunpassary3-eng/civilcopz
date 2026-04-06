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
 * CivilCOPZ Audit & Evidence Integrity Ledger Service
 * Provides tamper-proof audit trails and evidence integrity for legal compliance
 */
class AuditLedgerService {
  constructor() {
    this.auth = new GoogleAuth();
  }

  /**
   * Generate SHA-256 hash of data
   */
  generateHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Sign hash using Cloud KMS
   */
  async signHash(hash) {
    try {
      const client = await this.auth.getClient();
      const projectId = await this.auth.getProjectId();
      const url = `https://cloudkms.googleapis.com/v1/projects/${projectId}/locations/global/keyRings/civilcopz-keyring/cryptoKeys/civilcopz-signing-key/cryptoKeyVersions/1:asymmetricSign`;

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
      // Fallback to hash-only if KMS unavailable
      return hash;
    }
  }

  /**
   * Create evidence integrity entry
   */
  async createEvidenceEntry(caseId, evidenceId, evidenceType, content, metadata, actor, ipAddress, userAgent, tx = null) {
    const contentHash = this.generateHash(content);
    const metadataHash = this.generateHash(metadata);

    const client = tx || getPrisma();

    // Get previous hash for chain
    const lastEntry = await client.evidenceIntegrityLedger.findFirst({
      where: { caseId },
      orderBy: { timestamp: 'desc' }
    });

    const previousHash = lastEntry ? this.generateHash({
      id: lastEntry.id,
      contentHash: lastEntry.contentHash,
      metadataHash: lastEntry.metadataHash,
      timestamp: lastEntry.timestamp
    }) : null;

    const entryData = {
      caseId,
      evidenceId,
      evidenceType,
      contentHash,
      metadataHash,
      previousHash,
      actor,
      ipAddress,
      userAgent
    };

    const integrityHash = this.generateHash(entryData);
    const signature = await this.signHash(integrityHash);

    const entry = await client.evidenceIntegrityLedger.create({
      data: {
        ...entryData,
        signature
      }
    });

    return entry;
  }

  /**
   * Forensic Integrity Check: Validates a file against its last known audit entry.
   * Detects if a file was replaced with the same name but different content.
   */
  async validateFileIntegrity(caseId, evidenceId, currentContent) {
    const lastEntry = await getPrisma().evidenceIntegrityLedger.findFirst({
      where: { caseId, evidenceId },
      orderBy: { timestamp: 'desc' }
    });

    if (!lastEntry) return { isValid: false, error: 'No audit trail for this evidence' };

    const currentHash = this.generateHash(currentContent);
    return {
      isValid: currentHash === lastEntry.contentHash,
      lastHash: lastEntry.contentHash,
      actualHash: currentHash
    };
  }

  /**
   * Create comprehensive audit trail entry
   */
  async createAuditEntry(entityType, entityId, action, oldValues, newValues, actorId, actorRole, ipAddress, userAgent, sessionId, tx = null) {
    const changes = this.calculateChanges(oldValues, newValues);

    const client = tx || getPrisma();

    const auditData = {
      entityType,
      entityId,
      action,
      oldValues,
      newValues,
      changes,
      actorId,
      actorRole,
      ipAddress,
      userAgent,
      sessionId
    };

    const integrityHash = this.generateHash(auditData);

    const auditEntry = await client.auditTrail.create({
      data: {
        ...auditData,
        integrityHash
      }
    });

    return auditEntry;
  }

  /**
   * Calculate diff between old and new values
   */
  calculateChanges(oldValues, newValues) {
    if (!oldValues || !newValues) return null;

    const changes = {};
    const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);

    for (const key of allKeys) {
      const oldVal = oldValues[key];
      const newVal = newValues[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = {
          from: oldVal,
          to: newVal
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Generate daily ledger hash
   */
  async generateDailyLedger(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all audit entries for the day
    const auditEntries = await getPrisma().auditTrail.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (auditEntries.length === 0) return null;

    // Create Merkle tree root hash
    const hashes = auditEntries.map(entry => entry.integrityHash);
    const rootHash = this.buildMerkleRoot(hashes);

    // 1. Authoritative: External TSA Anchoring (v4.2)
    console.info(`[DAILY_LEDGER] Anchoring Merkle Root to TSA: ${rootHash}`);
    const { timestampToken } = await timestampAuthority.requestTimestamp(rootHash);

    const ledgerEntry = await getPrisma().dailyLedgerHash.upsert({
      where: { date: startOfDay },
      update: {
        rootHash,
        eventCount: auditEntries.length,
        trustedTimestamp: timestampToken // External proof layer
      },
      create: {
        date: startOfDay,
        rootHash,
        eventCount: auditEntries.length,
        trustedTimestamp: timestampToken // External proof layer
      }
    });

    // Update audit entries with block hash
    await getPrisma().auditTrail.updateMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      data: {
        blockHash: rootHash
      }
    });

    return ledgerEntry;
  }

  /**
   * Build Merkle tree root hash
   */
  buildMerkleRoot(hashes) {
    if (hashes.length === 0) return this.generateHash('empty');
    if (hashes.length === 1) return hashes[0];

    const nextLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      nextLevel.push(this.generateHash(left + right));
    }

    return this.buildMerkleRoot(nextLevel);
  }

  /**
   * Verify evidence integrity chain
   */
  async verifyEvidenceChain(caseId) {
    const entries = await getPrisma().evidenceIntegrityLedger.findMany({
      where: { caseId },
      orderBy: { timestamp: 'asc' }
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedHash = this.generateHash({
        caseId: entry.caseId,
        evidenceId: entry.evidenceId,
        evidenceType: entry.evidenceType,
        contentHash: entry.contentHash,
        metadataHash: entry.metadataHash,
        previousHash: entry.previousHash,
        actor: entry.actor,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent
      });

      // Verify signature
      const isSignatureValid = await this.verifySignature(expectedHash, entry.signature);

      if (!isSignatureValid) {
        return {
          isValid: false,
          error: `Invalid signature for entry ${entry.id}`,
          entry: entry
        };
      }

      // Verify chain
      if (i > 0) {
        const prevEntry = entries[i - 1];
        const prevHash = this.generateHash({
          id: prevEntry.id,
          contentHash: prevEntry.contentHash,
          metadataHash: prevEntry.metadataHash,
          timestamp: prevEntry.timestamp
        });

        if (entry.previousHash !== prevHash) {
          return {
            isValid: false,
            error: `Broken chain at entry ${entry.id}`,
            entry: entry
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Verify signature using Cloud KMS
   */
  async verifySignature(hash, signature) {
    try {
      const client = await this.auth.getClient();
      const projectId = await this.auth.getProjectId();
      const url = `https://cloudkms.googleapis.com/v1/projects/${projectId}/locations/global/keyRings/civilcopz-keyring/cryptoKeys/civilcopz-signing-key/cryptoKeyVersions/1:asymmetricDecrypt`;

      const response = await client.request({
        url,
        method: 'POST',
        data: {
          ciphertext: signature
        }
      });

      const decrypted = Buffer.from(response.data.plaintext, 'base64').toString('hex');
      return decrypted === hash;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get audit trail for entity
   */
  async getAuditTrail(entityType, entityId, limit = 50) {
    return await getPrisma().auditTrail.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  /**
   * Get integrity verification report
   */
  async getIntegrityReport() {
    const verifications = await getPrisma().integrityVerification.findMany({
      orderBy: { verifiedAt: 'desc' },
      take: 100
    });

    return verifications;
  }
}

module.exports = new AuditLedgerService();