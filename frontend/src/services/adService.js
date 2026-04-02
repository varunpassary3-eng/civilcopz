import api from './api';

export default {
  /**
   * Get recommended advisory services based on category and severity
   * @param {string} category 
   * @param {string} severity 
   */
  async getRecommendations(category, severity) {
    try {
      const response = await api.get('/ads/recommendations', {
        params: { category, severity }
      });
      return response.data.services || [];
    } catch (error) {
      console.error('Failed to fetch ad recommendations:', error);
      return [];
    }
  },

  /**
   * List all available support services
   * @param {Object} filters 
   */
  async listServices(filters = {}) {
    const response = await api.get('/ads/list', { params: filters });
    return response.data.services || [];
  }
};
