const { z } = require('zod');

// User validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['consumer', 'admin']).default('consumer'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Case validation schemas
const createCaseSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  company: z.string().min(2).max(100),
  category: z.enum(['Telecom', 'Banking', 'Insurance', 'E-Commerce', 'Other']),
  jurisdiction: z.enum(['District', 'State', 'National']),
});

const updateStatusSchema = z.object({
  status: z.enum(['Pending', 'Review', 'Resolved']),
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
    if (!req.file) {
      return res.status(400).json({
        error: 'File is required'
      });
    }

    try {
      const validatedFile = schema.parse(req.file);
      req.validatedFile = validatedFile;
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
