const { PrismaClient } = require('@prisma/client');
const { URL } = require('url');

// Database connection manager for national scale
class DatabaseManager {
  constructor() {
    this.writeClient = null;
    this.readClients = [];
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    const databaseUrl = process.env.DATABASE_URL;
    const readReplicas = process.env.DATABASE_READ_REPLICAS?.split(',') || [];

    // Initialize write client (primary database)
    try {
      const parsed = new URL(databaseUrl);
      if (!parsed.protocol || !parsed.hostname) throw new Error('Malformed database URL');
    } catch (e) {
      console.error('❌ Database URL parsing failure:', e.message);
      throw new Error(`Invalid DATABASE_URL substrate: ${e.message}`);
    }

    this.writeClient = new PrismaClient({
      datasourceUrl: databaseUrl,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Initialize read clients (replicas)
    for (const replicaUrl of readReplicas) {
      const readClient = new PrismaClient({
        datasourceUrl: replicaUrl,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
      this.readClients.push(readClient);
    }

    // Test connections
    try {
      await this.writeClient.$connect();
      console.log('✅ Write database connected');

      for (let i = 0; i < this.readClients.length; i++) {
        await this.readClients[i].$connect();
        console.log(`✅ Read replica ${i + 1} connected`);
      }

      this.isInitialized = true;
      console.log(`🚀 Database manager initialized with ${this.readClients.length} read replicas`);
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  // Get write client for CREATE, UPDATE, DELETE operations
  getWriteClient() {
    if (!this.isInitialized) {
      throw new Error('Database manager not initialized. Call initialize() first.');
    }
    return this.writeClient;
  }

  // Get read client for SELECT operations (load balanced)
  getReadClient() {
    if (!this.isInitialized) {
      throw new Error('Database manager not initialized. Call initialize() first.');
    }

    if (this.readClients.length === 0) {
      // No replicas, use write client for reads
      return this.writeClient;
    }

    // Simple round-robin load balancing
    const clientIndex = Math.floor(Math.random() * this.readClients.length);
    return this.readClients[clientIndex];
  }

  // Health check for all database connections
  async healthCheck() {
    const results = {
      write: false,
      reads: [],
      overall: false
    };

    try {
      // Check write connection
      await this.writeClient.$queryRaw`SELECT 1`;
      results.write = true;
    } catch (error) {
      console.error('Write database health check failed:', error);
    }

    // Check read connections
    for (let i = 0; i < this.readClients.length; i++) {
      try {
        await this.readClients[i].$queryRaw`SELECT 1`;
        results.reads.push(true);
      } catch (error) {
        console.error(`Read replica ${i + 1} health check failed:`, error);
        results.reads.push(false);
      }
    }

    results.overall = results.write && results.reads.every(r => r);
    return results;
  }

  // Graceful shutdown
  async disconnect() {
    try {
      await this.writeClient?.$disconnect();

      for (const client of this.readClients) {
        await client?.$disconnect();
      }

      console.log('✅ All database connections closed');
    } catch (error) {
      console.error('❌ Error during database disconnect:', error);
    }
  }

  // Transaction support (always uses write client)
  async transaction(callback) {
    return await this.writeClient.$transaction(callback);
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;