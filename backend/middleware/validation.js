const { z } = require('zod');

// User validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['consumer', 'admin', 'ADVOCATE']).default('consumer'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Case validation schemas
const createCaseSchema = z.object({
  // Consumer Details
  consumerName: z.string().min(2).max(100),
  consumerEmail: z.string().email(),
  consumerPhone: z.string().min(10).max(15),
  consumerAddress: z.string().min(10).max(500),

  // Case Details
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  company: z.string().min(2).max(100),
  category: z.enum(['Telecom', 'Banking', 'Insurance', 'E-Commerce', 'Other']),
  jurisdiction: z.enum(['District', 'State', 'National']),
  
  // Pecuniary Fields (Handled via Multer Strings)
  considerationPaid: z.coerce.number().nonnegative().optional(),
  expectedCompensationClient: z.coerce.number().nonnegative().optional(),
  
  // Legal Declaration (Coerced from Multer String)
  isDeclaredTrue: z.coerce.boolean().refine(val => val === true, {
    message: "You must accept the legal declaration to proceed."
  }),
  declaredName: z.string().min(2).max(100),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'Draft', 'Submitted', 'Under_Review', 'Notice_Sent', 
    'Company_Responded', 'Negotiation_Mediation', 'Escalated_to_Authority', 
    'Court_Filed', 'Judgment_Issued', 'Resolved', 
    'Satisfaction_Confirmed', 'Closed'
  ]),
  actionDescription: z.string().optional(),
});

// File validation schema
const fileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string().refine(val => val === 'application/pdf', {
    message: 'Only PDF files are allowed'
  }),
  size: z.number().max(5 * 1024 * 1024), // 5MB max
});

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      next(error);
    }
  };
}

// File validation middleware
function validateFile(schema) {
  return (req, res, next) => {
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
      // Phase 12: File is now optional for Draft/Submitted stages
      return next();
    }

    try {
      const validatedFiles = files.map(file => schema.parse(file));
      req.validatedFile = req.file ? validatedFiles[0] : null;
      req.validatedFiles = validatedFiles;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          error: 'File validation failed',
          details: errors,
        });
      }
      next(error);
    }
  };
}

module.exports = {
  validate,
  validateFile,
  registerSchema,
  loginSchema,
  createCaseSchema,
  updateStatusSchema,
  fileUploadSchema,
};
