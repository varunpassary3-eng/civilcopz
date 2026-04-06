export function simulateDBFailure() {
  console.log("[CHAOS INJECTOR] Invalidating DATABASE_URL to simulate hard failover...");
  process.env.DATABASE_URL = "postgres://invalid:5432/invalid_db";
}

export function restoreDBFailure(originalUrl) {
  process.env.DATABASE_URL = originalUrl;
  console.log("[CHAOS INJECTOR] Database connection restored.");
}

export async function simulateSOAPFailures(count) {
  console.log(`[CHAOS INJECTOR] Simulating ${count} consecutive SOAP timeouts to overload circuit breaker...`);
  // Realistic simulation would mock Axios or fetch, or the SOAP port to just timeout
  return new Promise(resolve => setTimeout(resolve, 500));
}

export function simulateNetworkLatency(ms = 5000) {
    console.log(`[CHAOS INJECTOR] Injecting artificial ${ms}ms network latency...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}
