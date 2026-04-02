const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const companyController = require('../controllers/companyController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { validate, validateFile, createCaseSchema, updateStatusSchema, fileUploadSchema } = require('../middleware/validation');
const audit = require('../middleware/audit');
const legalCompliance = require('../services/legalComplianceService');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Enhanced file upload configuration with security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // Generate secure filename with hash
    const hash = crypto.createHash('sha256').update(Date.now().toString()).digest('hex').substring(0, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `case-${hash}${ext}`);
  },
});

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
    files: 1, // Only one file per request
  },
  fileFilter,
  // Add file size validation in bytes
  onFileUploadStart: function(file, req, res) {
    if (file.size > 5 * 1024 * 1024) {
      return false;
    }
  }
});

// Request timing middleware for audit logs
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Routes with audit logging
router.get('/', audit('VIEW_CASES'), caseController.getCases);
router.get('/company/stats', audit('VIEW_COMPANY_STATS'), companyController.getCompanyStatsSummary);
router.get('/company/catalogue', audit('VIEW_COMPANY_CATALOGUE'), companyController.getCompanyCatalogue);
router.get('/:id', audit('VIEW_CASE_DETAIL'), caseController.getCaseById);

router.post('/',
  verifyToken,
  audit('CREATE_CASE'),
  upload.single('file'),
  validate(createCaseSchema),
  validateFile(fileUploadSchema),
  caseController.createCase
);

router.patch('/:id/status',
  verifyToken,
  requireAdmin,
  audit('UPDATE_CASE_STATUS'),
  validate(updateStatusSchema),
  caseController.updateCaseStatus
);

module.exports = router;
