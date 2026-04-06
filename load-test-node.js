const http = require('http');
const https = require('https');

// Simple load test using Node.js
class LoadTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:4000';
    this.duration = options.duration || 30000; // 30 seconds
    this.concurrency = options.concurrency || 10;
    this.requests = 0;
    this.errors = 0;
    this.responseTimes = [];
    this.startTime = Date.now();
  }

  makeRequest() {
    return new Promise((resolve, reject) => {
      const url = new URL('/health', this.baseUrl);
      const client = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        timeout: 5000
      };

      const req = client.request(options, (res) => {
        let data = '';
        const startTime = Date.now();

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          this.responseTimes.push(responseTime);
          this.requests++;

          try {
            const jsonData = JSON.parse(data);
            if (res.statusCode === 200 && jsonData.status === 'ok') {
              resolve({ success: true, responseTime, status: res.statusCode });
            } else {
              this.errors++;
              resolve({ success: false, responseTime, status: res.statusCode });
            }
          } catch (e) {
            this.errors++;
            resolve({ success: false, responseTime, status: res.statusCode });
          }
        });
      });

      req.on('error', (err) => {
        this.errors++;
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        this.errors++;
        resolve({ success: false, error: 'timeout' });
      });

      req.end();
    });
  }

  async runLoadTest() {
    console.log(`🚀 Starting load test: ${this.concurrency} concurrent users for ${this.duration/1000}s`);
    console.log(`📍 Target: ${this.baseUrl}/health`);

    const results = [];
    const startTime = Date.now();

    // Create concurrent requests
    const promises = [];
    for (let i = 0; i < this.concurrency; i++) {
      promises.push(this.runUser());
    }

    await Promise.all(promises);
    const endTime = Date.now();

    this.printResults(endTime - startTime);
  }

  async runUser() {
    const userStartTime = Date.now();

    while (Date.now() - this.startTime < this.duration) {
      await this.makeRequest();

      // Simulate user think time (1-3 seconds)
      const thinkTime = Math.random() * 2000 + 1000;
      await new Promise(resolve => setTimeout(resolve, thinkTime));
    }
  }

  printResults(totalTime) {
    const totalRequests = this.requests;
    const errorRate = (this.errors / totalRequests) * 100;
    const avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    const p95ResponseTime = this.calculatePercentile(this.responseTimes, 95);
    const rps = totalRequests / (totalTime / 1000);

    console.log('\n📊 Load Test Results:');
    console.log('='.repeat(50));
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`Requests/sec: ${rps.toFixed(2)}`);
    console.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`95th Percentile: ${p95ResponseTime.toFixed(2)}ms`);
    console.log(`Test Duration: ${(totalTime/1000).toFixed(2)}s`);

    // Assessment
    console.log('\n🎯 Assessment:');
    if (errorRate < 2) {
      console.log('✅ Error rate < 2% - PASSED');
    } else {
      console.log('❌ Error rate >= 2% - FAILED');
    }

    if (p95ResponseTime < 1000) {
      console.log('✅ P95 latency < 1000ms - PASSED');
    } else {
      console.log('❌ P95 latency >= 1000ms - FAILED');
    }

    if (rps > 5) {
      console.log('✅ Good throughput - PASSED');
    } else {
      console.log('⚠️  Low throughput - check system resources');
    }
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// Run the load test
if (require.main === module) {
  const tester = new LoadTester({
    baseUrl: process.env.BASE_URL || 'http://localhost:4000',
    duration: 30000, // 30 seconds
    concurrency: 10   // 10 concurrent users
  });

  tester.runLoadTest().catch(console.error);
}

module.exports = LoadTester;