const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const companyController = require('../controllers/companyController');
const { verifyToken } = require('../middleware/auth');
const { validate, validateFile, createCaseSchema, fileUploadSchema } = require('../middleware/validation');
const audit = require('../middleware/audit');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Enhanced file upload configuration with security
// Sovereign memory storage for Direct-to-S3 streaming
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Enhanced MIME type and extension validation
  const allowedMimes = ['application/pdf'];
  const allowedExtensions = ['.pdf'];

  const mimeValid = allowedMimes.includes(file.mimetype);
  const extValid = allowedExtensions.includes(path.extname(file.originalname).toLowerCase());

  if (mimeValid && extValid) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed. Invalid file type or extension.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5, // Support multiple documents
  },
  fileFilter
});

// Request timing middleware for audit logs
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Routes with audit logging
router.get('/', audit('VIEW_CASES'), caseController.getCases);
router.get('/company/stats', audit('VIEW_COMPANY_STATS'), caseController.companyStats);
router.get('/:id', audit('VIEW_CASE_DETAIL'), caseController.getCaseById);

router.post('/',
  verifyToken,
  audit('CREATE_CASE'),
  upload.array('documents', 5), 
  validate(createCaseSchema),
  validateFile(fileUploadSchema),
  caseController.createCase
);

router.patch('/:id/status',
  verifyToken,
  audit('UPDATE_CASE_STATUS'),
  caseController.updateCaseStatus
);

router.patch('/:id/satisfaction',
  verifyToken,
  audit('SET_SATISFACTION'),
  caseController.setSatisfaction
);

// JUDICIAL INTERFACE & AUTHORITY FILING ENGINE (AFE)
router.patch('/:id/rectify-pecuniary', verifyToken, audit('RECTIFY_PECUNIARY'), caseController.rectifyPecuniary);
router.post('/:id/review', verifyToken, audit('PROFESSIONAL_REVIEW'), caseController.submitProfessionalReview);
router.get('/:id/filing-package', verifyToken, audit('GENERATE_FILING_PACKAGE'), caseController.getFilingPackage);
router.patch('/:id/filing-mode', verifyToken, audit('UPDATE_FILING_PREFERENCE'), caseController.updateFilingMode);
router.get('/:id/complaint', audit('VIEW_FORMAL_COMPLAINT'), caseController.streamComplaint);

module.exports = router;
