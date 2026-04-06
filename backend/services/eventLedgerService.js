const crypto = require('crypto');
const dbManager = require('./databaseManager');

const getPrisma = () => dbManager.getWriteClient();

/**
 * CaseEventLedger: Litigation-Grade Procedural Tracking
 * Implements an append-only, hash-linked ledger for court-grade defensibility.
 */
class CaseEventLedger {
  /**
   * Records a new procedural event in the ledger.
   * @param {string} caseId 
   * @param {string} eventType - NOTICE_SENT, NOTICE_READ, NOTICE_EXPIRED, etc.
   * @param {object} payload - Metadata (IP, Browser info, etc.)
   * @param {string} actor - SYSTEM, USER, COMPANY
   * @param {string} source - API, CRON, SOCKET
   * @param {object} tx - Optional Prisma Transaction Client
   */
  async recordEvent(caseId, eventType, payload = {}, actor = 'SYSTEM', source = 'API', tx = null) {
    const executeLogic = async (transactionalClient) => {
      // 1. Fetch the last event for this case to link the hash
      const lastEvent = await transactionalClient.caseEvent.findFirst({
        where: { caseId },
        orderBy: { timestamp: 'desc' }
      });

      // 1.5. IDEMPOTENCY GUARD
      if (lastEvent && lastEvent.eventType === eventType) {
        const lastTs = new Date(lastEvent.timestamp).getTime();
        const nowTs = new Date().getTime();
        if (nowTs - lastTs < 5000) {
          console.warn(`[LEDGER_IDEMPOTENCY] Duplicate event ${eventType} suppressed.`);
          return lastEvent;
        }
      }

      const prevHash = lastEvent ? lastEvent.hash : 'GENESIS_LITIGATION_EVENT';
      const timestamp = new Date().toISOString();

      // 2. Generate Hash
      const hashContent = `${prevHash}|${JSON.stringify(payload)}|${eventType}|${actor}|${timestamp}`;
      const hash = crypto.createHash('sha256').update(hashContent).digest('hex');

      // 3. Persist the event
      const event = await transactionalClient.caseEvent.create({
        data: {
          caseId,
          eventType,
          payload: payload || {},
          actor,
          source,
          prevHash,
          hash,
          timestamp: new Date(timestamp)
        }
      });

      console.log(`[LEDGER_APPEND] Case: ${caseId} | Event: ${eventType} | Hash: ${hash.slice(0, 8)}`);
      return event;
    };

    // Use passed transaction or create a new one
    if (tx) {
      return await executeLogic(tx);
    } else {
      return await getPrisma().$transaction(executeLogic);
    }
  }

  /**
   * Verifies the integrity of the entire event chain for a case.
   */
  async verifyChain(caseId) {
    const events = await getPrisma().caseEvent.findMany({
      where: { caseId },
      orderBy: { timestamp: 'asc' }
    });

    let isValid = true;
    let expectedPrevHash = 'GENESIS_LITIGATION_EVENT';

    for (const event of events) {
      if (event.prevHash !== expectedPrevHash) {
        isValid = false;
        break;
      }
      
      const hashContent = `${event.prevHash}|${JSON.stringify(event.payload)}|${event.eventType}|${event.actor}|${event.timestamp.toISOString()}`;
      const calculatedHash = crypto.createHash('sha256').update(hashContent).digest('hex');
      
      if (event.hash !== calculatedHash) {
        isValid = false;
        break;
      }
      
      expectedPrevHash = event.hash;
    }

    return isValid;
  }

  /**
   * Records a global infrastructure resilience event (v11.0)
   */
  async recordSystemEvent(eventType, payload = {}, nodeId = null) {
    const prisma = getPrisma();
    
    try {
      // 1. Fetch the last system event to link the chain
      const lastEvent = await prisma.systemEvent.findFirst({
        orderBy: { timestamp: 'desc' }
      });

      const prevHash = lastEvent ? lastEvent.hash : 'GENESIS_SYSTEM_INFRA_EVENT';
      const timestamp = new Date().toISOString();

      // 2. Generate Bit-Perfect Hash (v11.0)
      const hashContent = `${prevHash}|${JSON.stringify(payload)}|${eventType}|${nodeId}|${timestamp}`;
      const hash = crypto.createHash('sha256').update(hashContent).digest('hex');

      // 3. Persist the record
      return await prisma.systemEvent.create({
        data: {
          eventType,
          payload: payload || {},
          nodeId: nodeId || process.env.HOSTNAME,
          prevHash,
          hash,
          timestamp: new Date(timestamp)
        }
      });
    } catch (error) {
      console.error('❌ [LEDGER_SYSTEM_FAILURE] Failed to audit infrastructure event:', error.message);
      return null;
    }
  }
}

module.exports = new CaseEventLedger();
