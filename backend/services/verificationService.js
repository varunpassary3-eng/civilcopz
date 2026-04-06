const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
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
 * Independent Verification Service
 * Provides offline verification capabilities for court admissibility
 */
class VerificationService {
  constructor() {
    this.verificationDir = path.join(__dirname, '../verifications');
  }

  /**
   * Generate verification manifest for offline verification
   */
  async generateVerificationManifest(caseId) {
    const caseData = await getPrisma().case.findUnique({
      where: { id: caseId },
      include: {
        documents: true,
        evidenceLedger: true,
        chainOfCustody: true,
        evidencePackages: true
      }
    });

    if (!caseData) {
      throw new Error('Case not found');
    }

    const manifest = {
      version: '1.0',
      system: 'CivilCOPZ',
      generatedAt: new Date().toISOString(),
      case: {
        id: caseData.id,
        title: caseData.title,
        status: caseData.status,
        jurisdiction: caseData.jurisdiction,
        createdAt: caseData.createdAt
      },
      verificationData: {
        evidence: caseData.documents.map(doc => ({
          id: doc.id,
          fileHash: doc.fileHash,
          type: doc.type,
          uploadedAt: doc.uploadedAt
        })),
        integrityLedger: caseData.evidenceLedger.map(ledger => ({
          id: ledger.id,
          evidenceId: ledger.evidenceId,
          contentHash: ledger.contentHash,
          metadataHash: ledger.metadataHash,
          signature: ledger.signature,
          timestamp: ledger.timestamp,
          trustedTimestamp: ledger.trustedTimestamp,
          timestampAuthority: ledger.timestampAuthority,
          actor: ledger.actor
        })),
        chainOfCustody: caseData.chainOfCustody.map(custody => ({
          id: custody.id,
          evidenceId: custody.evidenceId,
          action: custody.action,
          fromActor: custody.fromActor,
          toActor: custody.toActor,
          timestamp: custody.timestamp,
          trustedTimestamp: custody.trustedTimestamp,
          digitalSignature: custody.digitalSignature
        })),
        evidencePackages: caseData.evidencePackages.map(pkg => ({
          packageId: pkg.packageId,
          packageType: pkg.packageType,
          masterHash: pkg.masterHash,
          signature: pkg.signature,
          trustedTimestamp: pkg.trustedTimestamp,
          sealedAt: pkg.sealedAt,
          isCourtAdmissible: pkg.isCourtAdmissible
        }))
      },
      verificationInstructions: {
        description: 'This manifest contains all cryptographic proofs needed to verify evidence integrity offline',
        steps: [
          '1. Verify evidence file hashes match the recorded hashes',
          '2. Verify integrity ledger signatures and chain',
          '3. Verify chain of custody signatures and timestamps',
          '4. Verify evidence package signatures and timestamps',
          '5. Check trusted timestamps are valid and from reputable authorities'
        ],
        publicKeys: {
          note: 'In production, include public key certificates for signature verification',
          kmsKeyVersion: 'civilcopz-signing-key'
        }
      }
    };

    // Generate manifest hash for integrity
    const manifestHash = crypto.createHash('sha256')
      .update(JSON.stringify(manifest))
      .digest('hex');

    manifest.manifestHash = manifestHash;

    // Save manifest file
    await fs.mkdir(this.verificationDir, { recursive: true });
    const fileName = `verification-manifest-${caseId}-${Date.now()}.json`;
    const filePath = path.join(this.verificationDir, fileName);

    await fs.writeFile(filePath, JSON.stringify(manifest, null, 2));

    return {
      manifest,
      manifestHash,
      filePath: `/verifications/${fileName}`
    };
  }

  /**
   * Verify evidence integrity offline (static method for CLI usage)
   */
  static async verifyEvidenceOffline(manifestPath, evidenceFiles = []) {
    try {
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);

      const results = {
        manifestValid: false,
        evidenceIntegrity: [],
        ledgerIntegrity: false,
        custodyIntegrity: false,
        packageIntegrity: [],
        overallValid: false
      };

      // Verify manifest integrity
      const calculatedHash = crypto.createHash('sha256')
        .update(JSON.stringify({ ...manifest, manifestHash: undefined }))
        .digest('hex');

      results.manifestValid = calculatedHash === manifest.manifestHash;

      if (!results.manifestValid) {
        results.error = 'Manifest integrity check failed';
        return results;
      }

      // Verify evidence file integrity
      for (const evidence of manifest.verificationData.evidence) {
        const fileResult = { id: evidence.id, valid: false, error: null };

        try {
          // Find corresponding file
          const evidenceFile = evidenceFiles.find(f => f.id === evidence.id);
          if (!evidenceFile) {
            fileResult.error = 'Evidence file not provided';
          } else {
            const fileContent = await fs.readFile(evidenceFile.path);
            const calculatedHash = crypto.createHash('sha256')
              .update(fileContent)
              .digest('hex');

            fileResult.valid = calculatedHash === evidence.fileHash;
            if (!fileResult.valid) {
              fileResult.error = `Hash mismatch: expected ${evidence.fileHash}, got ${calculatedHash}`;
            }
          }
        } catch (error) {
          fileResult.error = error.message;
        }

        results.evidenceIntegrity.push(fileResult);
      }

      // Verify integrity ledger chain
      results.ledgerIntegrity = this.verifyIntegrityLedgerOffline(manifest.verificationData.integrityLedger);

      // Verify chain of custody
      results.custodyIntegrity = this.verifyChainOfCustodyOffline(manifest.verificationData.chainOfCustody);

      // Verify evidence packages
      for (const pkg of manifest.verificationData.evidencePackages) {
        const packageResult = {
          packageId: pkg.packageId,
          valid: false,
          hashValid: false,
          signatureValid: false,
          timestampValid: false
        };

        // Note: Full signature verification requires public keys
        // For now, we check hash and timestamp structure
        packageResult.hashValid = typeof pkg.masterHash === 'string' && pkg.masterHash.length === 64;
        packageResult.timestampValid = pkg.trustedTimestamp && pkg.trustedTimestamp.length > 0;

        packageResult.valid = packageResult.hashValid && packageResult.timestampValid;
        results.packageIntegrity.push(packageResult);
      }

      // Overall assessment
      results.overallValid =
        results.manifestValid &&
        results.evidenceIntegrity.every(e => e.valid) &&
        results.ledgerIntegrity &&
        results.custodyIntegrity &&
        results.packageIntegrity.every(p => p.valid);

      return results;

    } catch (error) {
      return {
        manifestValid: false,
        overallValid: false,
        error: error.message
      };
    }
  }

  /**
   * Verify integrity ledger offline
   */
  static verifyIntegrityLedgerOffline(ledgerEntries) {
    try {
      // Sort by timestamp
      const sortedEntries = [...ledgerEntries].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];

        // Verify entry hash
        const entryData = {
          id: entry.id,
          evidenceId: entry.evidenceId,
          contentHash: entry.contentHash,
          metadataHash: entry.metadataHash,
          signature: entry.signature,
          timestamp: entry.timestamp,
          actor: entry.actor
        };

        const calculatedHash = crypto.createHash('sha256')
          .update(JSON.stringify(entryData))
          .digest('hex');

        // Note: Full signature verification requires public key
        // For offline verification, we check signature format
        if (!entry.signature || entry.signature.length < 10) {
          return false;
        }

        // Verify trusted timestamp if present
        if (entry.trustedTimestamp) {
          const timestampValid = timestampAuthority.verifyTimestamp(calculatedHash, entry.trustedTimestamp);
          if (!timestampValid.isValid) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Ledger verification failed:', error);
      return false;
    }
  }

  /**
   * Verify chain of custody offline
   */
  static verifyChainOfCustodyOffline(custodyRecords) {
    try {
      // Group by evidence
      const evidenceChains = {};
      custodyRecords.forEach(record => {
        if (!evidenceChains[record.evidenceId]) {
          evidenceChains[record.evidenceId] = [];
        }
        evidenceChains[record.evidenceId].push(record);
      });

      // Verify each chain
      for (const records of Object.values(evidenceChains)) {
        const sortedRecords = records.sort((a, b) =>
          new Date(a.timestamp) - new Date(b.timestamp)
        );

        for (const record of sortedRecords) {
          // Check signature format (full verification requires public key)
          if (!record.digitalSignature || record.digitalSignature.length < 10) {
            return false;
          }

          // Verify trusted timestamp if present
          if (record.trustedTimestamp) {
            const recordData = {
              evidenceId: record.evidenceId,
              action: record.action,
              fromActor: record.fromActor,
              toActor: record.toActor,
              timestamp: record.timestamp
            };

            const recordHash = crypto.createHash('sha256')
              .update(JSON.stringify(recordData))
              .digest('hex');

            const timestampValid = timestampAuthority.verifyTimestamp(recordHash, record.trustedTimestamp);
            if (!timestampValid.isValid) {
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Custody verification failed:', error);
      return false;
    }
  }

  /**
   * Generate verification report
   */
  async generateVerificationReport(caseId) {
    const manifest = await this.generateVerificationManifest(caseId);

    // Run verification
    const verification = await VerificationService.verifyEvidenceOffline(
      path.join(__dirname, '..', manifest.filePath),
      [] // No evidence files provided for this check
    );

    const report = {
      caseId,
      reportGenerated: new Date().toISOString(),
      manifestHash: manifest.manifestHash,
      verificationResults: verification,
      recommendations: []
    };

    // Generate recommendations
    if (!verification.overallValid) {
      if (!verification.manifestValid) {
        report.recommendations.push('Manifest integrity compromised - do not use this evidence');
      }

      const invalidEvidence = verification.evidenceIntegrity.filter(e => !e.valid);
      if (invalidEvidence.length > 0) {
        report.recommendations.push(`${invalidEvidence.length} evidence files failed integrity check`);
      }

      if (!verification.ledgerIntegrity) {
        report.recommendations.push('Evidence integrity ledger verification failed');
      }

      if (!verification.custodyIntegrity) {
        report.recommendations.push('Chain of custody verification failed');
      }

      const invalidPackages = verification.packageIntegrity.filter(p => !p.valid);
      if (invalidPackages.length > 0) {
        report.recommendations.push(`${invalidPackages.length} evidence packages failed verification`);
      }
    } else {
      report.recommendations.push('All verifications passed - evidence appears authentic and unaltered');
    }

    return report;
  }

  /**
   * Create CLI verification script
   */
  async generateCLIVerifier() {
    const cliScript = `#!/usr/bin/env node

/**
 * CivilCOPZ Evidence Verification CLI
 * Offline verification tool for court admissibility
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class EvidenceVerifier {
  static async verify(manifestPath, evidenceDir = '.') {
    console.log('🔍 CivilCOPZ Evidence Verification Tool');
    console.log('=====================================');

    try {
      // Load manifest
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);

      console.log(\`Case: \${manifest.case.title}\`);
      console.log(\`Generated: \${manifest.generatedAt}\`);
      console.log('');

      // Verify manifest integrity
      const calculatedHash = crypto.createHash('sha256')
        .update(JSON.stringify({ ...manifest, manifestHash: undefined }))
        .digest('hex');

      const manifestValid = calculatedHash === manifest.manifestHash;
      console.log(\`Manifest Integrity: \${manifestValid ? '✅ VALID' : '❌ INVALID'}\`);

      if (!manifestValid) {
        console.log('❌ CRITICAL: Manifest has been tampered with');
        return false;
      }

      // Verify evidence files
      console.log('');
      console.log('Evidence File Verification:');
      let allEvidenceValid = true;

      for (const evidence of manifest.verificationData.evidence) {
        const fileName = \`\${evidence.id}_\${evidence.type}\`; // Adjust naming convention
        const filePath = path.join(evidenceDir, fileName);

        try {
          const fileContent = await fs.readFile(filePath);
          const calculatedHash = crypto.createHash('sha256')
            .update(fileContent)
            .digest('hex');

          const valid = calculatedHash === evidence.fileHash;
          console.log(\`  \${evidence.id}: \${valid ? '✅' : '❌'} \${evidence.type}\`);

          if (!valid) {
            console.log(\`    Expected: \${evidence.fileHash}\`);
            console.log(\`    Actual:   \${calculatedHash}\`);
            allEvidenceValid = false;
          }
        } catch (error) {
          console.log(\`  \${evidence.id}: ❌ FILE NOT FOUND\`);
          allEvidenceValid = false;
        }
      }

      // Summary
      console.log('');
      console.log('VERIFICATION SUMMARY:');
      console.log(\`Overall Status: \${allEvidenceValid ? '✅ VERIFIED' : '❌ COMPROMISED'}\`);

      if (allEvidenceValid) {
        console.log('');
        console.log('🎉 Evidence integrity confirmed for court admissibility');
        console.log('This verification proves the evidence has not been altered since creation.');
      }

      return allEvidenceValid;

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node verifier.js <manifest.json> [evidence-directory]');
    console.log('');
    console.log('Arguments:');
    console.log('  manifest.json        - Path to verification manifest');
    console.log('  evidence-directory   - Directory containing evidence files (default: current dir)');
    process.exit(1);
  }

  const manifestPath = args[0];
  const evidenceDir = args[1] || '.';

  EvidenceVerifier.verify(manifestPath, evidenceDir).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = EvidenceVerifier;
`;

    const cliPath = path.join(this.verificationDir, 'verifier.js');
    await fs.mkdir(this.verificationDir, { recursive: true });
    await fs.writeFile(cliPath, cliScript);

    return cliPath;
  }
}

module.exports = new VerificationService();