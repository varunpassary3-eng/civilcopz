const express = require('express');
const router = express.Router();
const certificate65BService = require('../services/certificate65BService');
const dbManager = require('../services/databaseManager');
const { verifyToken, authorize } = require('../middleware/auth');
const Joi = require('joi');

const getPrisma = () => dbManager.getWriteClient();

// Validation schemas
const generateCertificateSchema = Joi.object({
  caseId: Joi.string().required(),
  evidenceId: Joi.string().required(),
  evidenceType: Joi.string().valid('DOCUMENT', 'EVENT', 'NOTICE', 'AUDIT_LOG').required()
});

const certificateIdSchema = Joi.object({
  certificateId: Joi.string().required()
});

/**
 * Generate Section 65B certificate
 * POST /api/certificates/generate
 */
router.post('/generate', verifyToken, authorize(['admin', 'ADVOCATE']), async (req, res) => {
  try {
    const { error, value } = generateCertificateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { caseId, evidenceId, evidenceType } = value;

    // Verify user has access to the case
    const prisma = getPrisma();
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: { reporter: true }
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && caseData.reporterId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const certificate = await certificate65BService.generateCertificate(
      caseId,
      evidenceId,
      evidenceType,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Section 65B certificate generated successfully',
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        generatedAt: certificate.generatedAt,
        pdfUrl: certificate.pdfUrl,
        isValid: certificate.isValid
      }
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate certificate',
      details: error.message
    });
  }
});

/**
 * Get certificate by ID
 * GET /api/certificates/:certificateId
 */
router.get('/:certificateId', verifyToken, async (req, res) => {
  try {
    const { error, value } = certificateIdSchema.validate({ certificateId: req.params.certificateId });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid certificate ID'
      });
    }

    const certificate = await certificate65BService.getCertificate(value.certificateId);

    // Check access permissions
    if (req.user.role !== 'admin' && certificate.generatedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      certificate
    });

  } catch (error) {
    console.error('Get certificate error:', error);
    if (error.message === 'Certificate not found') {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve certificate'
    });
  }
});

/**
 * Get certificates for case
 * GET /api/certificates/case/:caseId
 */
router.get('/case/:caseId', verifyToken, async (req, res) => {
  try {
    const caseId = req.params.caseId;

    // Verify access to case
    const caseData = await getPrisma().case.findUnique({
      where: { id: caseId }
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: 'Case not found'
      });
    }

    if (req.user.role !== 'admin' && caseData.reporterId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const certificates = await certificate65BService.getCaseCertificates(caseId);

    res.json({
      success: true,
      certificates
    });

  } catch (error) {
    console.error('Get case certificates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve certificates'
    });
  }
});

/**
 * Verify certificate integrity
 * GET /api/certificates/:certificateId/verify
 */
router.get('/:certificateId/verify', verifyToken, async (req, res) => {
  try {
    const { error, value } = certificateIdSchema.validate({ certificateId: req.params.certificateId });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid certificate ID'
      });
    }

    const verification = await certificate65BService.verifyCertificate(value.certificateId);

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Certificate verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify certificate'
    });
  }
});

/**
 * Revoke certificate
 * POST /api/certificates/:certificateId/revoke
 */
router.post('/:certificateId/revoke', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    const { error, value } = certificateIdSchema.validate({ certificateId: req.params.certificateId });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid certificate ID'
      });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Revocation reason is required'
      });
    }

    await certificate65BService.revokeCertificate(value.certificateId, reason, req.user.id);

    res.json({
      success: true,
      message: 'Certificate revoked successfully'
    });

  } catch (error) {
    console.error('Certificate revocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke certificate'
    });
  }
});

/**
 * Download certificate PDF
 * GET /api/certificates/:certificateId/download
 */
router.get('/:certificateId/download', verifyToken, async (req, res) => {
  try {
    const { error, value } = certificateIdSchema.validate({ certificateId: req.params.certificateId });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid certificate ID'
      });
    }

    const certificate = await certificate65BService.getCertificate(value.certificateId);

    // Check access permissions
    if (req.user.role !== 'admin' && certificate.generatedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!certificate.pdfUrl) {
      return res.status(404).json({
        success: false,
        error: 'PDF not available'
      });
    }

    const pdfPath = require('path').join(__dirname, '../uploads/certificates',
      require('path').basename(certificate.pdfUrl));

    res.download(pdfPath, `certificate_${certificate.certificateNumber.replace(/\//g, '_')}.pdf`);

  } catch (error) {
    console.error('Certificate download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download certificate'
    });
  }
});

module.exports = router;
