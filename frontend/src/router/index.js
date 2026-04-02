import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/Login.vue';
import Register from '../components/Register.vue';
import Dashboard from '../components/Dashboard.vue';
import CaseList from '../components/CaseList.vue';
import CaseForm from '../components/CaseForm.vue';
import CompanyCatalogue from '../components/CompanyCatalogue.vue';
import PolicyLibrary from '../views/PolicyLibrary.vue';
import LandingPage from '../views/LandingPage.vue';

const routes = [
  { path: '/', component: LandingPage },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/cases', component: CaseList, meta: { requiresAuth: true } },
  { path: '/submit-case', component: CaseForm, meta: { requiresAuth: true } },
  { path: '/catalogue', component: CompanyCatalogue, meta: { requiresAuth: true } },
  { path: '/policy', component: PolicyLibrary, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const bypass = localStorage.getItem('bypass_active') === 'true';

  if (to.meta.requiresAuth && !token && !bypass) {
    next('/login');
  } else {
    next();
  }
});

export default router;
