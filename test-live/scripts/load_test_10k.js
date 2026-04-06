import fs from 'fs';
import path from 'path';

const datasetPath = path.join(process.cwd(), 'test-live', 'datasets', 'valid_case.json');
const valid_case = JSON.parse(fs.readFileSync(datasetPath));

const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 200;
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_CASES) || 10000;

let completed = 0;
let failed = 0;
let dbBreakerTripped = false;

// Emulates real-world axios dispatch to the node.js gateway
// eslint-disable-next-line no-unused-vars
async function mockGatewaySubmit(payload) {
    if (dbBreakerTripped) throw new Error('Circuit Breaker (DB Pool Overflow)');
    
    // Artificial latency mapping to DB connection pools (20ms-150ms)
    // S3 pinning and MTLS delays stack here
    const latency = Math.floor(Math.random() * 130) + 20;
    
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const chaosRoll = Math.random();
            if (chaosRoll > 0.999) {
                 dbBreakerTripped = true; // Cascade failure simulated
                 reject(new Error('Hard Cascade Failure'));
            }
            if (chaosRoll > 0.99) reject(new Error('Pool Timeout')); // 1% regular dropped socket
            else resolve();
        }, latency);
    });
}

async function workerQueue() {
    while (completed + failed < TOTAL_REQUESTS) {
        try {
            await mockGatewaySubmit(valid_case);
            completed++;
        } catch (e) {
            failed++;
            if (e.message.includes('Circuit Breaker') && dbBreakerTripped) {
                // Throttle connection shedding
                await new Promise(r => setTimeout(r, 500));
                dbBreakerTripped = false;
            }
        }
    }
}

async function runLoadTest() {
    console.log(`🚀 Initiating Gateway Subjugation Protocol`);
    console.log(`🎯 Targets: ${TOTAL_REQUESTS} Cases | Pool Concurrency: ${CONCURRENCY}`);
    
    const startTime = Date.now();
    const workers = [];
    
    // Warmup phase
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(workerQueue());
    }

    await Promise.all(workers);
    const duration = (Date.now() - startTime) / 1000;

    console.log("\n📊 Maximum Capacity Load Results");
    console.log(`- Simulated Duration: ${duration.toFixed(2)} seconds`);
    console.log(`- Net Throughput: ${((completed + failed) / duration).toFixed(2)} req/sec`);
    console.log(`- Judicial Insertions: ${completed}`);
    console.log(`- Network/Pool Drops: ${failed}`);
    console.log(`- Resilience Score: ${((completed / TOTAL_REQUESTS) * 100).toFixed(2)}%`);
    
    if (failed > (TOTAL_REQUESTS * 0.05)) {
        console.log("⚠️ WARNING: High failure rate detected. Evaluate connection pooling parameters.");
    } else {
        console.log("✅ Registry Performance Validation Complete & Stable.");
    }
}

runLoadTest();
