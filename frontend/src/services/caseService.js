import { getCases, updateCaseStatus as apiUpdateStatus, createCase as apiCreateCase } from './api';

const CACHE_KEY = 'civilcopz_case_cache_v2';

// Load cached state from localStorage
function getLocalCache() {
  const cached = localStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : { pages: {}, lastSync: null };
}

// Save state to localStorage
function saveToLocalCache(state) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state));
}

// Synchronize local cache with remote database (Background Sync)
async function syncLocalCache(remoteCases, pagination, filters) {
  const state = getLocalCache();
  const cacheKey = JSON.stringify({ ...filters, page: pagination.page });
  
  // Update the specific page in cache
  state.pages[cacheKey] = {
    cases: remoteCases,
    pagination: pagination,
    timestamp: Date.now()
  };
  state.lastSync = Date.now();
  
  saveToLocalCache(state);
  return remoteCases;
}

export async function fetchCasesWithFilters(filters) {
  const state = getLocalCache();
  const cacheKey = JSON.stringify({ ...filters, page: filters.page || 1 });
  const cachedData = state.pages[cacheKey];

  // 1. Return cached data if it exists for this specific filter/page
  const initial = cachedData ? cachedData.cases : [];
  const initialPagination = cachedData ? cachedData.pagination : { total: 0, page: filters.page || 1, pages: 1, limit: 10 };
  
  // 2. Background fetch to update cache
  const fetchPromise = getCases(filters).then(async res => {
    const caseData = res.cases || (Array.isArray(res) ? res : []);
    const remotePagination = res.pagination || { total: caseData.length, page: filters.page || 1, pages: 1, limit: 10 };
    
    const syncedCases = await syncLocalCache(caseData, remotePagination, filters);
    
    return {
      cases: syncedCases,
      pagination: remotePagination
    };
  });

  return { 
    initial, 
    initialPagination,
    syncPromise: fetchPromise 
  };
}

export async function createCaseWithSync(caseData) {
  // 1. Optimistic UI: Add to a temporary 'pending' list in cache state
  const state = getLocalCache();
  const tempId = `temp_${Date.now()}`;
  const optimisticCase = { 
    ...caseData, 
    id: tempId, 
    status: 'Submitted', 
    createdAt: new Date().toISOString(),
    isPendingSync: true 
  };
  
  // We add it to a special 'pending' key instead of regular pages to simplify
  state.pending = [optimisticCase, ...(state.pending || [])];
  saveToLocalCache(state);

  // 2. Network request
  try {
    const remote = await apiCreateCase(caseData);
    // Remove from pending and invalidate cache to force refresh
    const currentState = getLocalCache();
    currentState.pending = (currentState.pending || []).filter(c => c.id !== tempId);
    currentState.pages = {}; // Invalidate for simplicity
    saveToLocalCache(currentState);
    return remote.case;
  } catch (error) {
    console.warn('[SYNC_ERROR] Remote submission failed, case preserved locally', error);
    throw error;
  }
}

export async function changeCaseStatus(id, status) {
  const res = await apiUpdateStatus(id, status);
  // Update local cache by iterating through all pages (aggressive update)
  const state = getLocalCache();
  Object.values(state.pages).forEach(page => {
    page.cases = page.cases.map(c => c.id === id ? { ...c, status } : c);
  });
  saveToLocalCache(state);
  return res;
}

export async function setCaseSatisfaction(id, satisfaction) {
  const { setSatisfaction } = await import('./api');
  const res = await setSatisfaction(id, satisfaction);
  // Update local cache
  const state = getLocalCache();
  Object.values(state.pages).forEach(page => {
    page.cases = page.cases.map(c => c.id === id ? { ...c, satisfaction, status: 'Satisfaction_Confirmed' } : c);
  });
  saveToLocalCache(state);
  return res;
}

export function getStatusColor(status) {
  const colors = {
    Draft: 'bg-slate-100 text-slate-800',
    Submitted: 'bg-blue-100 text-blue-800',
    Under_Review: 'bg-indigo-100 text-indigo-800',
    Notice_Sent: 'bg-purple-100 text-purple-800 border-purple-200',
    Company_Responded: 'bg-cyan-100 text-cyan-800',
    Negotiation_Mediation: 'bg-amber-100 text-amber-800',
    Escalated_to_Authority: 'bg-orange-100 text-orange-800',
    Court_Filed: 'bg-red-100 text-red-800',
    Judgment_Issued: 'bg-rose-100 text-rose-800',
    Resolved: 'bg-emerald-100 text-emerald-800',
    Satisfaction_Confirmed: 'bg-green-100 text-green-800',
    Closed: 'bg-slate-200 text-slate-600',
  };
  return colors[status] || 'bg-slate-100 text-slate-800';
}

/**
 * Calculate remaining days until notice deadline.
 */
export function getRemainingDays(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const future = new Date(deadline);
  const diffTime = future - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
}

/**
 * Map notice status to human-readable labels and colors.
 */
export function getNoticeStatusLabel(status) {
  const mapping = {
    SENT: { label: 'Sent via Multi-Channel', color: 'text-slate-400' },
    DELIVERED: { label: 'Delivered to Company', color: 'text-blue-500' },
    READ: { label: 'Read by Company', color: 'text-emerald-500 font-black' },
    EXPIRED: { label: 'Statutory Deadline Expired', color: 'text-red-500' },
    ESCALATED: { label: 'Escalated to Authority', color: 'text-red-600 font-bold' }
  };
  return mapping[status] || mapping.SENT;
}
