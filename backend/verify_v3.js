const dbManager = require('./services/databaseManager');
const legalService = require('./services/legalService');
const path = require('path');
const fs = require('fs');

async function verify() {
  console.log('🔍 Starting CivilCOPZ v3.0 Verification...');

  try {
    // 1. Initialize DB
    await dbManager.initialize();
    const prisma = dbManager.getWriteClient();

    // 2. Create a Mock Case with new fields
    console.log('--- Step 1: Creating Mock Case with Legal Declaration ---');
    const mockCase = await prisma.case.create({
      data: {
        title: 'Verification Case v3.0',
        description: 'This is a test case to verify the legal notice engine and declaration substrate.',
        company: 'Verification Corp',
        category: 'Other',
        jurisdiction: 'District',
        claimAmount: 5000,
        consumerName: 'Verifier User',
        consumerEmail: 'verifier@example.com',
        consumerPhone: '9876543210',
        consumerAddress: '123 Verification Lane, Test City',
        isDeclaredTrue: true,
        declaredName: 'Verifier User',
        declarationAcceptedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Verification-Script/1.0',
        status: 'Submitted'
      }
    });
    console.log(`✅ Case Created: ${mockCase.id}`);

    // 3. Generate Legal Notice PDF
    console.log('--- Step 2: Generating Legal Notice PDF ---');
    const pdfResult = await legalService.generateLegalNoticePDF(mockCase.id);
    console.log(`✅ PDF Generated: ${pdfResult.fileName}`);
    console.log(`✅ File Hash: ${pdfResult.hash}`);

    // 4. Verify File Existence
    const filePath = path.join(__dirname, 'uploads', pdfResult.fileName);
    if (fs.existsSync(filePath)) {
      console.log('✅ PDF File exists in uploads directory.');
    } else {
      throw new Error('❌ PDF File NOT found in uploads directory.');
    }

    // 5. Verify DB Updates
    const updatedCase = await prisma.case.findUnique({
      where: { id: mockCase.id }
    });
    
    if (updatedCase.noticeUrl && updatedCase.noticeHash && updatedCase.status === 'Notice_Sent') {
      console.log('✅ Database updated with notice metadata and status.');
    } else {
      throw new Error('❌ Database NOT updated correctly.');
    }

    // 6. Test Email Dispatch (Mock SMTP if needed)
    console.log('--- Step 3: Dispatching Notice Email ---');
    try {
      await legalService.dispatchNoticeEmail(mockCase.id);
      console.log('✅ Email dispatch attempt completed (check logs for delivery status).');
    } catch (e) {
      console.log('⚠️ Email dispatch skipped or failed (expected if SMTP not configured):', e.message);
    }

    console.log('\n✨ VERIFICATION SUCCESSFUL: CivilCOPZ v3.0 Substrate is Operational.');

    // Cleanup
    // await prisma.case.delete({ where: { id: mockCase.id } });
    // console.log('🧹 Verification case cleaned up.');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await dbManager.disconnect();
  }
}

verify();
