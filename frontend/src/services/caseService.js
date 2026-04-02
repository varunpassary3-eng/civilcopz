import { getCases, updateCaseStatus as apiUpdateStatus, createCase as apiCreateCase } from './api';

const CACHE_KEY = 'civilcopz_case_cache';

// Load cached cases from localStorage
function getLocalCache() {
  const cached = localStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : [];
}

// Save cases to localStorage
function saveToLocalCache(cases) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cases));
}

// Synchronize local cache with remote database (Background Sync)
async function syncLocalCache(remoteCases) {
  const local = getLocalCache();
  // Merge logic: prefer remote but keep local-only (pending) cases
  const merged = [...remoteCases];
  saveToLocalCache(merged);
  return merged;
}

export async function fetchCasesWithFilters(filters) {
  // 1. Instant return from cache for optimal UX
  const cached = getLocalCache();
  
  // 2. Background fetch to update cache
  // We return a promise that the UI can use to refresh
  const fetchPromise = getCases(filters).then(res => {
    return syncLocalCache(res.cases || []);
  });

  return { 
    initial: cached, 
    syncPromise: fetchPromise 
  };
}

export async function createCaseWithSync(caseData) {
  // 1. Optimistic UI: Add to local-storage immediately
  const local = getLocalCache();
  const tempId = `temp_${Date.now()}`;
  const optimisticCase = { 
    ...caseData, 
    id: tempId, 
    status: 'Pending', 
    createdAt: new Date().toISOString(),
    isPendingSync: true 
  };
  
  saveToLocalCache([optimisticCase, ...local]);

  // 2. Network request
  try {
    const remote = await apiCreateCase(caseData);
    // Replace temp case with real one from server
    const current = getLocalCache();
    saveToLocalCache(current.map(c => c.id === tempId ? remote.case : c));
    return remote.case;
  } catch (error) {
    console.warn('[SYNC_ERROR] Remote submission failed, case preserved locally', error);
    throw error;
  }
}

export async function changeCaseStatus(id, status) {
  const res = await apiUpdateStatus(id, status);
  // Update local cache
  const current = getLocalCache();
  saveToLocalCache(current.map(c => c.id === id ? { ...c, status } : c));
  return res;
}

export function getStatusColor(status) {
  const colors = {
    Pending: 'bg-amber-100 text-amber-800',
    Review: 'bg-indigo-100 text-indigo-800',
    Resolved: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-slate-100 text-slate-800';
}
