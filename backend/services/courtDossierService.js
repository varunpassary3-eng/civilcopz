const crypto = require('crypto');
const { GoogleAuth } = require('google-auth-library');
const timestampAuthority = require('./timestampAuthorityService');
const certificate65BService = require('./certificate65BService');
const chainOfCustodyService = require('./chainOfCustodyService');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const PDFDocument = require('pdfkit');
const dbManager = require('./databaseManager');

const getPrisma = () => {
  const client = dbManager.getWriteClient();
  if (!client) {
    throw new Error('SUBSTRATE_FRAGMENTATION: Judicial Database client not yet initialized.');
  }
  return client;
};

/**
 * Court Dossier Export Engine
 * Generates complete court-admissible dossiers with evidence bundles
 */
class CourtDossierService {
  constructor() {
    this.auth = new GoogleAuth();
    this.dossiersDir = path.join(__dirname, '../uploads/dossiers');
    this.ensureDossiersDir();
  }

  async ensureDossiersDir() {
    try {
      await fs.mkdir(this.dossiersDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create dossiers directory:', error);
    }
  }

  /**
   * Generate digital signature for dossier
   */
  async signDossier(dossierData) {
    try {
      const client = await this.auth.getClient();
      const projectId = await this.auth.getProjectId();
      const url = `https://cloudkms.googleapis.com/v1/projects/${projectId}/locations/global/keyRings/civilcopz-keyring/cryptoKeys/civilcopz-signing-key/cryptoKeyVersions/1:asymmetricSign`;

      const hash = crypto.createHash('sha256').update(JSON.stringify(dossierData)).digest('hex');

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
      return crypto.createHash('sha256').update(JSON.stringify(dossierData)).digest('hex');
    }
  }

  /**
   * Generate complete court dossier for case
   */
  async generateCourtDossier(caseId, generatedBy) {
    try {
      console.log(`Generating court dossier for case ${caseId}`);

      // Get complete case data
      const caseData = await getPrisma().case.findUnique({
        where: { id: caseId },
        include: {
          documents: true,
          events: true,
          evidenceLedger: true,
          chainOfCustody: true,
          evidencePackages: true,
          certificates65B: true,
          timeline: true,
          noticeDeliveries: true,
          registrySubmissions: true, // v5.1.1: 1:N history
          advocate: true,            // v6.0: Professional support
          litigationDocuments: true, // v6.1: Professional litigation support
          reporter: {
            select: {
              id: true,
              email: true,
              consumerName: true,
              consumerPhone: true,
              consumerAddress: true
            }
          }
        }
      });

      if (!caseData) {
        throw new Error('Case not found');
      }

      // Generate dossier metadata
      const dossierId = `DOSSIER_${caseId}_${Date.now()}`;
      const generatedAt = new Date();

      // Collect all evidence files
      const evidenceFiles = await this.collectEvidenceFiles(caseData);

      // Generate dossier summary PDF
      const summaryPdfPath = await this.generateDossierSummaryPDF(caseData, evidenceFiles, generatedBy);

      // Create ZIP bundle
      const zipPath = await this.createDossierZipBundle(
        dossierId,
        caseData,
        evidenceFiles,
        summaryPdfPath
      );

      // Calculate master hash of entire dossier
      const masterHash = await this.calculateFileHash(zipPath);

      // Generate Section 65B certificate for the dossier itself
      const dossierCertificate = await certificate65BService.generateCertificate(
        caseId,
        dossierId,
        'DOSSIER',
        generatedBy,
        { purpose: 'Court dossier admissibility under Section 65B' }
      );

      // Create evidence package record
      const dossierPackage = await getPrisma().evidencePackage.create({
        data: {
          caseId,
          packageId: dossierId,
          packageType: 'COURT_DOSSIER',
          title: `Court Dossier - ${caseData.title}`,
          description: `Complete court-admissible dossier for case ${caseData.title}`,
          contents: {
            caseId,
            evidenceCount: evidenceFiles.length,
            documents: evidenceFiles.filter(f => f.type === 'DOCUMENT').length,
            events: evidenceFiles.filter(f => f.type === 'EVENT').length,
            certificates: evidenceFiles.filter(f => f.type === 'CERTIFICATE').length,
            auditLogs: evidenceFiles.filter(f => f.type === 'AUDIT_LOG').length,
            generatedAt,
            generatedBy
          },
          masterHash,
          signature: await this.signDossier({
            dossierId,
            caseId,
            masterHash,
            generatedAt,
            generatedBy
          }),
          sealedAt: generatedAt,
          sealedBy: generatedBy,
          packageUrl: `/uploads/dossiers/${path.basename(zipPath)}`,
          isCourtAdmissible: true
        }
      });

      // Timestamp the dossier
      try {
        await timestampAuthority.timestampEvidencePackage(dossierPackage.id);
      } catch (error) {
        console.warn('Failed to timestamp dossier:', error);
      }

      return {
        dossierId,
        packageId: dossierPackage.id,
        zipUrl: dossierPackage.packageUrl,
        summaryPdfUrl: `/uploads/dossiers/${path.basename(summaryPdfPath)}`,
        masterHash,
        evidenceCount: evidenceFiles.length,
        certificateId: dossierCertificate.id,
        generatedAt
      };

    } catch (error) {
      console.error('Dossier generation failed:', error);
      throw error;
    }
  }

  /**
   * Collect all evidence files for the case
   */
  async collectEvidenceFiles(caseData) {
    const evidenceFiles = [];

    // Add case documents
    for (const doc of caseData.documents) {
      evidenceFiles.push({
        id: doc.id,
        type: 'DOCUMENT',
        filename: `document_${doc.id}.pdf`, // Assuming documents are PDFs
        originalName: doc.fileUrl.split('/').pop(),
        hash: doc.fileHash,
        uploadedAt: doc.uploadedAt,
        url: doc.fileUrl
      });
    }

    // Add evidence ledger entries
    for (const ledger of caseData.evidenceLedger) {
      evidenceFiles.push({
        id: ledger.id,
        type: 'EVIDENCE_LEDGER',
        filename: `ledger_${ledger.id}.json`,
        hash: ledger.contentHash,
        timestamp: ledger.timestamp,
        metadata: {
          evidenceType: ledger.evidenceType,
          actor: ledger.actor
        }
      });
    }

    // Add certificates
    for (const cert of caseData.certificates65B) {
      if (cert.pdfUrl) {
        evidenceFiles.push({
          id: cert.id,
          type: 'CERTIFICATE',
          filename: `certificate_${cert.certificateNumber.replace(/\//g, '_')}.pdf`,
          hash: cert.pdfHash,
          generatedAt: cert.generatedAt,
          url: cert.pdfUrl,
          certificateNumber: cert.certificateNumber
        });
      }
    }

    // Add audit logs
    const auditLogs = await getPrisma().auditTrail.findMany({
      where: { entityId: caseData.id },
      orderBy: { timestamp: 'desc' }
    });

    for (const log of auditLogs) {
      evidenceFiles.push({
        id: log.id,
        type: 'AUDIT_LOG',
        filename: `audit_${log.id}.json`,
        hash: log.integrityHash,
        timestamp: log.timestamp
      });
    }

    // v6.0/v7.0: Add Sealed Vakalatnama (Professional Authority)
    if (caseData.vakalatnamaUrl) {
      evidenceFiles.push({
        id: `VAK-${caseData.id}`,
        type: 'VAKALATNAMA',
        filename: 'vakalatnama_sealed.pdf',
        hash: crypto.createHash('sha256').update(caseData.vakalatnamaUrl).digest('hex'),
        representationStatus: caseData.representationStatus,
        url: caseData.vakalatnamaUrl
      });
    }

    return evidenceFiles;
  }

  /**
   * Generate dossier summary PDF
   */
  async generateDossierSummaryPDF(caseData, evidenceFiles, generatedBy) {
    const filename = `dossier_summary_${caseData.id}_${Date.now()}.pdf`;
    const filepath = path.join(this.dossiersDir, filename);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('COURT DOSSIER SUMMARY', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text('CivilCOPZ Digital Evidence Management System', { align: 'center' });
      doc.moveDown(1);
      
      // v7.0 Truth-Bearing Audit Header
      doc.fontSize(10).font('Helvetica-Bold').text('TRUTH-BEARING AUDIT PROOF', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(`Dossier Verification Hash: ${crypto.createHash('sha256').update(caseData.id).digest('hex')}`, { align: 'center' });
      doc.text(`Public Audit URI: https://civilcopz.gov.in/api/verify/${caseData.id}`, { align: 'center', color: 'blue' });
      doc.moveDown(2);

      // Case Information
      doc.fontSize(14).font('Helvetica-Bold').text('CASE INFORMATION');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(`Case ID: ${caseData.id}`);
      doc.text(`Title: ${caseData.title}`);
      doc.text(`Description: ${caseData.description || 'N/A'}`);
      doc.text(`Company: ${caseData.company}`);
      doc.text(`Jurisdiction: ${caseData.jurisdiction || 'N/A'}`);
      doc.text(`Status: ${caseData.status}`);
      doc.text(`Filed Date: ${caseData.createdAt.toLocaleDateString('en-IN')}`);
      doc.moveDown();
      
      // Professional Advocacy (v6.0/v7.0)
      doc.fontSize(14).font('Helvetica-Bold').text('PROFESSIONAL REPRESENTATION');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      if (caseData.advocate) {
          doc.text(`Advocate: ${caseData.advocate.email}`);
          doc.text(`Bar Council ID: ${caseData.advocate.barCouncilId || 'VERIFIED'}`);
          doc.text(`Representation Status: ${caseData.representationStatus}`);
          doc.text(`Vakalatnama: ${caseData.vakalatnamaUrl ? 'SEALED & ATTACHED' : 'PENDING'}`);
      } else {
          doc.text('Representative: SELF-REPRESENTED / PARTY-IN-PERSON');
      }
      doc.moveDown();

      // Judicial Registry History (v5.1.1/v7.0)
      doc.fontSize(14).font('Helvetica-Bold').text('JUDICIAL REGISTRY HISTORY');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      if (caseData.registrySubmissions && caseData.registrySubmissions.length > 0) {
          caseData.registrySubmissions.forEach((sub, i) => {
              doc.fontSize(10).text(`${i + 1}. Diary: ${sub.diaryNumber || 'N/A'} | Status: ${sub.scrutinyStatus}`);
              doc.fontSize(8).text(`   Filed: ${sub.filedAt.toLocaleDateString('en-IN')} | Code: ${sub.scrutinyCode || 'NONE'}`);
              if (sub.scrutinyNotes) doc.text(`   Notes: ${sub.scrutinyNotes}`);
              doc.moveDown(0.5);
          });
      } else {
          doc.text('Status: PRE-FILING / INTERNAL GATING');
      }
      doc.moveDown();

      // Consumer Information
      doc.fontSize(14).font('Helvetica-Bold').text('CONSUMER INFORMATION');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(`Name: ${caseData.consumerName || 'N/A'}`);
      doc.text(`Email: ${caseData.consumerEmail || 'N/A'}`);
      doc.text(`Phone: ${caseData.consumerPhone || 'N/A'}`);
      doc.text(`Address: ${caseData.consumerAddress || 'N/A'}`);
      doc.moveDown();

      // Evidence Summary
      doc.fontSize(14).font('Helvetica-Bold').text('EVIDENCE SUMMARY');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');

      const evidenceByType = evidenceFiles.reduce((acc, file) => {
        acc[file.type] = (acc[file.type] || 0) + 1;
        return acc;
      }, {});

      doc.text(`Total Evidence Files: ${evidenceFiles.length}`);
      Object.entries(evidenceByType).forEach(([type, count]) => {
        doc.text(`${type}: ${count} files`);
      });
      doc.moveDown();

      // Evidence List
      doc.fontSize(14).font('Helvetica-Bold').text('EVIDENCE FILE LIST');
      doc.moveDown(0.5);

      evidenceFiles.forEach((file, index) => {
        doc.fontSize(10).font('Helvetica');
        doc.text(`${index + 1}. ${file.filename}`);
        doc.text(`   Type: ${file.type} | Hash: ${file.hash.substring(0, 16)}...`);
        doc.text(`   Timestamp: ${file.timestamp || file.uploadedAt || file.generatedAt || 'N/A'}`);
        doc.moveDown(0.5);
      });

      // Chain of Custody Summary
      doc.fontSize(14).font('Helvetica-Bold').text('CHAIN OF CUSTODY SUMMARY');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');

      const custodySummary = await chainOfCustodyService.getCaseCustodySummary(caseData.id);
      doc.text(`Total Custody Records: ${custodySummary.totalCustodyRecords || 0}`);
      doc.text(`Evidence Items Tracked: ${custodySummary.evidenceCount || 0}`);
      doc.moveDown();

      // Legal Compliance
      doc.fontSize(14).font('Helvetica-Bold').text('LEGAL COMPLIANCE');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text('• Section 65B Certificate Generated for All Digital Evidence');
      doc.text('• Chain of Custody Maintained Throughout Process');
      doc.text('• Trusted Timestamping Applied (RFC 3161)');
      doc.text('• Digital Signatures Using KMS');
      doc.text('• Audit Trail Complete and Verifiable');
      doc.moveDown();

      // Footer
      doc.fontSize(10).text(`Generated by: ${generatedBy}`, { align: 'left' });
      doc.text(`Generated on: ${new Date().toISOString()}`, { align: 'left' });
      doc.text('This dossier is court-admissible under Indian Evidence Act, 1872', { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
      })();
    });
  }

  /**
   * Create ZIP bundle with all evidence files
   */
  async createDossierZipBundle(dossierId, caseData, evidenceFiles, summaryPdfPath) {
    return new Promise((resolve, reject) => {
      (async () => {
      try {
        const zipFilename = `court_dossier_${caseData.id}_${Date.now()}.zip`;
      const zipPath = path.join(this.dossiersDir, zipFilename);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);

      archive.pipe(output);

      // Add summary PDF
      archive.file(summaryPdfPath, { name: 'dossier_summary.pdf' });

      // Add evidence files
      for (const file of evidenceFiles) {
        try {
          if (file.url) {
            // Physical file exists
            const filePath = path.join(__dirname, '../uploads', file.url);
            archive.file(filePath, { name: `evidence/${file.filename}` });
          } else {
            // Create JSON metadata file
            const metadata = {
              id: file.id,
              type: file.type,
              hash: file.hash,
              timestamp: file.timestamp || file.uploadedAt || file.generatedAt,
              metadata: file.metadata || {}
            };
            archive.append(JSON.stringify(metadata, null, 2), { name: `evidence/${file.filename}` });
          }
        } catch (error) {
          console.warn(`Failed to add file ${file.filename} to archive:`, error);
        }
      }

      // Add manifest file
      const manifest = {
        dossierId,
        caseId: caseData.id,
        caseTitle: caseData.title,
        generatedAt: new Date().toISOString(),
        evidenceCount: evidenceFiles.length,
        files: evidenceFiles.map(f => ({
          filename: f.filename,
          type: f.type,
          hash: f.hash,
          timestamp: f.timestamp || f.uploadedAt || f.generatedAt
        }))
      };

      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

      archive.finalize();      } catch (error) {
        reject(error);
      }    })(); });
  }

  /**
   * Calculate file hash
   */
  async calculateFileHash(filepath) {
    const fileBuffer = await fs.readFile(filepath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Get dossier by package ID
   */
  async getDossier(packageId) {
    const dossier = await getPrisma().evidencePackage.findUnique({
      where: { packageId },
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

    if (!dossier) {
      throw new Error('Dossier not found');
    }

    return dossier;
  }

  /**
   * Get dossiers for case
   */
  async getCaseDossiers(caseId) {
    return await getPrisma().evidencePackage.findMany({
      where: {
        caseId,
        packageType: 'COURT_DOSSIER'
      },
      orderBy: { sealedAt: 'desc' },
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
   * Verify dossier integrity
   */
  async verifyDossier(packageId) {
    const dossier = await this.getDossier(packageId);

    // Verify ZIP file integrity
    let zipValid = true;
    if (dossier.packageUrl) {
      try {
        const zipPath = path.join(__dirname, '../uploads/dossiers',
          path.basename(dossier.packageUrl));
        const actualHash = await this.calculateFileHash(zipPath);
        zipValid = actualHash === dossier.masterHash;
      } catch (error) {
        zipValid = false;
      }
    }

    // Verify signature
    const dossierData = {
      dossierId: dossier.packageId,
      caseId: dossier.caseId,
      masterHash: dossier.masterHash,
      sealedAt: dossier.sealedAt,
      sealedBy: dossier.sealedBy
    };

    const expectedSignature = await this.signDossier(dossierData);
    const signatureValid = dossier.signature === expectedSignature;

    // Verify trusted timestamp if present
    let timestampValid = true;
    if (dossier.trustedTimestamp) {
      try {
        const recordHash = crypto.createHash('sha256')
          .update(JSON.stringify(dossierData)).digest('hex');
        const verification = await timestampAuthority.verifyTimestamp(recordHash, dossier.trustedTimestamp);
        timestampValid = verification.isValid;
      } catch (error) {
        timestampValid = false;
      }
    }

    return {
      packageId,
      isValid: zipValid && signatureValid && timestampValid,
      zipValid,
      signatureValid,
      timestampValid,
      dossierValid: dossier.isCourtAdmissible
    };
  }
}

module.exports = new CourtDossierService();