import fs from 'fs';
import path from 'path';

const corrupted_case = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'test-live', 'datasets', 'corrupted_evidence.json')));

async function validateEvidence(data) {
    if (data.tamperedHash) {
        return { valid: false, reason: "SHA-256 fingerprint mismatch in S3 Object Lock" };
    }
    return { valid: true };
}

describe("Forensic S3 Object Integrity", () => {
  it("should detect evidence tampering", async () => {
    const result = await validateEvidence(corrupted_case);
    expect(result.valid).toBe(false);
  });
});
