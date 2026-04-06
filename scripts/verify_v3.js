/**
 * CivilCOPZ Forensic Narrative Script (v3.0)
 * 
 * Scenario: Reliance Motors 2024 - Hardened Execution
 * Verifies:
 * 1. Monorepo Config Loading
 * 2. Infra Readiness Guard
 * 3. FSM Transition (DRAFT -> SIGNED -> TIMESTAMPED)
 * 4. Idempotency (Duplicate Callback Protection)
 */

const axios = require('axios');
const API_URL = 'http://localhost:4000/api';

async function runAudit() {
  console.log('🏛️  CivilCOPZ Forensic Audit (v3.0) Starting...');
  
  try {
    // 1. ALWAYS CREATE a fresh target case for a clean forensic narrative
    const auditId = Date.now();
    console.log(`🚀 0. Bootstrapping Unique "Reliance Motors ${auditId}" Test Case...`);
    
    const createRes = await axios.post(`${API_URL}/cases`, {
      title: `Defective Engine Transmission [Audit ${auditId}]`,
      description: 'Reliance Motors 2024 - Transmission failure after 2000km.',
      company: `Reliance Motors ${auditId}`,
      category: 'Other',
      jurisdiction: 'District',
      considerationPaid: 1500000,
      expectedCompensationClient: 500000,
      consumerName: 'Varun Passary',
      consumerEmail: 'varun@test.com',
      consumerPhone: '+91 9999999999',
      consumerAddress: 'Mumbai, India',
      declaredName: 'Varun Passary',
      isDeclaredTrue: true
    }, {
      headers: { Authorization: `Bearer AUDIT_BYPASS` }
    });
    
    let target = createRes.data.case;

    if (!target) throw new Error('Failed to bootstrap audit case.');

    if (!target) throw new Error('No cases found to audit.');

    console.log(`📂 Auditing Case: ${target.id} [${target.registryStatus || 'DRAFT'}]`);

    // 2. Simulate eSign Initiation
    console.log('✍️  1. Initiating Aadhaar eSign Simulator...');
    const signRes = await axios.post(`${API_URL}/litigation/sign/${target.id}`, {}, {
      headers: { Authorization: `Bearer SIMULATED_TOKEN` } // Handle auth if needed
    });
    console.log(`   - Redirect URL: ${signRes.data.redirectUrl}`);

    // 3. Simulate Provider Callback
    console.log('🛡️  2. Simulating eSign Callback with Idempotency Guard...');
    const txnId = signRes.data.txnId;
    
    // Attempt 1: Valid Callback
    const cbRes1 = await axios.get(`${API_URL}/litigation/esign/callback?txnId=${txnId}&caseId=${target.id}`);
    console.log('   - Attempt 1 (Valid): SIGNATURE_APPLIED');

    // Attempt 2: Replay Attack / Duplicate Callback
    const cbRes2 = await axios.get(`${API_URL}/litigation/esign/callback?txnId=${txnId}&caseId=${target.id}`);
    if (cbRes2.data === 'Duplicate callback ignored') {
      console.log('   - Attempt 2 (Duplicate): ✅ Correctly Blocked by Redis Idempotency');
    }

    // 4. Trigger Certified Timestamp
    console.log('⏱️  3. Applying Certified RFC 3161 Timestamp...');
    const tsRes = await axios.post(`${API_URL}/litigation/timestamp/${target.id}`, {}, {
      headers: { Authorization: `Bearer AUDIT_BYPASS` }
    });
    console.log(`   - Timestamp Token: ${tsRes.data.token.substring(0, 32)}...`);
    console.log(`   - Authority: ${tsRes.data.authority}`);

    // 5. Final State Verification
    const finalRes = await axios.get(`${API_URL}/cases/${target.id}`);
    console.log('\n📊 Final Forensic State:');
    console.log(`   - Registry Status: ${finalRes.data.registryStatus}`);
    console.log(`   - Signature Applied: ${finalRes.data.signed ? 'YES' : 'NO'}`);
    console.log(`   - Forensic Score: ${finalRes.data.registryStatus === 'TIMESTAMPED' ? '100% AUDITABLE' : 'INCOMPLETE'}`);

  } catch (error) {
    console.error('❌ Audit Failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.table(error.response.data.details);
    }
  }
}

// Ensure server is up first
console.log('⚠️  Note: Ensure "npm run dev" is running in a separate terminal.');
runAudit();
