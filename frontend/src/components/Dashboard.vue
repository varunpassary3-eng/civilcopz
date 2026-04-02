<template>
  <div class="space-y-6">
    <!-- Header Summary Section -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="backdrop-blur-md bg-white/60 dark:bg-gov-dark-900/60 border border-white/20 dark:border-gov-dark-800/50 p-6 rounded-3xl shadow-xl hover:shadow-indigo-500/10 transition-all group">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Total Jurisdiction</p>
        <p class="text-3xl font-black text-slate-900 dark:text-white group-hover:text-gov-primary-600 transition-colors">{{ totalCases }} Cases</p>
      </div>
      <div class="backdrop-blur-md bg-white/60 dark:bg-gov-dark-900/60 border border-white/20 dark:border-gov-dark-800/50 p-6 rounded-3xl shadow-xl hover:shadow-orange-500/10 transition-all group">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Active Review</p>
        <p class="text-3xl font-black text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">{{ counts.pending }} Pending</p>
      </div>
      <div class="backdrop-blur-md bg-white/60 dark:bg-gov-dark-900/60 border border-white/20 dark:border-gov-dark-800/50 p-6 rounded-3xl shadow-xl hover:shadow-green-500/10 transition-all group">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Closure Rate</p>
        <p class="text-3xl font-black text-slate-900 dark:text-white group-hover:text-green-500 transition-colors">{{ counts.resolved }} Resolved</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Top Companies Card -->
      <div class="backdrop-blur-md bg-white/60 dark:bg-gov-dark-900/60 border border-white/20 dark:border-gov-dark-800/50 p-8 rounded-3xl shadow-xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-black uppercase tracking-tighter text-slate-800 dark:text-slate-200">System Heatmap</h3>
          <span class="text-[10px] font-bold bg-slate-100 dark:bg-gov-dark-950 px-2 py-1 rounded text-slate-400 uppercase tracking-widest">Top Offenders</span>
        </div>
        <div class="space-y-4">
          <div v-for="(item, index) in topCompanies" :key="item.company" class="flex items-center gap-4 bg-slate-50/50 dark:bg-gov-dark-950/30 p-4 rounded-2xl border border-transparent hover:border-gov-primary-600/30 transition-all">
            <span class="w-8 h-8 flex items-center justify-center bg-gov-primary-600 text-white rounded-lg font-black text-xs shadow-glow-indigo">{{ index + 1 }}</span>
            <div class="flex-1">
              <p class="text-sm font-black text-slate-700 dark:text-slate-300">{{ item.company }}</p>
              <div class="w-full bg-slate-200 dark:bg-gov-dark-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div class="bg-gov-primary-600 h-full rounded-full" :style="{ width: (item.count / totalCases * 100) + '%' }"></div>
              </div>
            </div>
            <span class="text-xs font-black text-slate-400">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- Legal Advisory Card -->
      <div class="backdrop-blur-md bg-white/60 dark:bg-gov-dark-900/60 border border-white/20 dark:border-gov-dark-800/50 p-8 rounded-3xl shadow-xl">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-black uppercase tracking-tighter text-gov-primary-600">Legal Directorate</h3>
          <span class="text-[10px] font-bold bg-gov-primary-600/10 px-2 py-1 rounded text-gov-primary-600 uppercase tracking-widest">Verified Advice</span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">Industrial-grade legal support matching your current grievances.</p>
        
        <div v-if="loadingServices" class="flex flex-col items-center justify-center py-10 gap-3">
          <div class="w-8 h-8 border-4 border-gov-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-[10px] font-black uppercase text-slate-400 animate-pulse">Synchronizing Records...</span>
        </div>
        
        <div v-else class="space-y-4">
          <div v-for="service in advisoryServices" :key="service.id" class="p-4 bg-white/40 dark:bg-gov-dark-950/20 rounded-2xl border border-white/10 dark:border-gov-dark-800 hover:shadow-glow-indigo transition-all">
            <div class="flex justify-between items-start mb-2">
              <h4 class="font-black text-sm text-slate-800 dark:text-slate-200">{{ service.name }}</h4>
              <span v-if="service.isProBono" class="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full uppercase font-black tracking-widest">Pro-Bono</span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-3">{{ service.description }}</p>
            <div class="flex gap-4">
              <a v-if="service.website" :href="service.website" target="_blank" class="text-[10px] font-black text-gov-primary-600 uppercase tracking-widest hover:underline">Establish Link</a>
              <span v-if="service.contactEmail" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ service.contactEmail }}</span>
            </div>
          </div>
          <p v-if="advisoryServices.length === 0" class="text-sm text-slate-400 italic py-10 text-center uppercase tracking-widest text-[10px] font-black">No Active Records</p>
        </div>
      </div>
    </div>

    <!-- Admin Operations -->
    <div v-if="isAdmin" class="pt-6 border-t border-slate-200 dark:border-gov-dark-800 flex justify-center">
      <router-link to="/cases" class="group flex items-center gap-3 bg-gov-dark-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-gov-primary-600 hover:-translate-y-1 transition-all">
        Administrative Control Panel
        <span class="group-hover:translate-x-1 transition-transform">→</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { fetchCompanyStats } from '../services/api';
import { getCurrentUser } from '../services/auth';
import adService from '../services/adService';

const companyStats = ref([]);
const advisoryServices = ref([]);
const stats = ref({});
const loadingServices = ref(true);

const isAdmin = computed(() => {
  const user = getCurrentUser();
  return user && user.role === 'admin';
});

const totalCases = computed(() => {
  return (companyStats.value || []).reduce((sum, item) => sum + item.count, 0);
});

const counts = computed(() => {
  return { 
    pending: stats.value.pendingCount || 0, 
    review: stats.value.reviewCount || 0, 
    resolved: stats.value.resolvedCount || 0 
  };
});

const topCompanies = computed(() => companyStats.value || []);

onMounted(async () => {
  try {
    const statsPromise = fetchCompanyStats();
    const servicesPromise = adService.listServices({ isProBono: 'true' });
    
    const [statsRes, services] = await Promise.all([statsPromise, servicesPromise]);
    
    companyStats.value = statsRes.summary?.topOffenders || [];
    stats.value = {
      pendingCount: statsRes.summary?.totalGrievances,
      resolvedCount: 0 
    };
    advisoryServices.value = (services || []).slice(0, 3);
  } catch (error) {
    console.warn('[DASHBOARD_SYNC_NOTICE] Infrastructure offline. Engaging Local-First fallback.');
    // Fallback to local storage computation
    const localCases = JSON.parse(localStorage.getItem('civilcopz_case_cache')) || [];
    const companies = {};
    localCases.forEach(c => {
      companies[c.company] = (companies[c.company] || 0) + 1;
    });

    companyStats.value = Object.entries(companies).map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    stats.value = {
      pendingCount: localCases.length,
      resolvedCount: localCases.filter(c => c.status === 'Resolved').length
    };
    
    // Static fallback for services if offline
    advisoryServices.value = [
      { id: 1, name: 'Consumer Helpline (Offline)', description: 'Government toll-free helpline for immediate consumer guidance.', isProBono: true }
    ];
  } finally {
    loadingServices.value = false;
  }
});
</script>

