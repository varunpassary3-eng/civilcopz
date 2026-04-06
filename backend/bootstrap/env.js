/**
 * CivilCOPZ Monorepo Bootstrap: Environment Loader
 * 
 * Ensures that the authoritative root .env is loaded and validated 
 * via Zod before the system substrate is initialized.
 */

const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Resolve root .env path relative to this file
// (Assuming: backend/bootstrap/env.js)
const rootPath = path.resolve(__dirname, '../../');
const envPath = path.join(rootPath, '.env');

console.log(`🚀 CivilCOPZ Bootstrap: Loading environment from ${envPath}...`);
dotenv.config({ path: envPath });

// Define Configuration Schema (Strict Validation - Phase 3.0)
const EnvSchema = z.object({
  // Infrastructure (v11.9 GOP SOVEREIGNTY)
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'), // Fallback to local mesh
  
  // GCP-Native Credentials (Manual assembly if URL is missing)
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_HOST: z.string().default('10.0.0.10'), // Authoritative SQL Private IP (v11.6)
  
  // Litigation Integration (v3.0)
  ESIGN_MODE: z.enum(['SIMULATOR', 'REAL']).default('SIMULATOR'),
  TSA_MODE: z.enum(['SIMULATOR', 'REAL']).default('SIMULATOR'),
  APP_MODE: z.enum(['SIMULATION', 'PRODUCTION']).default('SIMULATION'),
  
  // App Config
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000'),
  CORS_ORIGIN: z.string().optional(),
});

// singleton storage
let CONFIG = {};

/**
 * Validates the current process.env and updates the CONFIG singleton.
 * @param {Object} options - Validation options.
 * @param {boolean} options.strict - If true, enforces all required production vars.
 */
function validate({ strict = false } = {}) {
  try {
    // Phase 1: Relax schema for initial boot (optional vars)
    const activeSchema = strict ? EnvSchema : EnvSchema.partial();
    const parsed = activeSchema.parse(process.env);
    
    // Phase 2: Dynamic URI Assembly (v11.6 Sovereign Topology)
    const user = parsed.DB_USER || process.env.DB_USER;
    const pass = parsed.DB_PASSWORD || process.env.DB_PASSWORD;
    const host = parsed.DB_HOST || process.env.DB_HOST || '10.0.0.10'; // Authoritative SQL Private IP
    const name = parsed.DB_NAME || process.env.DB_NAME || 'civilcopz';
    
    if (user && pass && !parsed.DATABASE_URL) {
      process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:5432/${name}?schema=public`;
      console.info('🛠️  CivilCOPZ Bootstrap: Aligned DATABASE_URL with GCP topology.');
    }
    
    if (process.env.REDIS_PASSWORD && !process.env.REDIS_URL) {
      const redisHost = process.env.REDIS_HOST || '10.0.0.20'; // Authoritative Redis Private IP
      process.env.REDIS_URL = `redis://:${process.env.REDIS_PASSWORD}@${redisHost}:6379`;
      console.info('🛠️  CivilCOPZ Bootstrap: Aligned REDIS_URL with GCP topology.');
    }

    // Phase 3: Final Schema Re-validation
    const finalized = EnvSchema.parse(process.env);
    CONFIG = Object.freeze({ ...CONFIG, ...finalized });
    
    console.info(`✅ CivilCOPZ Bootstrap: Substrate validated (Strict: ${strict}).`);
    return CONFIG;
  } catch (error) {
    if (strict) {
      console.error('❌ CivilCOPZ Bootstrap: STRICT validation failed after secret injection!');
      error.errors.forEach(err => console.error(`   - [${err.path.join('.')}] ${err.message}`));
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    } else {
      console.warn('⚠️  CivilCOPZ Bootstrap: Preliminary validation incomplete (Awaiting Secrets).');
    }
    return CONFIG; 
  }
}

// Initial top-level validation (Non-fatal)
validate({ strict: false });

module.exports = {
  get: () => CONFIG,
  validate
};
