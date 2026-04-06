const { PrismaClient } = require('@prisma/client');
const { URL } = require('url');
const alertingService = require('./alertingService');
const resilienceService = require('./resilienceService');
const cacheService = require('./cacheService');
const eventLedger = require('./eventLedgerService');

function allowMockFallback() {
  if (process.env.ALLOW_MOCK_DB_FALLBACK !== undefined) {
    return process.env.ALLOW_MOCK_DB_FALLBACK === 'true';
  }
  return !['production', 'staging'].includes(process.env.NODE_ENV);
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!process.env.DB_HOST) return undefined;

  const databaseUrl = new URL('postgresql://localhost');
  databaseUrl.hostname = process.env.DB_HOST;
  databaseUrl.port = process.env.DB_PORT || '5432';
  databaseUrl.username = process.env.DB_USER || 'civilcopz_user';
  databaseUrl.password = process.env.DB_PASSWORD || '';
  databaseUrl.pathname = `/${process.env.DB_NAME || 'civilcopz'}`;

  if (process.env.DB_SCHEMA) {
    databaseUrl.searchParams.set('schema', process.env.DB_SCHEMA);
  }
  return databaseUrl.toString();
}

/**
 * DatabaseManager: Chaos-Resilient Infrastructure Substrate
 * Automates multi-region failover and replica promotion (v10.0).
 */
class DatabaseManager {
  constructor() {
    this.writeClient = null;
    this.readClients = [];
    this.isInitialized = false;
    this.isMock = false;
    this.failureCount = 0;
    this.primaryEpoch = 0; // v11.0 Fencing Token
  }

  async initialize() {
    if (this.isInitialized) return;

    const databaseUrl = resolveDatabaseUrl();
    const readReplicas = process.env.DATABASE_READ_REPLICAS?.split(',') || [];

    if (!databaseUrl) {
      throw new Error('DATABASE_URL or DB_HOST must be configured');
    }

    this.writeClient = new PrismaClient({
      datasourceUrl: databaseUrl,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    for (const replicaUrl of readReplicas) {
      const readClient = new PrismaClient({
        datasourceUrl: replicaUrl,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
      this.readClients.push(readClient);
    }

    try {
      await this.writeClient.$connect();
      console.log('✅ Write database connected');
      this.isInitialized = true;
    } catch (error) {
      console.warn('⚠️  Primary database failed. Switching to resilient fallback.');
      if (!allowMockFallback()) throw error;
      
      this.writeClient = this.createMockPrismaClient();
      this.isInitialized = true;
      this.isMock = true;
    }
  }

  createMockPrismaClient() {
    // Consolidated Mock Substrate (Phase 16) - Industrial Representative Data
    const mockCases = [
      {
        id: 'mock-1',
        title: 'Unauthorized Premium Deduction',
        company: 'Reliance General Insurance',
        status: 'Under_Review',
        category: 'Insurance',
        jurisdiction: 'Mumbai South',
        createdAt: new Date(),
        updatedAt: new Date(),
        noticeStatus: 'SENT'
      },
      {
        id: 'mock-2',
        title: 'Billing Discrepancy - Phase III',
        company: 'Adani Electricity',
        status: 'Notice_Sent',
        category: 'Utilities',
        jurisdiction: 'Mumbai West',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(),
        noticeStatus: 'DELIVERED'
      },
      {
        id: 'mock-3',
        title: 'Defective Appliance - Refund Refusal',
        company: 'Tata Croma',
        status: 'Submitted',
        category: 'Consumer_Goods',
        jurisdiction: 'Pune Central',
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(),
        noticeStatus: 'PENDING'
      }
    ];

    const mockCompanies = [
      { id: 'c1', name: 'Reliance General Insurance', totalCases: 1, category: 'Insurance' },
      { id: 'c2', name: 'Adani Electricity', totalCases: 1, category: 'Utilities' },
      { id: 'c3', name: 'Tata Croma', totalCases: 1, category: 'Consumer_Goods' }
    ];

    const matchesFilter = (item, where) => {
      if (!where) return true;
      let matched = true;

      for (const [key, value] of Object.entries(where)) {
        if (key === 'OR') {
          if (!Array.isArray(value)) continue;
          matched = value.some(o => matchesFilter(item, o));
        } else if (key === 'AND') {
          if (!Array.isArray(value)) continue;
          matched = value.every(o => matchesFilter(item, o));
        } else if (key === 'NOT') {
          matched = !matchesFilter(item, value);
        } else {
          // Field-level logic
          const itemValue = item[key];
          
          if (value && typeof value === 'object' && value.contains) {
            // Contains match (case-insensitive)
            const search = value.contains.toLowerCase();
            const content = String(itemValue || "").toLowerCase();
            if (!content.includes(search)) matched = false;
          } else if (value && typeof value === 'object' && value.mode === 'insensitive') {
            // Placeholder for other insensitive matches
            if (String(itemValue || "").toLowerCase() !== String(Object.values(value)[0] || "").toLowerCase()) matched = false;
          } else {
            // Exact match
            if (itemValue !== value) matched = false;
          }
        }
        
        if (!matched) break;
      }
      
      return matched;
    };

    return {
      $connect: async () => Promise.resolve(),
      $disconnect: async () => Promise.resolve(),
      $queryRaw: async () => [{ now: new Date() }],
      $transaction: async (cb) => await cb(this.writeClient),
      case: { 
        count: async (args) => mockCases.filter(c => matchesFilter(c, args?.where)).length, 
        findMany: async (args) => {
          const filtered = mockCases.filter(c => matchesFilter(c, args?.where));
          // Simplified take/skip for mock
          const take = args?.take || 10;
          const skip = args?.skip || 0;
          return filtered.slice(skip, skip + take);
        },
        findUnique: async ({ where }) => mockCases.find(c => c.id === where.id) || null
      },
      company: { 
        findMany: async () => mockCompanies,
        findUnique: async ({ where }) => mockCompanies.find(c => c.name === where.name || c.id === where.id) || null
      },
      advisoryService: { findMany: async () => [] },
      caseRegistrySubmission: { findFirst: async () => null }
    };
  }

  getWriteClient() { return this.writeClient; }
  getReadClient() {
    if (this.readClients.length === 0) return this.writeClient;
    const clientIndex = Math.floor(Math.random() * this.readClients.length);
    return this.readClients[clientIndex];
  }

  /**
   * Health Check with Automated Failover (v10.0)
   */
  async healthCheck() {
    const results = { write: false, reads: [], overall: false };

    try {
      await this.writeClient.$queryRaw`SELECT 1`;
      results.write = true;
      this.failureCount = 0; // Reset on success
    } catch (error) {
      console.error('❌ Primary database health check failed:', error.message);
      this.failureCount++;
      
      await alertingService.alertDatabaseIssue('Primary Node Down', {
        error: error.message,
        failCount: this.failureCount
      });

      // Automated Failover Trigger (3-failure threshold)
      if (this.failureCount >= 3 && !this.isMock) {
        await this.promoteReplicaToPrimary();
      }
    }

    for (const client of this.readClients) {
      try {
        await client.$queryRaw`SELECT 1`;
        results.reads.push(true);
      } catch (e) {
        results.reads.push(false);
      }
    }

    results.overall = results.write && results.reads.every(r => r);
    return results;
  }

  /**
   * Replica Promotion Logic with Leader Election (v11.0 Resilience)
   */
  async promoteReplicaToPrimary() {
    if (this.readClients.length === 0) {
      console.error('❌ [FAILOVER_FATAL] No replicas available. Enabling Emergency Read-Only Mode.');
      resilienceService.setReadOnlyMode(true);
      return;
    }

    // Leader Election (Redis Lock) - Bypass if Redis is disconnected
    if (!cacheService.isRedisConnected) {
      console.warn('⚠️  [FAILOVER_DEGRADED] Redis substrate offline. Operating in Standalone Failover Mode.');
      await this.executePromotion();
      return;
    }

    const lockKey = 'db:failover:lock';
    const nodeId = process.env.HOSTNAME || 'node-' + Math.random().toString(36).substr(2, 5);
    
    try {
      console.info(`[FAILOVER_LEADERSHIP] Attempting failover lock: ${nodeId}`);
      const isLeader = await cacheService.redisClient.set(lockKey, nodeId, {
        NX: true,
        EX: 60 // 60s lock for election
      });

      if (!isLeader) {
        console.warn('⚠️ [FAILOVER_ELECTION] Another node is already coordinating promotion. Standing by.');
        return;
      }

      await this.executePromotion();

      // Update Epoch in Redis if available
      const newEpoch = await cacheService.redisClient.incr('db:primary:epoch');
      this.primaryEpoch = newEpoch;
      
      // Cleanup election lock manually after success
      await cacheService.redisClient.del(lockKey);
    } catch (error) {
      console.error('❌ [FAILOVER_CATASTROPHIC] Leader promotion failed:', error.message);
      await cacheService.redisClient.del(lockKey).catch(() => {}); // Ensure release attempts
    }
  }

  async executePromotion() {
    await resilienceService.setReadOnlyMode(true);

    // 2. Promotion Sequence
    console.info('[FAILOVER_START] Leading replica promotion...');
    const candidateClient = this.readClients.shift(); 
    await candidateClient.$queryRaw`SELECT 1`;
    
    this.writeClient = candidateClient;
    this.failureCount = 0;
    
    await resilienceService.setReadOnlyMode(false);
    
    console.info(`✅ [FAILOVER_SUCCESS] Secondary promoted to Primary.`);
    
    // Forensic: Record Global Failover Event (v11.0)
    eventLedger.recordSystemEvent('DB_FAILOVER_COMPLETED', { 
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Fencing Check for Writability (v11.0)
   */
  async assertEpoch() {
    if (this.isMock || !cacheService.isRedisConnected) return true;
    const globalEpoch = await cacheService.redisClient.get('db:primary:epoch');
    if (globalEpoch && parseInt(globalEpoch) > this.primaryEpoch) {
      console.error(`❌ [FENCING_VIOLATION] Detected stale primary (Local Epoch: ${this.primaryEpoch} | Global: ${globalEpoch})`);
      resilienceService.setReadOnlyMode(true);
      throw new Error("FENCING_ERROR: Stale primary detected. Writes blocked.");
    }
    return true;
  }

  async getServerTime() {
    try {
      const result = await this.writeClient.$queryRaw`SELECT NOW() as now`;
      return new Date(result[0].now);
    } catch (e) {
      return new Date();
    }
  }

  async disconnect() {
    await this.writeClient?.$disconnect();
    for (const client of this.readClients) await client?.$disconnect();
  }
}

module.exports = new DatabaseManager();
