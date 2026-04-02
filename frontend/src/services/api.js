import axios from 'axios';
import { setAuthHeader } from './auth';

const api = axios.create({
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
  Object.keys(caseData).forEach(key => {
    if (caseData[key]) formData.append(key, caseData[key]);
  });

  const response = await api.post('/cases', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateCaseStatus(id, status) {
  const response = await api.patch(`/cases/${id}/status`, { status });
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
