const express = require('express');
const router = express.Router();
const { calculateCompanyScore, getTopRiskCompanies } = require('../services/reputationService');

/**
 * Company Reputation API Gateway (Operations-Grade - Phase 11)
 */

router.get('/top-risks', async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const data = await getTopRiskCompanies(parseInt(limit));
        res.json(data);
    } catch (error) {
        console.error('API Error: Top Risks lookup failed:', error);
        res.status(500).json({ error: "Top risk retrieval failed" });
    }
});

router.get('/:name/score', async (req, res) => {
    try {
        const { name } = req.params;
        const data = await calculateCompanyScore(name);
        res.json(data);
    } catch (error) {
        console.error('API Error: Company Scoring failed:', error);
        res.status(500).json({ error: "Risk score calculation failed" });
    }
});

module.exports = router;
