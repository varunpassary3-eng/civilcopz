<template>
  <div class="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
    <!-- Newsletter Header / Hero -->
    <header class="relative p-12 bg-gov-dark-900 rounded-[3rem] overflow-hidden shadow-2xl">
      <div class="absolute top-0 right-0 p-8 opacity-10">
        <span class="text-8xl font-black text-white italic">SHAME</span>
      </div>
      
      <div class="relative z-10 space-y-4">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
          <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span class="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">Live Intelligence Feed</span>
        </div>
        
        <h2 class="text-5xl font-black tracking-tighter text-white leading-none">THE INDUSTRY<br/><span class="text-gov-primary-400">HALL OF SHAME</span></h2>
        <p class="max-w-xl text-slate-400 text-sm font-medium leading-relaxed">
          The CivilCOPZ "Name & Shame" intelligence report. A formula-driven ranking of companies based on public consumer grievances and court order history.
        </p>

        <div class="flex gap-4 pt-4">
          <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p class="text-[10px] font-black uppercase text-slate-500 mb-1">Total Tracked</p>
            <p class="text-2xl font-black text-white">{{ stats.trackedCompanies }} Companies</p>
          </div>
          <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p class="text-[10px] font-black uppercase text-slate-500 mb-1">Live Grievances</p>
            <p class="text-2xl font-black text-white">{{ stats.totalGrievanceCount }} Records</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Top Hall of Shame (Top Offenders) -->
    <section class="space-y-6">
      <div class="flex items-center justify-between px-2">
        <h3 class="text-xl font-black uppercase tracking-tighter">🚨 Primary Risk Alerts</h3>
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Sorted by impact volume</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          v-for="(company, index) in topOffenders" 
          :key="company.id"
          class="group relative backdrop-blur-md bg-white dark:bg-gov-dark-900 border border-slate-200 dark:border-gov-dark-800 p-8 rounded-[2rem] shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
        >
          <!-- Ranking Badge -->
          <div class="absolute top-0 right-0 px-6 py-4 bg-red-600 text-white font-black text-xl italic skew-x-[-12deg] translate-x-2 translate-y-[-2px]">
            #{{ index + 1 }}
          </div>
          
          <div class="space-y-4">
            <div>
              <p class="text-[9px] font-black uppercase text-red-500 tracking-widest mb-1">{{ company.shameStatus }}</p>
              <h4 class="text-2xl font-black tracking-tight group-hover:text-gov-primary-600 transition-colors">{{ company.name }}</h4>
            </div>

            <div class="flex items-center gap-6">
              <div>
                <p class="text-[9px] font-black uppercase text-slate-400 mb-0.5">Complaints</p>
                <p class="text-lg font-black">{{ company.totalComplaints }}</p>
              </div>
              <div class="h-8 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
              <div>
                <p class="text-[9px] font-black uppercase text-slate-400 mb-0.5">Trend</p>
                <p class="text-lg font-black text-red-500">↑ {{ company.trend }}</p>
              </div>
            </div>

            <button class="w-full py-3 bg-slate-100 dark:bg-gov-dark-950 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-gov-primary-600 hover:text-white rounded-xl transition-all">
              View Detailed Analytics
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- News Style Shoutout / Ticker -->
    <section class="bg-red-600 text-white p-4 rounded-2xl overflow-hidden shadow-glow-indigo">
      <div class="flex items-center gap-8 whitespace-nowrap animate-marquee">
          <span v-for="n in 10" :key="n" class="flex items-center gap-4 text-xs font-black uppercase tracking-widest">
            <span class="w-2 h-2 bg-white rounded-full"></span>
            URGENCY: {{ topOffenders[0]?.name }} REPORTED AGAIN IN {{ topOffenders[0]?.category }}
          </span>
      </div>
    </section>

    <!-- Full Catalogue List -->
    <section class="space-y-8">
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-black uppercase tracking-tighter">Full Consumer Intelligence Catalog</h3>
        <div class="flex gap-4">
           <input 
            v-model="search"
            placeholder="Search company database..."
            class="bg-white/50 dark:bg-gov-dark-900/50 border border-slate-200 dark:border-gov-dark-800 p-2.5 px-6 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-gov-primary-600 w-64"
           />
        </div>
      </div>

      <div class="bg-white/40 dark:bg-gov-dark-900/40 border border-slate-200 dark:border-gov-dark-800 rounded-[2.5rem] overflow-hidden">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-gov-dark-800/50">
              <th class="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Entity Name</th>
              <th class="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Sector</th>
              <th class="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Volume</th>
              <th class="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Risk Level</th>
              <th class="px-8 py-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-gov-dark-800">
            <tr v-for="company in catalog" :key="company.id" class="hover:bg-slate-50 dark:hover:bg-gov-dark-800/20 transition-all">
              <td class="px-8 py-6 font-black text-sm">{{ company.name }}</td>
              <td class="px-8 py-6">
                <span class="text-[9px] font-black uppercase px-2 py-1 bg-slate-100 dark:bg-gov-dark-950 rounded-lg text-slate-500">{{ company.category }}</span>
              </td>
              <td class="px-8 py-6 font-black text-sm text-slate-700 dark:text-slate-300">{{ company.totalComplaints }} Cases</td>
              <td class="px-8 py-6">
                <span class="text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-sm" :class="getRiskClass(company.shameStatus)">
                  {{ company.shameStatus }}
                </span>
              </td>
              <td class="px-8 py-6 text-right">
                <button class="text-gov-primary-600 font-black text-[10px] uppercase hover:underline">Full Report</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Strict Legal Disclaimer Footer (Local to this sensitive page) -->
    <div class="p-8 border-2 border-slate-200 dark:border-gov-dark-800 rounded-3xl bg-slate-50 dark:bg-gov-dark-950/40">
      <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Legal Disclaimer & Data Sourcing Protocol</p>
      <p class="text-xs text-slate-600 dark:text-slate-500 leading-relaxed italic">
        "All information are backed and sourced from respective legal courts and public and are system generated formula driven and no human intervention and any updation and adjustment happens only on court orders."
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { fetchCompanyCatalogue, fetchCompanyStats } from '../services/api';

const search = ref('');
const companies = ref([]);
const stats = ref({ trackedCompanies: 0, totalGrievanceCount: 0 });

const topOffenders = computed(() => {
  return [...companies.value].sort((a, b) => b.totalComplaints - a.totalComplaints).slice(0, 3);
});

const catalog = computed(() => {
  if (!search.value) return companies.value;
  return companies.value.filter(c => c.name.toLowerCase().includes(search.value.toLowerCase()));
});

function getRiskClass(status) {
  if (status === 'CRITICAL_OFFENDER') return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  if (status === 'RECURRING_OFFENDER') return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
  return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
}

onMounted(async () => {
  try {
    const [catRes, statsRes] = await Promise.all([
       fetchCompanyCatalogue(),
       fetchCompanyStats()
    ]);
    companies.value = catRes.companies || [];
    stats.value = {
        trackedCompanies: statsRes.summary?.trackedCompanies || 0,
        totalGrievanceCount: statsRes.summary?.totalGrievances || 0
    };
  } catch (error) {
    console.error('Failed to load catalogue', error);
  }
});
</script>

<style scoped>
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee {
  display: inline-flex;
  animation: marquee 20s linear infinite;
}
</style>
