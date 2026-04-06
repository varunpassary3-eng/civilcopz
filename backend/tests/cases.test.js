const timestampAuthority = require('../services/timestampAuthorityService');
const certificate65B = require('../services/certificate65BService');
const courtDossier = require('../services/courtDossierService');
const evidencePackaging = require('../services/evidencePackagingService');
const verificationService = require('../services/verificationService');
const chainOfCustody = require('../services/chainOfCustodyService');

describe('Litigation Services', () => {
  test('All litigation services should load successfully', () => {
    expect(typeof timestampAuthority.timestampEvidenceEntry).toBe('function');
    expect(typeof certificate65B.generateCertificate).toBe('function');
    expect(typeof courtDossier.generateDossierSummaryPDF).toBe('function');
    expect(typeof evidencePackaging.createEvidenceBundle).toBe('function');
    expect(typeof verificationService.generateVerificationManifest).toBe('function');
    expect(typeof chainOfCustody.recordUpload).toBe('function');
  });

  test('Timestamp Authority should have required methods', () => {
    expect(typeof timestampAuthority.requestTimestamp).toBe('function');
    expect(typeof timestampAuthority.verifyTimestamp).toBe('function');
    expect(typeof timestampAuthority.getTimestampStatus).toBe('function');
  });

  test('Certificate 65B should have required methods', () => {
    expect(typeof certificate65B.getCertificate).toBe('function');
    expect(typeof certificate65B.getCaseCertificates).toBe('function');
    expect(typeof certificate65B.verifyCertificate).toBe('function');
  });

  test('Court Dossier should have required methods', () => {
    expect(typeof courtDossier.createDossierZipBundle).toBe('function');
  });

  test('Evidence Packaging should have required methods', () => {
    expect(typeof evidencePackaging.getPackage).toBe('function');
    expect(typeof evidencePackaging.verifyPackage).toBe('function');
  });

  test('Verification Service should have required methods', () => {
    expect(typeof verificationService.generateVerificationReport).toBe('function');
  });

  test('Chain of Custody should have required methods', () => {
    expect(typeof chainOfCustody.getChainOfCustody).toBe('function');
    expect(typeof chainOfCustody.getCurrentCustodian).toBe('function');
  });
});

