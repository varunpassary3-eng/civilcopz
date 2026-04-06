<template>
  <div class="relative overflow-hidden pt-12 pb-24">
    <!-- Hero Section -->
    <section class="max-w-6xl mx-auto px-4 text-center relative z-10">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gov-primary-600/10 border border-gov-primary-600/20 mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-gov-primary-600 opacity-75" />
          <span class="relative inline-flex rounded-full h-2 w-2 bg-gov-primary-600" />
        </span>
        <span class="text-[10px] font-black uppercase tracking-widest text-gov-primary-600">National Sovereign Substrate v2.0 Live</span>
      </div>

      <h1 class="text-5xl md:text-7xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-[0.9] mb-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        The Future of <br>
        <span class="bg-clip-text text-transparent bg-gradient-to-r from-gov-primary-600 via-indigo-400 to-gov-primary-800">Civil Governance</span>
      </h1>

      <p class="max-w-2xl mx-auto text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-100">
        CivilCOPZ is the industrial-grade gateway for Indian consumers to enforce their rights, archive grievances, and hold corporate entities accountable through AI-driven legal intelligence.
      </p>

      <div class="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-200">
        <router-link
          to="/register"
          class="w-full md:w-auto bg-gov-primary-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-glow-indigo hover:bg-gov-primary-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          Initiate Official Review
          <span class="text-xl">→</span>
        </router-link>
        <router-link
          to="/cases"
          class="w-full md:w-auto bg-white/70 dark:bg-gov-dark-900/80 backdrop-blur-md border border-slate-200 dark:border-gov-dark-800 text-slate-900 dark:text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-50 dark:hover:bg-gov-dark-800 transition-all active:scale-95"
        >
          Browse Archives
        </router-link>
      </div>
    </section>

    <!-- Sovereign Metrics Grid -->
    <section class="max-w-6xl mx-auto px-4 mt-32">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div
          v-for="metric in metrics"
          :key="metric.label"
          class="backdrop-blur-xl bg-white/40 dark:bg-gov-dark-900/40 border border-white/20 dark:border-gov-dark-800/50 p-10 rounded-[3rem] shadow-xl hover:shadow-glow-indigo/5 transition-all group overflow-hidden relative"
        >
          <div class="absolute top-0 right-0 w-24 h-24 bg-gov-primary-600/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            {{ metric.label }}
          </p>
          <h3 class="text-5xl font-black text-slate-900 dark:text-white tabular-nums">
            {{ metric.value }}
          </h3>
          <p class="text-xs font-bold text-gov-primary-600 mt-4 uppercase tracking-tight">
            {{ metric.subtext }}
          </p>
        </div>
      </div>
    </section>

    <!-- High Impact Features -->
    <section class="max-w-6xl mx-auto px-4 mt-40">
      <div class="flex flex-col md:flex-row items-center gap-20">
        <div class="flex-1 space-y-8">
          <div>
            <h2 class="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-4">
              Sovereign <br>Intelligence Layer
            </h2>
            <p class="text-slate-500 dark:text-slate-400 font-medium">
              Auto-classify your grievances with industrial AI trained on the Consumer Protection Act, 2019.
            </p>
          </div>
          <div class="space-y-6">
            <div
              v-for="feature in features"
              :key="feature.title"
              class="flex gap-5"
            >
              <div class="w-12 h-12 bg-gov-primary-600/10 rounded-2xl flex items-center justify-center shrink-0 border border-gov-primary-600/20">
                <span class="text-xl">{{ feature.icon }}</span>
              </div>
              <div>
                <h4 class="font-black text-sm uppercase text-slate-800 dark:text-slate-200 mb-1">
                  {{ feature.title }}
                </h4>
                <p class="text-xs text-slate-500 font-medium leading-relaxed">
                  {{ feature.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Glassmorphic Card Mockup -->
        <div class="flex-1 relative">
          <div class="absolute inset-0 bg-gov-primary-600/20 blur-[120px] rounded-full" />
          <div class="backdrop-blur-3xl bg-white/60 dark:bg-gov-dark-900/60 border border-white/20 dark:border-gov-dark-800/50 p-8 rounded-[3.5rem] shadow-3xl rotate-3 hover:rotate-0 transition-all duration-700">
            <div class="flex items-center gap-4 mb-8">
              <div class="w-10 h-10 bg-gov-primary-600 rounded-2xl shadow-glow-indigo" />
              <div class="h-4 w-32 bg-slate-200 dark:bg-gov-dark-800 rounded-full" />
            </div>
            <div class="space-y-4 mb-8">
              <div class="h-6 w-full bg-slate-200 dark:bg-gov-dark-800 rounded-full animate-pulse" />
              <div class="h-6 w-3/4 bg-slate-100 dark:bg-gov-dark-950 rounded-full" />
              <div class="h-20 w-full bg-slate-50/50 dark:bg-gov-dark-950/50 rounded-2xl" />
            </div>
            <div class="flex justify-between border-t border-slate-100 dark:border-gov-dark-800 pt-6">
              <div class="w-16 h-4 bg-gov-primary-600/20 rounded-full" />
              <div class="w-16 h-4 bg-slate-100 dark:bg-gov-dark-950 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Dynamic CTA -->
    <section class="max-w-4xl mx-auto px-4 mt-40">
      <div class="bg-gov-dark-900 rounded-[4rem] p-16 md:p-24 text-center relative overflow-hidden shadow-2xl">
        <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.2),transparent)]" />
        <h2 class="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-8 relative z-10">
          Reclaim Your <br>Consumer Sovereignty
        </h2>
        <div class="flex flex-col md:flex-row justify-center gap-4 relative z-10">
          <router-link
            to="/register"
            class="bg-white text-gov-dark-900 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all"
          >
            Join the Directorate
          </router-link>
          <router-link
            to="/login"
            class="bg-gov-dark-800 text-white border border-white/20 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gov-dark-700 transition-all"
          >
            Personnel Access
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const metrics = ref([
  { label: 'Total Grievances Resolved', value: '42K+', subtext: '+12% This Quarter' },
  { label: 'Active Personnel', value: '850K+', subtext: 'Serving Pan-India' },
  { label: 'Closure Rate', value: '94.2%', subtext: 'Industrial Benchmark' }
]);

const features = [
  { 
    title: 'Instant Resilience Sync', 
    icon: '⚡',
    description: 'Local-first architecture ensures your data is never lost, even in disconnected environments.' 
  },
  { 
    title: 'Legal Section Mapping', 
    icon: '⚖️',
    description: 'Automatic linkage to the Consumer Protection Act, 2019 for high-impact legal standing.' 
  },
  { 
    title: 'Corporate BrandHub', 
    icon: '🏢',
    description: 'Public metrics and aggregation for high-risk corporate entities.' 
  }
];
</script>

<style scoped>
.shadow-3xl {
  box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.4);
}
</style>
