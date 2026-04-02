const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        server: 'running'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        server: 'running'
      },
      error: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable'
    });
  }
});

// Readiness check endpoint
router.get('/ready', async (req, res) => {
  try {
    // Check database connection and basic query
    const userCount = await prisma.user.count();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ready',
        server: 'ready'
      },
      metrics: {
        userCount
      }
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      services: {
        database: 'not ready',
        server: 'ready'
      },
      error: process.env.NODE_ENV === 'development' ? error.message : 'Service not ready'
    });
  }
});

module.exports = router;