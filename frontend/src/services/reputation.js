import { api } from './api';

const scoreCache = new Map();
const pendingRequests = new Map();

/**
 * CivilCOPZ Reputation API Client (Operations-Grade - Phase 11)
 * Fetches real-time industrial risk scores with Thundering Herd protection.
 */
export async function getCompanyScore(companyName) {
  if (!companyName) return null;

  // 1. Check cache first
  if (scoreCache.has(companyName)) {
    return scoreCache.get(companyName);
  }

  // 2. Check if a request is already in flight (Promise Coalescing)
  if (pendingRequests.has(companyName)) {
    return pendingRequests.get(companyName);
  }

  // 3. Fire new request
  const requestPromise = (async () => {
    try {
      const response = await api.get(`/company/${encodeURIComponent(companyName)}/score`);
      scoreCache.set(companyName, response.data);
      return response.data;
    } catch (error) {
      console.error(`[REPUTATION_API_ERROR] Failed to fetch score for ${companyName}:`, error);
      return null;
    } finally {
      // Cleanup pending request after completion
      pendingRequests.delete(companyName);
    }
  })();

  pendingRequests.set(companyName, requestPromise);
  return requestPromise;
}

export async function getTopRiskCompanies(limit = 5) {
  try {
    const response = await api.get(`/reputation/top-risks`, { params: { limit } });
    return response.data;
  } catch (error) {
    console.error('[REPUTATION_API_ERROR] Failed to fetch top risk companies:', error);
    return [];
  }
}
