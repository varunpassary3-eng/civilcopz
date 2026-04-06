const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

/**
 * LitigationArchiveService: Judicial-Grade Archival Substrate
 * Implements S3 Object Lock (Compliance Mode) and DR Verification (v10.0).
 */
class LitigationArchiveService {
  constructor() {
    this.region = process.env.AWS_REGION || "asia-south1";
    this.bucketName = process.env.LITIGATION_ARCHIVE_BUCKET || "civilcopz-judicial-archive";
    this.s3Client = new S3Client({ region: this.region });

    // v10.0 Disaster Recovery Substrate (Secondary Region)
    this.drRegion = "asia-south2";
    this.drBucketName = process.env.DR_ARCHIVE_BUCKET || "civilcopz-judicial-archive-dr";
    this.drS3Client = new S3Client({ region: this.drRegion });
  }

  /**
   * Archives a raw registry XML with legal immutability.
   */
  async archiveRegistryXML(caseId, xml, xmlHash) {
    const key = `registry-archives/${caseId}/${Date.now()}-submission.xml`;
    console.info(`[ARCHIVE_SERVICE] Archiving Registry XML for Case: ${caseId} | Hash: ${xmlHash.slice(0, 8)}`);

    try {
      // S3 Object Lock (Compliance Mode) - 7 years
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + 7);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: xml,
        ContentType: 'application/xml',
        Metadata: {
          "case-id": caseId,
          "xml-hash": xmlHash,
          "schema-version": "AFE_V3"
        },
        ObjectLockMode: 'COMPLIANCE',
        ObjectLockRetainUntilDate: retentionDate
      });

      await this.s3Client.send(command);
      const s3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      return { url: s3Url, key };
    } catch (error) {
      console.error("[ARCHIVE_FAILURE] Failed to persist judicial-grade record:", error);
      return null;
    }
  }

  /**
   * Disaster Recovery Auditor: Authoritative Replication Verification (v11.0)
   * Ensures bit-perfect parity between regions within SLA windows.
   */
  async verifyReplication(caseId, key) {
    console.info(`[REPLICATION_AUDIT] Performing authoritative ETag audit for Case: ${caseId}`);
    try {
      // 1. Fetch metadata from Primary Region (asia-south1)
      const primaryHead = await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      }));

      // 2. Fetch metadata from DR Region (asia-south2)
      const drHead = await this.drS3Client.send(new HeadObjectCommand({
        Bucket: this.drBucketName,
        Key: key
      }));

      // 3. Bit-Perfect Authoritative Check
      const isBitPerfect = primaryHead.ETag === drHead.ETag;
      
      if (!isBitPerfect) {
        console.error(`❌ [REPLICATION_CORRUPTION] Hash mismatch detected for Case: ${caseId}`);
        return { status: 'CORRUPT', primaryETag: primaryHead.ETag, drETag: drHead.ETag };
      }

      console.info('✅ [REPLICATION_SUCCESS] Authoritative parity verified for DR region.');
      return { 
        status: 'VERIFIED', 
        verifiedAt: new Date(), 
        drRegion: this.drRegion 
      };
    } catch (error) {
      if (error.name === 'NotFound') {
        console.warn('⚠️ [REPLICATION_PENDING] Judicial record not yet converged in DR bucket.');
      } else {
        console.error('❌ [REPLICATION_FAILURE] Failed to audit DR synchronization:', error.message);
      }
      return false;
    }
  }
}

module.exports = new LitigationArchiveService();
