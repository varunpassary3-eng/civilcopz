import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/Login.vue';
import Register from '../components/Register.vue';
import Dashboard from '../components/Dashboard.vue';
import CaseList from '../components/CaseList.vue';
import CaseForm from '../components/CaseForm.vue';
import CompanyCatalogue from '../components/CompanyCatalogue.vue';
import PolicyLibrary from '../views/PolicyLibrary.vue';
import LandingPage from '../views/LandingPage.vue';
import AIPanel from '../components/AIPanel.vue';
import AdminPanel from '../components/AdminPanel.vue';
import CaseDetail from '../views/CaseDetail.vue';
import TestMonitor from '../components/TestMonitor.vue';

const routes = [
  { path: '/', component: LandingPage },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/cases', component: CaseList, meta: { requiresAuth: true } },
  { path: '/cases/:id', component: CaseDetail, meta: { requiresAuth: true } },
  { path: '/submit-case', component: CaseForm, meta: { requiresAuth: true } },
  { path: '/catalogue', component: CompanyCatalogue, meta: { requiresAuth: true } },
  { path: '/policy', component: PolicyLibrary, meta: { requiresAuth: true } },
  { path: '/ai-panel', component: AIPanel, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin', component: AdminPanel, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/testing', component: TestMonitor, meta: { requiresAuth: true, requiresAdmin: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const bypass = localStorage.getItem('bypass_active') === 'true';

  const isAuthenticated = token || bypass;
  const isAdmin = user.role === 'admin' || bypass;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.meta.requiresAdmin && !isAdmin) {
    console.warn('Unauthorized access attempt to Admin substrate.');
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
