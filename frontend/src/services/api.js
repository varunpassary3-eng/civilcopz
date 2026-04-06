import axios from 'axios';
import { setAuthHeader } from './auth';

// CivilCOPZ National-Grade API Substrate (Phase 11)
// Enforces Port 4000 as the single backend gateway.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
});

setAuthHeader();

export async function getCases(params = {}) {
  const response = await api.get('/cases', { params });
  return response.data;
}

export const fetchCasesWithFilters = getCases;

export async function getCaseById(id) {
  const response = await api.get(`/cases/${id}`);
  return response.data;
}

export async function createCase(caseData) {
  const formData = new FormData();
  
  // Append standard fields
  Object.keys(caseData).forEach(key => {
    if (key !== 'documents' && caseData[key] !== undefined && caseData[key] !== null) {
      formData.append(key, caseData[key]);
    }
  });

  // Append multiple documents
  if (caseData.documents && caseData.documents.length > 0) {
    for (let i = 0; i < caseData.documents.length; i++) {
      formData.append('documents', caseData.documents[i]);
    }
  }

  const response = await api.post('/cases', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateCaseStatus(id, status, actionDescription = null) {
  const response = await api.patch(`/cases/${id}/status`, { status, actionDescription });
  return response.data;
}

export async function setSatisfaction(id, satisfaction) {
  const response = await api.patch(`/cases/${id}/satisfaction`, { satisfaction });
  return response.data;
}

export async function fetchCompanyStats() {
  const response = await api.get('/cases/company/stats');
  return response.data;
}

export async function fetchCompanyCatalogue(params = {}) {
  const response = await api.get('/cases/company/catalogue', { params });
  return response.data;
}

export async function registerUser(payload) {
  const response = await api.post('/users/register', payload);
  return response.data;
}

export async function loginUser(payload) {
  const response = await api.post('/users/login', payload);
  return response.data;
}
export default api;
