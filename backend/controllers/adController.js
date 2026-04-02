const adService = require('../services/adService');

async function getRecommendations(req, res) {
  const { category, severity } = req.query;

  if (!category) {
    return res.status(400).json({ error: 'Category is required for recommendations' });
  }

  try {
    const services = await adService.getRecommendedServices(category, severity);
    return res.json({
      success: true,
      category,
      services
    });
  } catch (error) {
    console.error('[AD_CONTROLLER_ERROR] getRecommendations:', error);
    return res.status(500).json({ error: 'Unable to fetch advisory recommendations' });
  }
}

async function listAllServices(req, res) {
  try {
    const services = await adService.listAllServices(req.query);
    return res.json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    console.error('[AD_CONTROLLER_ERROR] listAllServices:', error);
    return res.status(500).json({ error: 'Unable to list advisory services' });
  }
}

module.exports = {
  getRecommendations,
  listAllServices,
};
