# CivilCOPZ Audit & Evidence Integrity Ledger

## Overview

CivilCOPZ implements a comprehensive audit and evidence integrity system designed for legal compliance and tamper-proof record keeping. This system provides blockchain-style integrity guarantees for all case evidence and audit trails.

## Architecture

### Core Components

1. **Evidence Integrity Ledger**: Tamper-proof chain of evidence for each case
2. **Audit Trail**: Comprehensive logging of all system actions
3. **Daily Ledger Hash**: Merkle tree root hashes for daily audit consolidation
4. **Integrity Verification**: Automated verification of ledger integrity

### Database Schema

#### EvidenceIntegrityLedger
- **caseId**: Links to the case
- **evidenceId**: Unique identifier for evidence item
- **evidenceType**: DOCUMENT | EVENT | CASE
- **contentHash**: SHA-256 of evidence content
- **metadataHash**: SHA-256 of metadata
- **previousHash**: Chain link to previous entry
- **signature**: KMS cryptographic signature
- **timestamp**: Creation timestamp
- **actor**: User/process that created entry

#### AuditTrail
- **entityType**: CASE | USER | COMPANY | DOCUMENT
- **entityId**: Specific entity identifier
- **action**: CREATE | UPDATE | DELETE | VIEW | APPROVE
- **oldValues/newValues**: Before/after state
- **changes**: Computed diff of changes
- **actorId/actorRole**: Who performed action
- **integrityHash**: SHA-256 of audit entry
- **blockHash**: Links to daily ledger

#### DailyLedgerHash
- **date**: Date of ledger
- **rootHash**: Merkle tree root of all day's audit entries
- **eventCount**: Number of events in ledger

## API Endpoints

### Evidence Verification
```
GET /api/integrity/case/:caseId/verify
```
Verifies the integrity chain for a case's evidence.

### Audit Trail
```
GET /api/integrity/audit/:entityType/:entityId?limit=50
```
Retrieves audit trail for any entity.

### Daily Ledger
```
GET /api/integrity/ledger/daily/:date
POST /api/integrity/ledger/generate-daily
```
Access and generate daily ledger hashes.

### Integrity Report
```
GET /api/integrity/integrity/report
```
Get verification status report.

## Usage Examples

### Creating Evidence Entry
```javascript
await auditLedgerService.createEvidenceEntry(
  caseId,
  evidenceId,
  'DOCUMENT',
  fileContent,
  metadata,
  userId,
  ipAddress,
  userAgent
);
```

### Verifying Case Integrity
```javascript
const result = await auditLedgerService.verifyEvidenceChain(caseId);
if (!result.isValid) {
  console.error('Integrity breach:', result.error);
}
```

### Generating Daily Ledger
```bash
node scripts/generate-daily-ledger.js
```

## Security Features

### Cryptographic Integrity
- SHA-256 hashing for all content
- Cloud KMS signatures for non-repudiation
- Merkle tree structure for efficient verification

### Chain of Custody
- Every evidence item linked in tamper-proof chain
- Previous hash ensures chronological integrity
- Actor attribution with IP/User-Agent tracking

### Audit Compliance
- Immutable audit logs with change tracking
- Daily ledger consolidation
- Automated integrity verification

## Legal Compliance

### Evidence Admissibility
- Cryptographic proof of evidence integrity
- Timestamped creation and modifications
- Actor verification and non-repudiation

### Regulatory Requirements
- SOC 2 Type II compliance ready
- GDPR data integrity guarantees
- Indian IT Act 2000 compliance for digital signatures

## Maintenance

### Daily Operations
- Run `generate-daily-ledger.js` daily via cron
- Monitor integrity verification endpoints
- Review audit trails for suspicious activity

### Backup & Recovery
- Database backups include all ledger data
- KMS keys are automatically backed up
- Integrity verification can detect tampering post-recovery

## Integration Points

### Case Creation
- Automatically creates evidence entries for uploaded documents
- Logs case creation with full metadata

### API Middleware
- All API requests logged with integrity hashes
- Sensitive data masked in audit logs

### File Uploads
- Document hashes computed and stored
- Chain maintained for all evidence

This system provides CivilCOPZ with litigation-grade evidence integrity and audit capabilities, ensuring every case maintains its legal admissibility and evidentiary value.