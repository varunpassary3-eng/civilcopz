const dbManager = require('../services/databaseManager');
const auditLedger = require('../services/auditLedgerService');
const eventLedger = require('../services/eventLedgerService');
const filingService = require('../services/filingService');
const registryService = require('../services/registryService');
const governanceService = require('../services/governanceService');
const remediationService = require('../services/remediationService');
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "asia-south1" });

const crypto = require('crypto');

const getPrisma = () => dbManager.getWriteClient();

async function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * CaseController: Consumer Litigation Lifecycle Engine (v2)
 * Manages from submission to judicial adjudication.
 */
class CaseController {
  
  async createCase(req, res) {
    try {
      const { 
        title, description, company, category, jurisdiction, 
        considerationPaid, expectedCompensationClient, 
        isDeclaredTrue, declaredName, 
        consumerName, consumerEmail, consumerPhone, consumerAddress 
      } = req.body;
      const uploadedDocuments = await Promise.all(
        (req.files || []).map(async (file) => {
          const fileHash = await hashBuffer(file.buffer);
          const s3Key = `uploads/${Date.now()}-${file.originalname}`;
          
          const upload = new Upload({
            client: s3Client,
            params: {
              Bucket: process.env.AWS_S3_BUCKET || "civilcopz-evidence-mumbai",
              Key: s3Key,
              Body: file.buffer,
              ContentType: file.mimetype,
              ServerSideEncryption: "aws:kms",
              // Authoritative: Object Lock COMPLIANCE Enforcement
              ObjectLockMode: 'COMPLIANCE',
              ObjectLockRetainUntilDate: new Date(Date.now() + 1825 * 24 * 60 * 60 * 1000), // 5-Year Lock
              Metadata: {
                sha256: fileHash,
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size.toString()
              }
            }
          });

          await upload.done();

          return {
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            fileUrl: s3Key, // Store S3 Key as location
            fileHash,
            type: 'evidence',
          };
        })
      );

      // --- AUTHORITATIVE TRANSACTIONAL ENTRY (v4.1) ---
      const caseData = await getPrisma().$transaction(async (tx) => {
        const newCase = await tx.case.create({
          data: {
            title,
            description,
            company,
            category,
            jurisdiction,
            considerationPaid,
            expectedCompensationClient,
            isDeclaredTrue,
            declaredName,
            consumerName,
            consumerEmail,
            consumerPhone,
            consumerAddress,
            status: 'Submitted',
            reporter: req.user?.id ? { connect: { id: req.user.id } } : undefined,
            companyRef: {
              connectOrCreate: {
                where: { name: company },
                create: { name: company, category: category || 'Other' }
              }
            },
            documents: {
              create: uploadedDocuments.map(({ fileUrl, fileHash, type }) => ({
                fileUrl,
                fileHash,
                type,
              }))
            },
            timeline: {
              create: {
                action: 'Grievance Submitted via National Substrate',
                status: 'Submitted',
                actor: 'Consumer'
              }
            }
          },
          include: { documents: true, companyRef: true }
        });

        // 2. Create evidence integrity entries (Inside Transaction)
        const storedDocumentsByUrl = new Map(
          (newCase.documents || []).map((document) => [document.fileUrl, document])
        );

        for (const file of uploadedDocuments) {
          const storedDocument = storedDocumentsByUrl.get(file.fileUrl);
          await auditLedger.createEvidenceEntry(
            newCase.id,
            storedDocument?.id || file.filename,
            'DOCUMENT',
            {
              filename: file.filename,
              fileHash: storedDocument?.fileHash || file.fileHash,
              fileUrl: storedDocument?.fileUrl || file.fileUrl,
              size: file.size,
            },
            {
              uploadedBy: req.user.id,
              timestamp: new Date(),
              mimetype: file.mimetype,
              documentId: storedDocument?.id || null,
            },
            req.user.id,
            req.ip || req.connection.remoteAddress,
            req.get('User-Agent'),
            tx // Passing transaction context
          );
        }

        // 3. Create case-level evidence entry
        await auditLedger.createEvidenceEntry(
          newCase.id,
          newCase.id,
          'CASE',
          { title: newCase.title, company: newCase.company },
          { createdBy: req.user.id, jurisdiction: newCase.jurisdiction },
          req.user.id,
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent'),
          tx // Passing transaction context
        );

        return newCase;
      });

      // Audit Log for evidentiary posture (Outside non-critical tx)
      await eventLedger.recordEvent(caseData.id, 'CASE_CREATED', { title, documentCount: (req.files || []).length }, 'User', 'API');
      
      res.status(201).json({ case: caseData });
    } catch (error) {
      console.error('❌ [CREATE_CASE_FAILURE]', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateCaseStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updatedCase = await getPrisma().case.update({
        where: { id },
        data: { status }
      });
      await eventLedger.recordEvent(id, 'STATUS_UPDATED', { status }, 'System/Staff', 'API');
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async setSatisfaction(req, res) {
    try {
      const { id } = req.params;
      const { satisfaction } = req.body;
      const updatedCase = await getPrisma().case.update({
        where: { id },
        data: { satisfaction, status: 'Resolved' }
      });
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async companyStats(req, res) {
    try {
      const stats = await getPrisma().case.groupBy({
        by: ['company'],
        _count: { _all: true },
        _avg: { statutoryFee: true }
      });
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCases(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const { search, status, category } = req.query;

      // Construct Filter Engine (Phase 13)
      const where = {};
      if (status) where.status = status;
      if (category) where.category = category;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [cases, total] = await Promise.all([
        getPrisma().case.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            company: true,
            status: true,
            category: true,
            jurisdiction: true,
            createdAt: true,
            updatedAt: true,
            noticeStatus: true,
            noticeDeadline: true,
            companyRef: {
              select: {
                id: true,
                name: true,
                rating: true
              }
            }
          }
        }),
        getPrisma().case.count({ where })
      ]);

      res.json({ 
        cases,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCaseById(req, res) {
    try {
      const { id } = req.params;
      const caseData = await getPrisma().case.findUnique({
        where: { id },
        include: { documents: true, events: { orderBy: { timestamp: 'asc' } }, noticeDeliveries: true }
      });
      res.json(caseData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Pecuniary Jurisdiction Rectification (AFE Layer)
   */
  async rectifyPecuniary(req, res) {
    const { id } = req.params;
    const { proposedCompensationAdvocate } = req.body;

    try {
      const caseData = await getPrisma().case.findUnique({ where: { id } });
      const totalClaim = (caseData.considerationPaid || 0) + proposedCompensationAdvocate;

      const updatedCase = await getPrisma().case.update({
        where: { id },
        data: {
          proposedCompensationAdvocate,
          finalCourtClaimValue: totalClaim,
          statutoryFee: governanceService.calculateFilingFee(totalClaim)
        }
      });

      await eventLedger.recordEvent(id, 'PECUNIARY_RECTIFIED', { totalClaim }, 'Advocate', 'API');
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ error: 'RECTIFICATION_FAILURE' });
    }
  }

  /**
   * Authority Filing Mode Update
   */
  async updateFilingMode(req, res) {
    const { id } = req.params;
    const { filingMode } = req.body;
    try {
      const updatedCase = await getPrisma().case.update({
        where: { id },
        data: { filingMode }
      });
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ error: 'MODE_UPDATE_FAILURE' });
    }
  }

  /**
   * Judicial Filing Package Generation (AFE V2)
   * Returns URLs for Complaint, Annexures, Affidavit, and Vakalatnama.
   */
  async getFilingPackage(req, res) {
    const { id } = req.params;
    try {
      const pkg = await filingService.getLitigationPackage(id);
      res.status(200).json(pkg);
    } catch (error) {
      console.error('[ESIGN_CALLBACK_FAILURE]', error);
      res.status(500).json({ error: 'Failed to process signature callback.' });
    }
  }

  /**
   * --- AUTHORITATIVE: ILLEGAL EGRESS PREVENTION (v5.1.1) ---
   * Hard-coded validation gate to block procedurally defective filings.
   */
  async validatePreFiling(caseData) {
    console.info(`[SECURITY_GATE] Auditing procedural readiness for Case: ${caseData.id}`);

    if (!caseData.signed || !caseData.certificateHash) {
      throw new Error("FILING_BLOCKED: Signature missing or invalid certificate hash.");
    }

    // Checking for RFC 3161 Timestamp (v4.2 Hardening)
    const latestEvidence = await getPrisma().evidenceIntegrityLedger.findFirst({
      where: { caseId: caseData.id },
      orderBy: { timestamp: 'desc' }
    });

    if (!latestEvidence || !latestEvidence.trustedTimestamp) {
      throw new Error("FILING_BLOCKED: Trusted Timestamp (RFC 3161) not verified or missing.");
    }

    // Forensic Hash Integrity (Sovereign Constraint)
    const currentHash = governanceService.calculateEvidentiaryHash(caseData);
    if (caseData.certificateHash !== currentHash) {
      throw new Error("FILING_BLOCKED: Evidence integrity compromised. Current hash does not match signature hash.");
    }

    return true;
  }

  /**
   * --- AUTHORITATIVE: JUDICIAL REGISTRY FILING (v5.0/5.1.1) ---
   * Submits a finalized, signed case to the designated commission.
   */
  async fileCase(req, res) {
    const { caseId } = req.params;
    try {
      const prisma = getPrisma();
      const caseData = await prisma.case.findUnique({
        where: { id: caseId },
        include: { documents: true }
      });

      if (!caseData) throw new Error("Case not found");

      // 1. ILLEGAL EGRESS PREVENTION (v5.1.1)
      try {
        await this.validatePreFiling(caseData);
      } catch (gateError) {
        console.error(`❌ [SECURITY_GATE_REJECTION] ${gateError.message}`);
        
        await eventLedger.recordEvent(caseId, 'FILING_BLOCKED', {
          reason: gateError.message,
          timestamp: new Date().toISOString()
        }, 'SYSTEM', 'SECURITY_GATE');

        return res.status(403).json({ 
          error: "Illegal Egress Blocked", 
          reason: gateError.message 
        });
      }

      console.info(`[REGISTRY_ORCHESTRATION] Initiating judicial filing for Case: ${caseId}`);
      const submission = await registryService.submitToEDaakhil(caseId);
      res.json(submission);
    } catch (error) {
      console.error('❌ [FILING_FAILURE]', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Professional/Advocate Review Substrate
   */
  async submitProfessionalReview(req, res) {
    const { id } = req.params;
    const { status, notes } = req.body;

    try {
      const updatedCase = await getPrisma().case.update({
        where: { id },
        data: {
          reviewStatus: status,
          reviewNotes: notes,
          reviewedAt: new Date(),
          reviewedBy: req.user?.id || 'SYSTEM_ADVOCATE'
        }
      });

      await eventLedger.recordEvent(id, 'PROFESSIONAL_REVIEW', { status }, 'Advocate', 'API');
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ error: 'REVIEW_FAILURE' });
    }
  }

  /**
   * Polls the external registry for scrutiny updates.
   */
  async pollRegistry(req, res) {
    const { caseId } = req.params;
    try {
      const update = await registryService.pollRegistryStatus(caseId);
      res.status(200).json(update);
    } catch (error) {
      res.status(500).json({ error: 'Failed to poll registry status.' });
    }
  }

  /**
   * --- AUTHORITATIVE: SELF-HEALING REGISTRY REMEDIATION (v5.2) ---
   * Guides the user through correcting commission-noted deficiencies.
   */
  async remediateCase(req, res) {
    const { caseId } = req.params;
    const prisma = getPrisma();
    
    try {
      // 1. Fetch latest defective submission
      const submission = await prisma.caseRegistrySubmission.findFirst({
        where: { caseId, scrutinyStatus: 'DEFICIENCY' },
        orderBy: { filedAt: 'desc' }
      });

      if (!submission) {
        return res.status(404).json({ error: "No deficiency found for this case." });
      }

      // 2. Map the Remediation Strategy
      const strategy = remediationService.getRemediationStrategy(submission.scrutinyCode);

      // 3. Atomically provoke remediation state
      await prisma.$transaction(async (tx) => {
        await tx.case.update({
          where: { id: caseId },
          data: { registryStatus: 'DRAFT' } // Reset to draft for corrective actions
        });

        await eventLedger.recordEvent(caseId, 'REGISTRY_DEFECT_NOTED', {
          scrutinyCode: submission.scrutinyCode,
          strategy: strategy.action
        }, 'SYSTEM', 'REMEDIATION_ENGINE', tx);
      });

      res.status(200).json({
        scrutinyCode: submission.scrutinyCode,
        strategy: strategy.strategy,
        message: strategy.message,
        actionRequired: strategy.action
      });
    } catch (error) {
      console.error('[REMEDIATION_FAILURE]', error);
      res.status(500).json({ error: 'Failed to initiate remediation cycle.' });
    }
  }

  /**
   * Direct PDF streaming for formal downloads.
   */
  async streamComplaint(req, res) {
    const { id } = req.params;
    try {
      const url = await filingService.generateCourtComplaint(id);
      res.redirect(url);
    } catch (error) {
      res.status(500).send('ERROR_STREAMING_COMPLAINT');
    }
  }
}

module.exports = new CaseController();
