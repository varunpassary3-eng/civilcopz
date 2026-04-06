const express = require('express');
const router = express.Router();
const identityBinding = require('../services/identityBindingService');
const certificate65B = require('../services/certificate65BService');
const fsmService = require('../services/fsmService');
const esignSimulator = require('../services/esignSimulator');
const tsaSimulator = require('../services/tsaSimulator');
const idempotencyService = require('../services/idempotencyService');
const dbManager = require('../services/databaseManager');
const timestampAuthority = require('../services/timestampAuthorityService');
const chainOfCustody = require('../services/chainOfCustodyService');
const evidencePackaging = require('../services/evidencePackagingService');
const verificationService = require('../services/verificationService');
const { verifyToken } = require('../middleware/auth');

// Timestamp Authority Routes
router.post('/timestamp/evidence/:entryId', verifyToken, async (req, res) => {
  try {
    const { entryId } = req.params;
    const result = await timestampAuthority.timestampEvidenceEntry(entryId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/timestamp/custody/:recordId', verifyToken, async (req, res) => {
  try {
    const { recordId } = req.params;
    const result = await timestampAuthority.timestampCustodyRecord(recordId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/timestamp/status/:evidenceId', verifyToken, async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const status = await timestampAuthority.getTimestampStatus(evidenceId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chain of Custody Routes
router.post('/custody/upload', verifyToken, async (req, res) => {
  try {
    const { caseId, evidenceId, reason, transferMethod } = req.body;
    const result = await chainOfCustody.recordUpload(
      caseId,
      evidenceId,
      req.user.id,
      reason,
      transferMethod,
      req.ip,
      req.get('User-Agent'),
      req.body.deviceFingerprint
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/custody/access', verifyToken, async (req, res) => {
  try {
    const { caseId, evidenceId, reason } = req.body;
    const result = await chainOfCustody.recordAccess(
      caseId,
      evidenceId,
      req.user.id,
      reason,
      req.ip,
      req.get('User-Agent'),
      req.body.deviceFingerprint
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/custody/modify', verifyToken, async (req, res) => {
  try {
    const { caseId, evidenceId, reason } = req.body;
    const result = await chainOfCustody.recordModification(
      caseId,
      evidenceId,
      req.user.id,
      reason,
      req.ip,
      req.get('User-Agent'),
      req.body.deviceFingerprint
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/custody/transfer', verifyToken, async (req, res) => {
  try {
    const { caseId, evidenceId, toActor, reason, transferMethod } = req.body;
    const result = await chainOfCustody.recordTransfer(
      caseId,
      evidenceId,
      req.user.id,
      toActor,
      reason,
      transferMethod,
      req.ip,
      req.get('User-Agent'),
      req.body.deviceFingerprint
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/custody/seal', verifyToken, async (req, res) => {
  try {
    const { caseId, evidenceId, reason } = req.body;
    const result = await chainOfCustody.recordSealing(
      caseId,
      evidenceId,
      req.user.id,
      reason,
      req.ip,
      req.get('User-Agent'),
      req.body.deviceFingerprint
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/custody/chain/:caseId/:evidenceId', verifyToken, async (req, res) => {
  try {
    const { caseId, evidenceId } = req.params;
    const chain = await chainOfCustody.getChainOfCustody(caseId, evidenceId);
    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/custody/summary/:caseId', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const summary = await chainOfCustody.getCaseCustodySummary(caseId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/custody/custodian/:caseId/:evidenceId', verifyToken, async (req, res) => {
  try {
    const { caseId, evidenceId } = req.params;
    const custodian = await chainOfCustody.getCurrentCustodian(caseId, evidenceId);
    res.json(custodian);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Evidence Packaging Routes
router.post('/evidence-packages/dossier', verifyToken, async (req, res) => {
  try {
    const { caseId, title, description, includedEvidenceIds } = req.body;
    const result = await evidencePackaging.createCourtDossier(
      caseId,
      title,
      description,
      includedEvidenceIds,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/evidence-packages/bundle', verifyToken, async (req, res) => {
  try {
    const { caseId, title, evidenceIds, bundleType } = req.body;
    const result = await evidencePackaging.createEvidenceBundle(
      caseId,
      title,
      evidenceIds,
      bundleType,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/evidence-packages/verify/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;
    const result = await evidencePackaging.verifyPackage(packageId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/evidence-packages/:packageId', verifyToken, async (req, res) => {
  try {
    const { packageId } = req.params;
    const evidencePackage = await evidencePackaging.getPackage(packageId);
    res.json(evidencePackage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/evidence-packages/case/:caseId', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const packages = await evidencePackaging.listCasePackages(caseId);
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verification Routes
router.post('/verification/manifest/:caseId', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await verificationService.generateVerificationManifest(caseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/verification/report/:caseId', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const report = await verificationService.generateVerificationReport(caseId);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/verification/cli', verifyToken, async (req, res) => {
  try {
    const cliPath = await verificationService.generateCLIVerifier();
    res.json({ cliPath, message: 'CLI verifier generated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Identity Binding Routes
router.post('/auth/enhanced-login', async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;
    const result = await identityBinding.enhancedLogin(email, password, deviceInfo);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/auth/verify-device', async (req, res) => {
  try {
    const { deviceId, verificationCode } = req.body;
    const result = await identityBinding.verifyDevice(deviceId, verificationCode);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/identity/kyc', verifyToken, async (req, res) => {
  try {
    const result = await identityBinding.submitKYC(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/identity/kyc/verify/:kycId', verifyToken, async (req, res) => {
  try {
    const { kycId } = req.params;
    const { approved, notes } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await identityBinding.verifyKYC(kycId, approved, req.user.id, notes);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/identity/profile', verifyToken, async (req, res) => {
  try {
    const profile = await identityBinding.getIdentityProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/identity/devices/:deviceId', verifyToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await identityBinding.revokeDevice(deviceId, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Certificate 65B Routes
router.post('/certificates/generate', verifyToken, async (req, res) => {
  try {
    const { caseId, evidenceId, evidenceType } = req.body;
    const result = await certificate65B.generateCertificate(
      caseId,
      evidenceId,
      evidenceType,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/certificates/:certificateId', verifyToken, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const certificate = await certificate65B.getCertificate(certificateId);
    res.json(certificate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/certificates/case/:caseId', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const certificates = await certificate65B.getCaseCertificates(caseId);
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/certificates/verify/:certificateId', verifyToken, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const verification = await certificate65B.verifyCertificate(certificateId);
    res.json(verification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/certificates/:certificateId/download', verifyToken, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const certificate = await certificate65B.getCertificate(certificateId);

    if (!certificate.pdfUrl) {
      return res.status(404).json({ error: 'PDF not available' });
    }

    const pdfPath = require('path').join(__dirname, '../uploads/certificates',
      require('path').basename(certificate.pdfUrl));

    res.download(pdfPath, `certificate_${certificate.certificateNumber.replace(/\//g, '_')}.pdf`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Hardened Court-Connected Stack (v3.0) ---

// 1. Initiate eSign Flow
router.post('/sign/:caseId', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const prisma = dbManager.getWriteClient();

    const caseData = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    
    // FSM Guard
    fsmService.validateTransition(caseData.registryStatus, 'SIGNING_INITIATED');

    const { txnId, redirectUrl } = await esignSimulator.initiateESign(Buffer.from('Complaint Content'), req.user);

    await prisma.case.update({
      where: { id: caseId },
      data: { 
        registryStatus: 'SIGNING_INITIATED',
        signatureTxnId: txnId
      }
    });

    res.json({ txnId, redirectUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Mock eSign Provider UI (Consent Simulation)
router.get('/mock/esign/simulate', async (req, res) => {
  const { txn, hash } = req.query;
  res.send(`
    <html>
      <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f8fafc;">
        <div style="text-align: center; border: 1px solid #1e293b; padding: 2rem; border-radius: 12px; background: #1e293b;">
          <h2>🔐 Aadhaar eSign Simulator</h2>
          <p>Transaction: <code>${txn}</code></p>
          <p>Document Hash (SHA-256): <code>${hash.substring(0, 16)}...</code></p>
          <button onclick="window.location.href='/api/litigation/esign/callback?txnId=${txn}&caseId=${req.query.caseId || 'test-case-id'}'" 
                  style="background: #38bdf8; color: #0f172a; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-weight: bold; cursor: pointer;">
            Confirm & Sign Document
          </button>
        </div>
      </body>
    </html>
  `);
});

// 3. eSign Callback (Protocol Safe & Idempotent)
router.get('/esign/callback', async (req, res) => {
  try {
    const { txnId, caseId } = req.query;
    const prisma = dbManager.getWriteClient();

    // Idempotency Check
    const acquired = await idempotencyService.acquireOnce(`esign:cb:${txnId}`, 3600);
    if (!acquired) return res.status(200).send('Duplicate callback ignored');

    try {
      const result = await prisma.$transaction(async (tx) => {
        const caseData = await tx.case.findUnique({ where: { id: caseId } });
        if (!caseData) throw new Error('Case not found');
        
        fsmService.validateTransition(caseData.registryStatus, 'SIGNED');

        const signedMeta = await esignSimulator.simulateCallback(txnId);

        await tx.caseEvent.create({
          data: {
            caseId,
            eventType: 'SIGNED',
            actor: 'SYSTEM',
            source: 'ESIGN_CALLBACK',
            sourceRef: txnId,
            hash: signedMeta.certificateHash
          }
        });

        return await tx.case.update({
          where: { id: caseId },
          data: {
            signed: true,
            signedAt: new Date(),
            certificateHash: signedMeta.certificateHash,
            registryStatus: 'SIGNED'
          }
        });
      });

      res.send(`
        <html>
          <script>
            alert('Signature Applied Successfully. State: SIGNED');
            window.location.href = 'http://localhost:5173/dashboard';
          </script>
        </html>
      `);
    } catch (txError) {
      // Prisma P2002 = Unique constraint failed
      if (txError.code === 'P2002') {
        console.warn(`[FORENSIC_IDEMPOTENCY] DB-level duplicate detected for txnId: ${txnId}. Gracefully ignoring.`);
        return res.status(200).send('Duplicate callback ignored');
      }
      throw txError; // Re-throw other errors
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Certified Timestamp (RFC 3161)
router.post('/timestamp/:caseId', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;
    const prisma = dbManager.getWriteClient();

    const caseData = await prisma.case.findUnique({ where: { id: caseId } });
    fsmService.validateTransition(caseData.registryStatus, 'TIMESTAMPED');

    const tsRecord = await tsaSimulator.generateTimestamp(caseData.certificateHash || 'dummy-hash');

    await prisma.$transaction(async (tx) => {
      await tx.caseEvent.create({
        data: {
          caseId,
          eventType: 'TIMESTAMPED',
          actor: 'SYSTEM',
          source: 'TSA',
          sourceRef: tsRecord.token,
          hash: tsRecord.hash
        }
      });

      await tx.case.update({
        where: { id: caseId },
        data: { registryStatus: 'TIMESTAMPED' }
      });
    });

    res.json(tsRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
