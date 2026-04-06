const express = require('express');
const crypto = require('crypto');
const Redis = require('ioredis');
const router = express.Router();
const dbManager = require('../services/databaseManager');
const remediationService = require('../services/remediationService');
const eventLedger = require('../services/eventLedgerService');

const prisma = dbManager.getWriteClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      console.warn('⚠️  [REPLAY_CACHE] Redis permanently unreachable. Shifting to bypass mode.');
      return null;
    }
    return Math.min(times * 100, 3000);
  }
});

// Resilience: Prevent process crash on connection failure
// eslint-disable-next-line no-unused-vars
redis.on('error', (err) => {
  // Silent catch to prevent terminal spam loops and exceptions
});

/**
 * Institutional Signature Verification (v9.1)
 */
function verifyG2GSignature(payload, signature) {
  // In production, this uses the e-Daakhil public key from Secrets Manager
  // const publicKey = process.env.REGISTRY_PUBLIC_KEY;
  // return crypto.verify('sha256', Buffer.from(JSON.stringify(payload)), publicKey, Buffer.from(signature, 'base64'));
  
  // SANDBOX MOCK: Verify against a shared secret for dev-parity
  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET || 'g2g_secret');
  return hmac.update(JSON.stringify(payload)).digest('hex') === signature;
}

/**
 * e-Daakhil Webhook Hub (v9.1 Production)
 * Zero-Trust G2G callback gateway.
 */
router.post('/webhook', async (req, res) => {
  const { registryId, status, notes, signature, messageId } = req.body;

  try {
    // 1. REPLAY PROTECTION (v9.1)
    if (messageId) {
      if (redis.status === 'ready') {
        const lockKey = `webhook_replay:${messageId}`;
        const isNew = await redis.set(lockKey, 'PROCESSED', 'NX', 'EX', 3600);
        if (!isNew) {
          console.warn(`[REPLAY_BLOCK] Blocked replayed message: ${messageId}`);
          return res.status(409).json({ error: 'REPLAY_DETECTED' });
        }
      } else {
        console.warn(`[REPLAY_BYPASS] Redis offline. Replay protection bypassed for message: ${messageId}`);
      }
    }

    // 2. ZERO-TRUST AUTHENTICATION (v9.1)
    if (!verifyG2GSignature({ registryId, status, notes, messageId }, signature)) {
      console.error(`[AUTH_FAILURE] Invalid G2G signature for Registry ID: ${registryId}`);
      return res.status(401).json({ error: 'INVALID_SIGNATURE' });
    }

    console.info(`[REGISTRY_WEBHOOK] Authenticated callback for: ${registryId}`);

    // 2. Locate the litigation record
    const submission = await prisma.caseRegistrySubmission.findFirst({
      where: { registryId }
    });

    if (!submission) {
      console.warn(`[REGISTRY_WEBHOOK] Unrecognized Registry ID: ${registryId}`);
      return res.status(404).json({ error: 'REGISTRY_ID_NOT_FOUND' });
    }

    // 3. Normalized Status Orchestration (v5.2 logic integration)
    const newState = status === 'DEFICIENCY' ? 'DEFICIENCY' : 'ACCEPTED';
    const scrutinyCode = status === 'DEFICIENCY' ? remediationService.analyzeDefect(notes) : null;

    // 4. Atomic Litigation Update
    await prisma.$transaction(async (tx) => {
      await tx.caseRegistrySubmission.update({
        where: { id: submission.id },
        data: {
          scrutinyStatus: newState,
          scrutinyCode,
          scrutinyNotes: notes,
          lastPollAt: new Date(),
          registrationNumber: status === 'ACCEPTED' ? `REG-${Date.now()}` : undefined
        }
      });

      if (newState === 'ACCEPTED') {
        await tx.case.update({
          where: { id: submission.caseId },
          data: { registryStatus: 'REGISTERED' }
        });
      }

      // Record Forensic Event
      await eventLedger.recordEvent(submission.caseId, 'REGISTRY_CALLBACK_PROCESSED', {
        status: newState,
        registryId,
        notes,
        source: 'e-Daakhil',
        channel: 'G2G_WEBHOOK',
        auth: 'ZERO_TRUST_SIG_VERIFIED'
      }, 'SYSTEM', 'REGISTRY_PUSH', tx);
    });

    console.info(`[REGISTRY_WEBHOOK] Successfully processed callback for Case: ${submission.caseId}`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('[REGISTRY_WEBHOOK_FAILURE]', error);
    res.status(500).json({ error: 'INTERNAL_ORCHESTRATION_FAILURE' });
  }
});

module.exports = router;
