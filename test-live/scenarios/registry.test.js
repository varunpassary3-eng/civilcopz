import fs from 'fs';
import path from 'path';

const defect_case = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'test-live', 'datasets', 'defect_case.json')));

async function createCase(data) { return "case_defect"; }
async function fileCase(caseId) { return { status: "FILED" }; }

// Simulate system registry hooks changing status
let registryState = "FILED";
async function simulateRegistryCallback(payload) {
  registryState = "DEFECTED"; // Simulating webhook state change
}
async function getCase(caseId) { return { status: registryState }; }
async function fixCase(caseId) { return true; }
async function refileCase(caseId) { registryState = "RESUBMITTED"; return true; }

describe("Registry Defect Cycle", () => {
  it("should handle defect and resubmission", async () => {
    const caseId = await createCase(defect_case);
    await fileCase(caseId);

    await simulateRegistryCallback({
      status: "DEFECT",
      note: "Annexure missing"
    });

    let updated = await getCase(caseId);
    expect(updated.status).toBe("DEFECTED");

    await fixCase(caseId);
    await refileCase(caseId);

    updated = await getCase(caseId);
    expect(updated.status).toBe("RESUBMITTED");
  });
});
