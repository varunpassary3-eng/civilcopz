const { 
  createCaseSchema, 
  registerSchema, 
  fileUploadSchema 
} = require('../../backend/middleware/validation');

describe('Input Validation Substrate (Zod)', () => {

    describe('KYC & Case Validation (createCaseSchema)', () => {
        test('should accept valid case data', () => {
            const validData = {
                consumerName: 'Ravi Kumar',
                consumerEmail: 'ravi@example.com',
                consumerPhone: '9876543210',
                consumerAddress: '123, Sector 5, New Delhi 110001',
                title: 'Defective Laptop from Escalation Corp',
                description: 'The laptop Screen flickering starts within 5 days of purchase.',
                company: 'Escalation Corp',
                category: 'E-Commerce',
                jurisdiction: 'District',
                considerationPaid: 50000,
                expectedCompensationClient: 100000,
                isDeclaredTrue: 'true', // Test coercion
                declaredName: 'Ravi Kumar'
            };

            const result = createCaseSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        test('should reject incomplete identity (missing consumerName)', () => {
            const invalidData = {
                consumerEmail: 'ravi@example.com',
                title: 'Valid Title',
                description: 'Valid Description that is long enough',
                company: 'Test Corp',
                category: 'Other',
                jurisdiction: 'National',
                isDeclaredTrue: 'true',
                declaredName: 'Ravi'
            };

            const result = createCaseSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            expect(result.error.issues.some(i => i.path.includes('consumerName'))).toBe(true);
        });

        test('should reject invalid email format', () => {
            const invalidData = {
                consumerName: 'Test',
                consumerEmail: 'not-an-email',
                // ... rest of data
            };
            const result = createCaseSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            expect(result.error.issues.some(i => i.path.includes('consumerEmail'))).toBe(true);
        });

        test('should reject if legal declaration is false', () => {
            const invalidData = {
                // ... valid data
                isDeclaredTrue: 'false',
                declaredName: 'Test'
            };
            const result = createCaseSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('File Integrity Validation (fileUploadSchema)', () => {
        test('should accept PDF files under 5MB', () => {
            const validFile = {
                fieldname: 'documents',
                originalname: 'invoice.pdf',
                encoding: '7bit',
                mimetype: 'application/pdf',
                size: 2 * 1024 * 1024 // 2MB
            };
            const result = fileUploadSchema.safeParse(validFile);
            expect(result.success).toBe(true);
        });

        test('should reject non-PDF files', () => {
            const invalidFile = {
                mimetype: 'image/jpeg',
                size: 1024
            };
            const result = fileUploadSchema.safeParse(invalidFile);
            expect(result.success).toBe(false);
            expect(result.error.issues.some(i => i.message.includes('Only PDF files are allowed'))).toBe(true);
        });

        test('should reject files over 5MB', () => {
            const oversizedFile = {
                mimetype: 'application/pdf',
                size: 6 * 1024 * 1024 // 6MB
            };
            const result = fileUploadSchema.safeParse(oversizedFile);
            expect(result.success).toBe(false);
        });
    });

});
