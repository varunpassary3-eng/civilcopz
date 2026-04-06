const express = require('express');
const router = express.Router();
const courtDossierService = require('../services/courtDossierService');
const dbManager = require('../services/databaseManager');
const { verifyToken, authorize } = require('../middleware/auth');
const Joi = require('joi');

const getPrisma = () => dbManager.getWriteClient();

// Validation schemas
const generateDossierSchema = Joi.object({
  caseId: Joi.string().required()
});

const dossierIdSchema = Joi.object({
  dossierId: Joi.string().required()
});

/**
 * Generate court dossier
 * POST /api/dossiers/generate
 */
router.post('/generate', verifyToken, authorize(['admin', 'ADVOCATE']), async (req, res) => {
  try {
    const { error, value } = generateDossierSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { caseId } = value;

    // Verify user has access to the case
    const caseData = await getPrisma().case.findUnique({
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

    const dossier = await courtDossierService.generateCourtDossier(caseId, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Court dossier generated successfully',
      dossier: {
        dossierId: dossier.dossierId,
        packageId: dossier.packageId,
        zipUrl: dossier.zipUrl,
        summaryPdfUrl: dossier.summaryPdfUrl,
        masterHash: dossier.masterHash,
        evidenceCount: dossier.evidenceCount,
        certificateId: dossier.certificateId,
        generatedAt: dossier.generatedAt
      }
    });

  } catch (error) {
    console.error('Dossier generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate court dossier',
      details: error.message
    });
  }
});

/**
 * Get dossier by ID
 * GET /api/dossiers/:dossierId
 */
router.get('/:dossierId', verifyToken, async (req, res) => {
  try {
    const { error, value } = dossierIdSchema.validate({ dossierId: req.params.dossierId });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dossier ID'
      });
    }

    const dossier = await courtDossierService.getDossier(value.dossierId);

    // Check access permissions
    if (req.user.role !== 'admin' && dossier.sealedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      dossier
    });

  } catch (error) {
    console.error('Get dossier error:', error);
    if (error.message === 'Dossier not found') {
      return res.status(404).json({
        success: false,
        error: 'Dossier not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dossier'
    });
  }
});

/**
 * Get dossiers for case
 * GET /api/dossiers/case/:caseId
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

    const dossiers = await courtDossierService.getCaseDossiers(caseId);

    res.json({
      success: true,
      dossiers
    });

  } catch (error) {
    console.error('Get case dossiers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dossiers'
    });
  }
});

/**
 * Verify dossier integrity
 * GET /api/dossiers/:dossierId/verify
 */
router.get('/:dossierId/verify', verifyToken, async (req, res) => {
  try {
    const { error, value } = dossierIdSchema.validate({ dossierId: req.params.dossierId });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dossier ID'
      });
    }

    const verification = await courtDossierService.verifyDossier(value.dossierId);

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Dossier verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify dossier'
    });
  }
});

/**
 * Download dossier ZIP
 * GET /api/dossiers/:dossierId/download
 */
router.get('/:dossierId/download', verifyToken, async (req, res) => {
  try {
    const { error, value } = dossierIdSchema.validate({ dossierId: req.params.dossierId });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dossier ID'
      });
    }

    const dossier = await courtDossierService.getDossier(value.dossierId);

    // Check access permissions
    if (req.user.role !== 'admin' && dossier.sealedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!dossier.packageUrl) {
      return res.status(404).json({
        success: false,
        error: 'Dossier package not available'
      });
    }

    const zipPath = require('path').join(__dirname, '../uploads/dossiers',
      require('path').basename(dossier.packageUrl));

    res.download(zipPath, `court_dossier_${dossier.caseId}_${Date.now()}.zip`);

  } catch (error) {
    console.error('Dossier download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download dossier'
    });
  }
});

/**
 * Download dossier summary PDF
 * GET /api/dossiers/:dossierId/summary
 */
router.get('/:dossierId/summary', verifyToken, async (req, res) => {
  try {
    const { error, value } = dossierIdSchema.validate({ dossierId: req.params.dossierId });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dossier ID'
      });
    }

    const dossier = await courtDossierService.getDossier(value.dossierId);

    // Check access permissions
    if (req.user.role !== 'admin' && dossier.sealedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Generate summary PDF path (assuming it's stored alongside the ZIP)
    const summaryPdfPath = require('path').join(__dirname, '../uploads/dossiers',
      `dossier_summary_${dossier.caseId}_${dossier.sealedAt.getTime()}.pdf`);

    res.download(summaryPdfPath, `dossier_summary_${dossier.caseId}.pdf`);

  } catch (error) {
    console.error('Dossier summary download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download dossier summary'
    });
  }
});

module.exports = router;
