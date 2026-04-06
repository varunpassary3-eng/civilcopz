const pdfkit = require('pdfkit'); 
const fs = require('fs');
const path = require('path');
const dbManager = require('./databaseManager');
const governanceService = require('./governanceService');

const getPrisma = () => dbManager.getReadClient();

/**
 * FilingService: Authority Filing Engine (AFE) V2
 * Converts case evidence into a court-ready litigation package (e-Daakhil compatible).
 */
class FilingService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads');
  }

  /**
   * Generates a formal, eCourts-ready complaint package.
   */
  async generateCourtComplaint(caseId) {
    const caseData = await getPrisma().case.findUnique({
      where: { id: caseId },
      include: { documents: true, events: true }
    });

    if (!caseData) throw new Error('Case not found');

    const snapshot = governanceService.getPecuniarySnapshot(caseData);
    
    // ANNEXURE INDEXING (AFE V2)
    const annexures = (caseData.documents || []).map((doc, index) => ({
      label: `Annexure ${String.fromCharCode(65 + index)}`,
      name: doc.type || 'Evidence Exhibit',
      hash: doc.fileHash.slice(0, 16) + '...',
      url: doc.fileUrl
    }));

    const context = {
      caseId: caseData.id,
      forum: snapshot.forum,
      statutoryFee: snapshot.statutoryFee,
      filingMode: caseData.filingMode || 'BOTH',
      jurisdictionLocation: caseData.jurisdiction || 'Appropriate Commission',
      consumerName: caseData.consumerName,
      consumerAddress: caseData.consumerAddress,
      consumerEmail: caseData.consumerEmail,
      consumerPhone: caseData.consumerPhone,
      company: caseData.company,
      companyAddress: 'Registered Office / Authorized Service Center',
      description: caseData.description,
      considerationPaid: snapshot.considerationPaid,
      finalCompensationValue: snapshot.proposedCompensationAdvocate,
      totalClaimValue: snapshot.finalCourtClaimValue,
      noticeSentDate: caseData.noticeSentAt ? new Date(caseData.noticeSentAt).toLocaleDateString() : 'N/A',
      annexures,
      events: (caseData.events || []).map(e => ({
        timestamp: new Date(e.timestamp).toLocaleString(),
        eventType: e.eventType,
        actor: e.actor
      })),
      todayDate: new Date().toLocaleDateString(),
      city: caseData.jurisdiction || 'New Delhi'
    };

    return new Promise((resolve, reject) => {
      const fileName = `Court_Complaint_${caseId}.pdf`;
      const filePath = path.join(this.uploadsDir, fileName);
      const doc = new pdfkit();
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Page 1: Title & Parties
      doc.fontSize(16).font('Helvetica-Bold').text('BEFORE THE HONORABLE ' + context.forum, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019', { align: 'center', underline: true });
      doc.moveDown(2);

      doc.fontSize(8).fillColor('gray').text(`Case ID: ${caseId} | Substrate: CivilCOPZ-Judicial-v1.5`, { align: 'right' });
      doc.fillColor('black').moveDown();
      
      doc.fontSize(10).font('Helvetica-Bold').text(`In the Matter of:`);
      doc.font('Helvetica').text(`${context.consumerName}, S/o D/o W/o ___________, R/o ${context.consumerAddress}`);
      doc.font('Helvetica-Bold').text(`...Complainant`, { align: 'right' });
      doc.moveDown();
      doc.text(`Versus`, { align: 'center' });
      doc.moveDown();
      doc.text(`${context.company}`);
      doc.font('Helvetica').text(`Address: ${context.companyAddress}`);
      doc.font('Helvetica-Bold').text(`...Opposite Party`, { align: 'right' });
      doc.moveDown(2);

      doc.font('Helvetica-Bold').text('1. JURISDICTION:');
      doc.font('Helvetica').text(`This Hon’ble Commission has the pecuniary jurisdiction to entertain this complaint as the total claim value is ₹${context.totalClaimValue}, which falls within the statutory limits of this Commission. Furthermore, the cause of action substantially arose within the territorial limits of this Hon’ble Commission.`);
      doc.moveDown();

      // Section 1.5: Limitation (Courtroom Admissibility Requirement)
      doc.font('Helvetica-Bold').text('1.5. LIMITATION:');
      doc.font('Helvetica').text('That the present complaint is filed within the period of limitation as prescribed under the Consumer Protection Act, 2019, counting from the date of the Cause of Action.');
      doc.moveDown();

      // Section 2: FILING FEE:
      doc.font('Helvetica-Bold').text('2. FILING FEE:');
      doc.font('Helvetica').text(`The statutory filing fee of ₹${context.statutoryFee} is being paid herewith as per Rule 7 of the Consumer Protection Rules, 2020.`);
      doc.moveDown();
      
      // Section 3: Chronology
      doc.font('Helvetica-Bold').text('3. LIST OF DATES AND EVENTS:');
      context.events.forEach(e => {
        doc.font('Helvetica').text(`${e.timestamp}: ${e.eventType} triggered by ${e.actor}`, { indent: 20 });
      });
      doc.moveDown();
      
      // Section 4: Grounds
      doc.font('Helvetica-Bold').text('4. GROUNDS OF COMPLAINT:');
      doc.font('Helvetica').text(context.description);
      doc.moveDown();
      
      // Section 5: Annexures
      doc.font('Helvetica-Bold').text('5. INDEX OF ANNEXURES:');
      context.annexures.forEach(a => {
        doc.font('Helvetica').text(`${a.label}: ${a.name} (Digital Integrity Hash: ${a.hash})`, { indent: 20 });
      });
      doc.moveDown(2);
      
      // Section 6: Prayer
      doc.font('Helvetica-Bold').text('6. PRAYER:');
      doc.font('Helvetica').text(`The Complainant most respectfully prays that this Hon’ble Commission may be pleased to:`);
      doc.text(`a) Direct the Opposite Party to refund the consideration amount of ₹${context.considerationPaid};`, { indent: 20 });
      doc.text(`b) Award fair compensation of ₹${context.finalCompensationValue} for mental agony and harassment;`, { indent: 20 });
      doc.text(`c) Award litigation costs to the Complainant;`, { indent: 20 });
      doc.text(`d) Pass such other order(s) as this Hon’ble Commission may deem fit in the interest of justice.`, { indent: 20 });
      doc.moveDown(2);
      
      // Section 7: Verification
      doc.font('Helvetica-Bold').text('VERIFICATION:');
      doc.font('Helvetica').text(`Verified at ${context.city} on this ${context.todayDate}, that the contents of paragraphs 1 to 6 of the above complaint are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.`);
      doc.moveDown(3);
      doc.text('__________________', { align: 'right' });
      doc.text('COMPLAINANT', { align: 'right' });
      
      doc.end();

      stream.on('finish', () => resolve(`/uploads/${fileName}`));
      stream.on('error', reject);
    });
  }

  /**
   * Generates a draft supporting Affidavit (Mandatory for e-Daakhil).
   */
  async generateDraftAffidavit(caseId) {
    const caseData = await getPrisma().case.findUnique({ where: { id: caseId } });
    const fileName = `Draft_Affidavit_${caseId}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    const doc = new pdfkit();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(14).font('Helvetica-Bold').text('SUPPORTING AFFIDAVIT', { align: 'center', underline: true });
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').text(`I, ${caseData.consumerName}, S/o D/o ____________, R/o ${caseData.consumerAddress || '___________'}, do hereby solemnly affirm and declare as under:`);
    doc.moveDown();
    doc.text(`1. That I am the Complainant in the accompanying complaint and am well conversant with the facts and circumstances of the case.`);
    doc.text(`2. That the accompanying complaint has been drafted under my instructions and the contents thereof are true and correct to the best of my knowledge.`);
    doc.text(`3. That the annexures attached to the complaint are true copies of their respective originals.`);
    doc.moveDown(4);
    doc.text('__________________', { align: 'right' });
    doc.text('DEPONENT', { align: 'right' });
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text('VERIFICATION:');
    doc.font('Helvetica').text(`Verified at ${caseData.jurisdiction || 'New Delhi'} on ${new Date().toLocaleDateString()}, that the contents of the above affidavit are true and correct to my knowledge.`);
    doc.moveDown(4);
    doc.text('__________________', { align: 'right' });
    doc.text('DEPONENT', { align: 'right' });
    doc.end();

    return new Promise((resolve) => stream.on('finish', () => resolve(`/uploads/${fileName}`)));
  }

  /**
   * Generates a draft Vakalatnama (Power of Attorney).
   */
  async generateDraftVakalatnama(caseId) {
    const caseData = await getPrisma().case.findUnique({ where: { id: caseId } });
    const fileName = `Draft_Vakalatnama_${caseId}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    const doc = new pdfkit();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(14).font('Helvetica-Bold').text('VAKALATNAMA', { align: 'center', underline: true });
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').text(`KNOW ALL to whom these presents shall come that I, ${caseData.consumerName}, do hereby appoint and retain _______________ (Advocate) to appear, plead, and act for me in the matter of Case ID: ${caseId}.`);
    doc.moveDown();
    doc.text(`I hereby authorize the Advocate to sign all papers, petitions, and applications, and to represent me before the Honorable Commission in all proceedings.`);
    doc.moveDown(6);
    doc.text('__________________', { align: 'left' });
    doc.text('ADVOCATE', { align: 'left' });
    doc.text('__________________', { align: 'right' });
    doc.text('CLIENT/COMPLAINANT', { align: 'right' });
    doc.end();

    return new Promise((resolve) => stream.on('finish', () => resolve(`/uploads/${fileName}`)));
  }

  /**
   * Bundles the complaint and evidence exhibits for the UI. (AFE V3)
   */
  async getLitigationPackage(caseId) {
    const caseData = await getPrisma().case.findUnique({
      where: { id: caseId },
      include: { documents: true, events: true }
    });

    if (!caseData) throw new Error('Case not found');

    // Parallel Generation of Court Substrate
    const [complaintUrl, affidavitUrl, vakalatnamaUrl] = await Promise.all([
      this.generateCourtComplaint(caseId),
      this.generateDraftAffidavit(caseId),
      this.generateDraftVakalatnama(caseId)
    ]);

    // Filter evidence into Annexures
    const exhibits = (caseData.documents || []).map((doc, idx) => ({
      annexure: `Annexure ${String.fromCharCode(65 + idx)}`,
      name: doc.type || 'Evidence Exhibit',
      url: doc.fileUrl,
      hash: doc.fileHash
    }));

    return {
      caseId,
      complaintUrl,
      affidavitUrl,      // NEW
      vakalatnamaUrl,    // NEW
      exhibits,          // Categorized exhibits
      statutoryFee: governanceService.calculateFilingFee(caseData.finalCourtClaimValue || 0),
      filingMode: caseData.filingMode || 'BOTH',
      reviewStatus: caseData.reviewStatus || 'PENDING'
    };
  }
}

module.exports = new FilingService();
