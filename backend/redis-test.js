require('dotenv').config({ path: '.env.test' });
const { createClient } = require('redis');

async function testRedis() {
  console.log('Testing Redis connection...');
  console.log('Host:', process.env.REDIS_HOST);
  console.log('Port:', process.env.REDIS_PORT);

  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = process.env.REDIS_PORT || 6379;
  const redisPassword = process.env.REDIS_PASSWORD;

  const redisUrl = redisPassword
    ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
    : `redis://${redisHost}:${redisPort}`;

  console.log('Redis URL:', redisUrl);

  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      }
    });

    await client.connect();
    console.log('✅ Redis connected successfully!');
    await client.disconnect();
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      address: error.address,
      port: error.port
    });
  }
}

testRedis();