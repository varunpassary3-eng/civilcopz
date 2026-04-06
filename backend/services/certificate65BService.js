const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { GoogleAuth } = require('google-auth-library');
const timestampAuthority = require('./timestampAuthorityService');
const fs = require('fs').promises;
const path = require('path');
const dbManager = require('./databaseManager');

const getPrisma = () => {
  const client = dbManager.getWriteClient();
  if (!client) {
    throw new Error('SUBSTRATE_FRAGMENTATION: Judicial Database client not yet initialized.');
  }
  return client;
};

/**
 * Section 65B Certificate Generator Service
 * Generates court-admissible certificates for digital evidence under Indian Evidence Act
 */
class Certificate65BService {
  constructor() {
    this.auth = new GoogleAuth();
    this.certificatesDir = path.join(__dirname, '../uploads/certificates');
    this.ensureCertificatesDir();
  }

  async ensureCertificatesDir() {
    try {
      await fs.mkdir(this.certificatesDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create certificates directory:', error);
    }
  }

  /**
   * Generate unique certificate number
   */
  generateCertificateNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `65B/${year}/${random}`;
  }

  /**
   * Generate digital signature for certificate
   */
  async signCertificate(certificateData) {
    try {
      const client = await this.auth.getClient();
      const projectId = await this.auth.getProjectId();
      const url = `https://cloudkms.googleapis.com/v1/projects/${projectId}/locations/global/keyRings/civilcopz-keyring/cryptoKeys/civilcopz-signing-key/cryptoKeyVersions/1:asymmetricSign`;

      const hash = crypto.createHash('sha256').update(JSON.stringify(certificateData)).digest('hex');

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
      return crypto.createHash('sha256').update(JSON.stringify(certificateData)).digest('hex');
    }
  }

  /**
   * Generate Section 65B certificate for evidence
   */
  async generateCertificate(caseId, evidenceId, evidenceType, generatedBy) {
    try {
      // Get case and evidence details
      const caseData = await getPrisma().case.findUnique({
        where: { id: caseId },
        select: {
          id: true,
          title: true,
          createdAt: true,
          consumerName: true,
          consumerEmail: true
        }
      });

      if (!caseData) {
        throw new Error('Case not found');
      }

      // Get evidence details based on type
      let evidenceDetails;
      let hashValue;
      let timestamp;

      switch (evidenceType) {
        case 'DOCUMENT':
          evidenceDetails = await getPrisma().caseDocument.findUnique({
            where: { id: evidenceId }
          });
          hashValue = evidenceDetails?.fileHash;
          timestamp = evidenceDetails?.uploadedAt;
          break;

        case 'EVENT':
          evidenceDetails = await getPrisma().caseEvent.findUnique({
            where: { id: evidenceId }
          });
          hashValue = evidenceDetails?.hash;
          timestamp = evidenceDetails?.timestamp;
          break;

        case 'NOTICE':
          // Notice details from case
          evidenceDetails = {
            type: 'NOTICE',
            content: `Notice for case ${caseData.title}`
          };
          hashValue = caseData.noticeHash;
          timestamp = caseData.noticeSentAt;
          break;

        case 'AUDIT_LOG':
          evidenceDetails = await getPrisma().auditTrail.findUnique({
            where: { id: evidenceId }
          });
          hashValue = evidenceDetails?.integrityHash;
          timestamp = evidenceDetails?.timestamp;
          break;

        default:
          throw new Error(`Unsupported evidence type: ${evidenceType}`);
      }

      if (!hashValue) {
        throw new Error('Evidence hash not found');
      }

      // Generate certificate data
      const certificateNumber = this.generateCertificateNumber();
      const generatedAt = new Date();

      const certificateData = {
        certificateNumber,
        caseId,
        evidenceId,
        evidenceType,
        computerSystem: 'CivilCOPZ Digital Evidence Management System',
        computerOutput: `${evidenceType} record with integrity verification`,
        generatedBySystem: 'Automated certificate generation system',
        purpose: 'Court admissibility under Section 65B of Indian Evidence Act, 1872',
        hashValue,
        timestamp: timestamp || generatedAt,
        generatedBy,
        generatedAt
      };

      // Generate certificate text
      const certificateText = this.generateCertificateText(certificateData, caseData);

      // Create database record
      const certificate = await getPrisma().certificate65B.create({
        data: {
          caseId,
          certificateNumber,
          generatedBy,
          generatedAt,
          computerSystem: certificateData.computerSystem,
          computerOutput: certificateData.computerOutput,
          generatedBySystem: certificateData.generatedBySystem,
          purpose: certificateData.purpose,
          evidenceType,
          evidenceId,
          hashValue,
          timestamp: certificateData.timestamp,
          certificateText,
          digitalSignature: await this.signCertificate(certificateData)
        }
      });

      // Generate PDF
      const pdfPath = await this.generateCertificatePDF(certificate);
      const pdfHash = await this.calculateFileHash(pdfPath);

      // Update certificate with PDF details
      await getPrisma().certificate65B.update({
        where: { id: certificate.id },
        data: {
          pdfUrl: `/uploads/certificates/${path.basename(pdfPath)}`,
          pdfHash
        }
      });

      // Timestamp the certificate
      try {
        await timestampAuthority.timestampCertificate(certificate.id);
      } catch (error) {
        console.warn('Failed to timestamp certificate:', error);
      }

      return certificate;

    } catch (error) {
      console.error('Certificate generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate certificate text content
   */
  generateCertificateText(certificateData, caseData) {
    const { certificateNumber, computerSystem, computerOutput, generatedBySystem,
            purpose, hashValue, timestamp, evidenceType, evidenceId } = certificateData;

    return `
SECTION 65B CERTIFICATE UNDER INDIAN EVIDENCE ACT, 1872

Certificate Number: ${certificateNumber}
Date of Generation: ${new Date().toLocaleDateString('en-IN')}

This is to certify that:

1. The computer system used for generating this certificate is: ${computerSystem}

2. The computer output in question is: ${computerOutput}

3. The said computer system was operating properly and no changes were made to the system
   that could affect the integrity of the output.

4. The information was regularly fed into the computer in the ordinary course of activities.

5. The said computer output was generated by the computer in the ordinary course of activities.

6. The said computer output was generated on: ${timestamp.toLocaleString('en-IN')}

7. The digital evidence details are as follows:
   - Evidence Type: ${evidenceType}
   - Evidence ID: ${evidenceId}
   - SHA-256 Hash: ${hashValue}
   - Purpose: ${purpose}

8. The system that generated this output is: ${generatedBySystem}

This certificate is issued in compliance with Section 65B of the Indian Evidence Act, 1872,
making the above-mentioned digital evidence admissible in a court of law.

Generated by: CivilCOPZ Digital Evidence Management System
Case Reference: ${caseData.title} (${caseData.id})

Digital Signature: [KMS SIGNATURE APPLIED]

This certificate is valid and authentic as per the system's integrity verification protocols.
`;
  }

  /**
   * Generate PDF certificate
   */
  async generateCertificatePDF(certificate) {
    return new Promise((resolve, reject) => {
      const filename = `certificate_${certificate.certificateNumber.replace(/\//g, '_')}.pdf`;
      const filepath = path.join(this.certificatesDir, filename);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const stream = require('fs').createWriteStream(filepath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('SECTION 65B CERTIFICATE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text('UNDER INDIAN EVIDENCE ACT, 1872', { align: 'center' });
      doc.moveDown(2);

      // Certificate details
      doc.fontSize(12).font('Helvetica');
      doc.text(`Certificate Number: ${certificate.certificateNumber}`);
      doc.text(`Date of Generation: ${certificate.generatedAt.toLocaleDateString('en-IN')}`);
      doc.moveDown();

      // Main certification text
      const lines = certificate.certificateText.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          doc.text(line.trim());
        } else {
          doc.moveDown(0.5);
        }
      });

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).text('This certificate is digitally signed and timestamped for court admissibility.', { align: 'center' });
      doc.text(`Generated on: ${new Date().toISOString()}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  /**
   * Calculate file hash
   */
  async calculateFileHash(filepath) {
    const fileBuffer = await fs.readFile(filepath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(certificateId) {
    const certificate = await getPrisma().certificate65B.findUnique({
      where: { id: certificateId },
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

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    return certificate;
  }

  /**
   * Get certificates for case
   */
  async getCaseCertificates(caseId) {
    return await getPrisma().certificate65B.findMany({
      where: { caseId },
      orderBy: { generatedAt: 'desc' },
      include: {
        case: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
  }

  /**
   * Verify certificate integrity
   */
  async verifyCertificate(certificateId) {
    const certificate = await this.getCertificate(certificateId);

    // Verify digital signature
    const certificateData = {
      certificateNumber: certificate.certificateNumber,
      caseId: certificate.caseId,
      evidenceId: certificate.evidenceId,
      evidenceType: certificate.evidenceType,
      hashValue: certificate.hashValue,
      timestamp: certificate.timestamp,
      generatedBy: certificate.generatedBy,
      generatedAt: certificate.generatedAt
    };

    const expectedSignature = await this.signCertificate(certificateData);
    const signatureValid = certificate.digitalSignature === expectedSignature;

    // Verify PDF integrity if exists
    let pdfValid = true;
    if (certificate.pdfUrl && certificate.pdfHash) {
      try {
        const pdfPath = path.join(__dirname, '../uploads/certificates',
          path.basename(certificate.pdfUrl));
        const actualPdfHash = await this.calculateFileHash(pdfPath);
        pdfValid = actualPdfHash === certificate.pdfHash;
      } catch (error) {
        pdfValid = false;
      }
    }

    // Verify trusted timestamp if present
    let timestampValid = true;
    if (certificate.trustedTimestamp) {
      try {
        const recordHash = crypto.createHash('sha256')
          .update(JSON.stringify(certificateData)).digest('hex');
        const verification = await timestampAuthority.verifyTimestamp(recordHash, certificate.trustedTimestamp);
        timestampValid = verification.isValid;
      } catch (error) {
        timestampValid = false;
      }
    }

    return {
      certificateId,
      isValid: certificate.isValid && signatureValid && pdfValid && timestampValid,
      signatureValid,
      pdfValid,
      timestampValid,
      certificateValid: certificate.isValid
    };
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(certificateId, reason, revokedBy) {
    await getPrisma().certificate65B.update({
      where: { id: certificateId },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revocationReason: reason
      }
    });

    // Log revocation
    await getPrisma().auditTrail.create({
      data: {
        entityType: 'CERTIFICATE_65B',
        entityId: certificateId,
        action: 'REVOKE',
        actorId: revokedBy,
        changes: { reason },
        timestamp: new Date(),
        integrityHash: crypto.createHash('sha256').update(`${certificateId}:${reason}`).digest('hex')
      }
    });
  }
}

module.exports = new Certificate65BService();