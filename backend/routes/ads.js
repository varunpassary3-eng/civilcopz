const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { verifyToken } = require('../middleware/auth');
const audit = require('../middleware/audit');

// Public routes (matching for non-logged-in users if needed)
router.get('/recommendations', audit('VIEW_AD_RECOMMENDATIONS'), adController.getRecommendations);
router.get('/list', audit('LIST_AD_SERVICES'), adController.listAllServices);

module.exports = router;
