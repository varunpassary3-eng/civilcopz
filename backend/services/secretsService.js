const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const https = require('https');
const forge = require('node-forge');
const eventLedger = require('./eventLedgerService');

/**
 * CivilCOPZ Secrets Service
 * 
 * Securely loads production credentials from AWS Secrets Manager.
 * Prevents sensitive keys from touching the filesystem.
 */
class SecretsService {
  constructor() {
    this.region = process.env.AWS_REGION || "asia-south1";
    this.client = new SecretsManagerClient({ region: this.region });
    this.isLoaded = false;
  }

  /**
   * Fetches and injects secrets into process.env
   * @param {string} secretId - The AWS Secret ID / Name
   */
  async loadSecrets(secretId) {
    if (this.isLoaded) return;

    // LOCAL BYPASS: If in dev and no secretId provided, rely on .env
    if (!secretId && process.env.NODE_ENV === "development") {
      console.info("[SECRETS_SERVICE] No Secret ID provided in DEV. Using local .env substrate.");
      this.isLoaded = true;
      return;
    }

    try {
      console.info(`[SECRETS_SERVICE] Fetching sovereign credentials from: ${secretId} (${this.region})...`);
      
      const response = await this.client.send(
        new GetSecretValueCommand({ 
          SecretId: secretId,
          VersionStage: "AWSCURRENT" // Pinning to the authoritative latest version
        })
      );

      if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString);
        
        // Inject into process.env
        Object.entries(secrets).forEach(([key, value]) => {
          process.env[key] = value;
        });

        console.info(`[SECRETS_SERVICE] Successfully injected ${Object.keys(secrets).length} production secrets.`);
        
        // Final Hardening: 60-day Staleness & Rotation Enforcement (v4.2)
        const ROTATION_THRESHOLD = 60 * 24 * 60 * 60 * 1000; // 60 days
        const lastRotated = secrets.LAST_ROTATED_AT ? new Date(secrets.LAST_ROTATED_AT).getTime() : Date.now();
        if (Date.now() - lastRotated > ROTATION_THRESHOLD) {
          console.error("❌ [STALENESS_FAILURE] Secrets have not been rotated in >60 days. Secure boot aborted.");
          throw new Error("SECURE_BOOT_FAILURE: Secrets stale, rotation required.");
        }

        // Sovereign Domain Allowlist Assertion (v4.2)
        const allowedDomains = ["*.cdac.in", "*.emudhra.com", "*.nsdl.co.in", "localhost"];
        this.assertAllowed(process.env.ESIGN_PROVIDER_URL, allowedDomains);
        this.assertAllowed(process.env.TSA_URL, allowedDomains);

        // Final Hardening: Boot Integrity Check for Sovereign Providers (v11.3 REFORM)
        if (!process.env.ESIGN_PROVIDER_URL || !process.env.TSA_URL) {
          console.warn("⚠️ [INTEGRITY_WARNING] Sovereign providers (ESIGN/TSA) are missing from credentials.");
          if (process.env.NODE_ENV === 'production') {
            throw new Error("SECURE_BOOT_FAILURE: Missing sovereign providers.");
          }
        }

        // v9.1 MTLS Expiry Audit
        if (process.env.REGISTRY_CLIENT_CERT) {
          await this.checkCertExpiry('REGISTRY_G2G_CLIENT', process.env.REGISTRY_CLIENT_CERT);
        }

        this.isLoaded = true;
      }
    } catch (error) {
      console.error('[SECRETS_SERVICE_FAILURE]', error.message);
      throw error;
    }
  }

  /**
   * Asserts that a URL belongs to a sovereign allowlist
   */
  assertAllowed(url, allowlist) {
    if (!url) return;
    const { hostname } = new URL(url);
    const isAllowed = allowlist.some(pattern => {
      if (pattern.startsWith("*.")) {
        return hostname.endsWith(pattern.slice(2));
      }
      return hostname === pattern;
    });

    if (!isAllowed) {
      console.error(`❌ [DOMAIN_SECURITY_FAILURE] Unapproved sovereign provider endpoint: ${hostname}`);
      throw new Error(`SECURITY_VIOLATION: Unapproved domain ${hostname}`);
    }
  }

  /**
   * Generates a hardened HttpsAgent for Mutual TLS (v9.0)
   */
  getHttpsAgent() {
    if (process.env.NODE_ENV === 'development') {
      return new https.Agent({ rejectUnauthorized: false });
    }

    if (!process.env.REGISTRY_CLIENT_CERT) {
      throw new Error("MTLS_SUBSTRATE_MISSING: Registry client certificate not loaded.");
    }

    return new https.Agent({
      cert: Buffer.from(process.env.REGISTRY_CLIENT_CERT, 'base64'),
      key: Buffer.from(process.env.REGISTRY_CLIENT_KEY, 'base64'),
      passphrase: process.env.REGISTRY_CERT_PASSPHRASE,
      // Pinning the registry's root CA for certificate pinning (Forensic Integrity)
      ca: process.env.REGISTRY_ROOT_CA ? Buffer.from(process.env.REGISTRY_ROOT_CA, 'base64') : undefined,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
      ciphers: 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384'
    });
  }

  /**
   * Monitor G2G Certificate Expiry (v9.1 Hardening)
   */
  async checkCertExpiry(name, certBase64) {
    try {
      const certDer = forge.util.decode64(certBase64);
      const cert = forge.pki.certificateFromPem(forge.util.binary.raw.encode(certDer)); 
      
      const expiryDate = new Date(cert.validity.notAfter);
      const daysRemaining = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

      console.info(`[CERT_MONITOR] ${name} expires in ${daysRemaining} days (Date: ${expiryDate.toISOString()})`);

      if (daysRemaining < 7) {
        console.warn(`⚠️ [CERT_EXPIRY_CRITICAL] ${name} expires in < 7 days!`);
        await eventLedger.recordEvent('SYSTEM_CORE', 'CERT_EXPIRY_WARNING', {
          certName: name,
          expiryDate: expiryDate.toISOString(),
          daysRemaining
        }, 'SYSTEM', 'CERT_MONITOR');
      }
    } catch (error) {
      console.error(`[CERT_MONITOR_FAILURE] Failed to parse ${name} certificate:`, error.message);
    }
  }
}

module.exports = new SecretsService();
