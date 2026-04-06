const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const handlebars = require('handlebars');
const dbManager = require('./databaseManager');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const getPrisma = () => dbManager.getWriteClient();

class LegalService {
  constructor() {
    this.statutoryDays = 15;
    this.templatePath = path.join(__dirname, '../templates/legalNotice.hbs');
    this.uploadsDir = path.join(__dirname, '../uploads');
  }

  async generateLegalNoticePDF(caseId) {
    const caseData = await getPrisma().case.findUnique({
      where: { id: caseId },
      include: { reporter: true }
    });

    if (!caseData) throw new Error('Case not found');

    const templateSource = fs.readFileSync(this.templatePath, 'utf8');
    const template = handlebars.compile(templateSource);

    const context = {
      date: new Date().toLocaleDateString('en-IN'),
      company: caseData.company,
      jurisdiction: caseData.jurisdiction,
      title: caseData.title,
      description: caseData.description,
      consumerName: caseData.consumerName,
      consumerAddress: caseData.consumerAddress,
      claimAmount: caseData.claimAmount?.toLocaleString('en-IN'),
      caseId: caseData.id,
      timestamp: new Date().toISOString()
    };

    const html = template(context);
    const fileName = `notice_${caseId}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);
      
      // Simple HTML to PDF logic (pdfkit doesn't support full HTML, so we extract text or use a simple layout)
      // For a more robust HTML->PDF, we would use puppeteer, but pdfkit is lightweight.
      // We'll manually layout the notice to match the template's structure.
      
      doc.fontSize(20).text('LEGAL NOTICE', { align: 'center', underline: true });
      doc.moveDown(2);
      
      doc.fontSize(12).text(`Date: ${context.date}`, { align: 'right' });
      doc.moveDown();
      
      doc.text('To,');
      doc.text('The Manager / Authorized Officer,');
      doc.font('Helvetica-Bold').text(context.company);
      doc.font('Helvetica').text(`${context.jurisdiction} Commission Area`);
      doc.moveDown(2);
      
      doc.font('Helvetica-Bold').text(`Subject: Legal Notice under Section 2(11) / 2(47) of the Consumer Protection Act, 2019 regarding ${context.title}.`, { underline: true });
      doc.moveDown(2);
      
      doc.font('Helvetica').text('Sir/Madam,', { align: 'left' });
      doc.moveDown();
      doc.text(`Under instructions from my client ${context.consumerName}, residing at ${context.consumerAddress}, I hereby serve upon you the following notice:`);
      doc.moveDown();
      
      doc.font('Helvetica-Bold').text('1. FACTS OF THE MATTER:');
      doc.font('Helvetica').text(context.description, { align: 'justify' });
      doc.moveDown();
      
      doc.font('Helvetica-Bold').text('2. LEGAL GROUNDS:');
      doc.font('Helvetica').text('a) That the aforementioned acts constitute a clear "Deficiency in Service" under Section 2(11) of the Consumer Protection Act, 2019.');
      doc.text('b) That the failure to resolve my client\'s grievance constitutes an "Unfair Trade Practice" under Section 2(47) of the Act.');
      doc.moveDown();
      
      doc.font('Helvetica-Bold').text('3. RELIEF SOUGHT:');
      doc.font('Helvetica').text('You are hereby called upon to:');
      doc.list([
        `Resolve the grievance and refund/replace as applicable (Claim: ₹${context.claimAmount}).`,
        'Provide compensation for mental agony and harassment.',
        'Pay litigation costs towards this legal notice.'
      ]);
      doc.moveDown();
      
      doc.text(`You are hereby called upon to resolve this matter within 15 days from receipt of this notice, failing which my client shall initiate legal proceedings under the Consumer Protection Act, 2019 before the appropriate Consumer Commission.`);
      doc.moveDown();
      
      doc.text('This is without prejudice to all other legal rights of my client.');
      doc.moveDown(3);
      
      doc.text('Sincerely,');
      doc.font('Helvetica-Bold').text('[Electronically Generated via CivilCOPZ]');
      doc.font('Helvetica').text('Legal Compliance Substrate v3.0');
      
      doc.end();

      stream.on('finish', async () => {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        // Update case with notice details
        await getPrisma().case.update({
          where: { id: caseId },
          data: {
            noticeUrl: `/uploads/${fileName}`,
            noticeHash: hash,
            noticeSentAt: new Date(),
            noticeDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            status: 'Notice_Sent'
          }
        });
        
        resolve({ filePath, fileName, hash });
      });

      stream.on('error', reject);
    });
  }

  async dispatchNotice(caseId) {
    const deliveryService = require('./deliveryService');
    return await deliveryService.sendNotice(caseId);
  }
}

module.exports = new LegalService();
