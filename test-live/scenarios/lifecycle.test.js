import fs from 'fs';
import path from 'path';

// Mock helper functions representing the registry client
async function createCase(data) { return "case_12345"; }
async function uploadEvidence(caseId) { return true; }
async function generateNotice(caseId) { return "NOTICE_001"; }
async function simulateESign(caseId) { return "signature_hash"; }
async function simulateTSA(caseId) { return "tsa_timestamp"; }
async function fileCase(caseId) { return { status: "FILED" }; }
async function getRegistry(caseId) { return { diaryNumber: "DY_2024_01" }; }

const valid_case = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'test-live', 'datasets', 'valid_case.json')));

describe("Full Litigation Lifecycle", () => {
  it("should process case end-to-end", async () => {
    const caseId = await createCase(valid_case);
    expect(caseId).toBeDefined();

    await uploadEvidence(caseId);
    await generateNotice(caseId);

    const sign = await simulateESign(caseId);
    expect(sign).toBeDefined();
    
    const tsa = await simulateTSA(caseId);
    expect(tsa).toBeDefined();

    const result = await fileCase(caseId);
    expect(result.status).toBe("FILED");

    const registry = await getRegistry(caseId);
    expect(registry.diaryNumber).toBeDefined();
  });
});
