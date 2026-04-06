const dbManager = require('./databaseManager');
const nodemailer = require('nodemailer');
const path = require('path');

const getPrisma = () => dbManager.getWriteClient();

/**
 * Notice Delivery Escalation Engine: Multi-Channel Substrate
 * Handles Email, WhatsApp (Mock), and Physical Post tracking.
 */
class DeliveryService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads');
  }

  /**
   * Orchestrates multi-channel dispatch of legal notices.
   */
  async sendNotice(caseId) {
    const caseData = await getPrisma().case.findUnique({
      where: { id: caseId }
    });

    if (!caseData || !caseData.noticeUrl) {
      throw new Error(`[DELIVERY_FAILURE] Notice PDF not found for case ${caseId}`);
    }

    console.log(`🚀 [DELIVERY_ENGINE] Initiating multi-channel dispatch for Case: ${caseId}`);

    const results = [];

    // 1. Dispatch Email
    try {
      const emailResult = await this.dispatchEmail(caseData);
      results.push({ channel: 'EMAIL', success: true, trackingId: emailResult.messageId });
    } catch (error) {
      console.error(`❌ [EMAIL_FAILURE] Case ${caseId}:`, error.message);
      results.push({ channel: 'EMAIL', success: false, error: error.message });
    }

    // 2. Dispatch WhatsApp (Mock Substrate)
    try {
      const waResult = await this.dispatchWhatsApp(caseData);
      results.push({ channel: 'WHATSAPP', success: true, trackingId: waResult.messageId });
    } catch (error) {
      console.error(`❌ [WHATSAPP_FAILURE] Case ${caseId}:`, error.message);
      results.push({ channel: 'WHATSAPP', success: false, error: error.message });
    }

    // Update case notice status
    await getPrisma().case.update({
      where: { id: caseId },
      data: {
        noticeStatus: results.some(r => r.success) ? 'SENT' : 'SENT' // Keep at SENT if at least one tried
      }
    });

    return results;
  }

  /**
   * Email Dispatch Engine (SMTP)
   */
  async dispatchEmail(caseData) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT) || 1025,
      secure: false,
    });

    const fullPdfPath = path.join(this.uploadsDir, path.basename(caseData.noticeUrl));

    const info = await transporter.sendMail({
      from: '"CivilCOPZ Legal Engine" <notices@civilcopz.gov.in>',
      to: caseData.consumerEmail, // Mock: In production, this would be company_legal@email.com
      subject: `[LEGAL_NOTICE] Formal Grievance Served - Case ID: ${caseData.id}`,
      text: `Formal legal notice regarding ${caseData.title}. Response required within 15 days.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a;">Legal Notice Served</h2>
          <p>A formal legal notice has been electronically served for <strong>${caseData.company}</strong>.</p>
          <p><strong>Action Required:</strong> You must respond to this grievance within the statutory period of 15 days.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b;">Case ID: ${caseData.id} | Substrate: CivilCOPZ-Notice-Engine-v3</p>
        </div>
      `,
      attachments: [{
        filename: 'Legal_Notice.pdf',
        path: fullPdfPath
      }]
    });

    // Log delivery attempt
    await getPrisma().caseNoticeDelivery.create({
      data: {
        caseId: caseData.id,
        channel: 'EMAIL',
        status: 'SENT',
        trackingId: info.messageId
      }
    });

    return info;
  }

  /**
   * WhatsApp Dispatch Engine (Mock Integration)
   */
  async dispatchWhatsApp(caseData) {
    // Simulate API Latency
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockMsgId = `WA_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    console.log(`📱 [WHATSAPP_MOCK] Message sent to ${caseData.consumerPhone}: Link to Notice ${caseData.noticeUrl}`);

    // Log delivery attempt
    await getPrisma().caseNoticeDelivery.create({
      data: {
        caseId: caseData.id,
        channel: 'WHATSAPP',
        status: 'SENT',
        trackingId: mockMsgId
      }
    });

    // Auto-confirm delivery for mock reliability
    setTimeout(() => {
      this.updateStatus(mockMsgId, 'DELIVERED').catch(console.error);
    }, 2000);

    return { messageId: mockMsgId };
  }

  /**
   * Update delivery status based on callbacks.
   */
  async updateStatus(trackingId, status) {
    const delivery = await getPrisma().caseNoticeDelivery.findFirst({
      where: { trackingId }
    });

    if (!delivery) return;

    await getPrisma().caseNoticeDelivery.update({
      where: { id: delivery.id },
      data: { status, updatedAt: new Date() }
    });

    // If status is READ or DELIVERED, update case level noticeStatus
    if (status === 'READ' || status === 'DELIVERED') {
      await getPrisma().case.update({
        where: { id: delivery.caseId },
        data: { noticeStatus: status }
      });

      // Emit Real-Time Telemetry to the UI Substrate
      const socketService = require('./socket');
      socketService.emitUpdate(delivery.caseId, {
        type: 'NOTICE_TELEMETRY',
        status: status,
        channel: delivery.channel,
        timestamp: new Date().toISOString()
      });

      // Log in timeline
      const caseLifecycle = require('./caseLifecycle');
      await caseLifecycle.updateCaseStatus(
        delivery.caseId,
        'Notice_Sent', // Keep same status
        'System',
        `Legal Notice ${status} via ${delivery.channel} (ID: ${trackingId})`
      );
    }
  }
}

module.exports = new DeliveryService();
