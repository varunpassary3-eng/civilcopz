<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
    <div class="max-w-6xl mx-auto space-y-8">
      <!-- National Header -->
      <header class="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 class="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            National Control <span class="text-blue-600">Panel</span>
          </h1>
          <p class="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
            Sovereign Intelligence Substrate v1.1
          </p>
        </div>
        <div class="flex gap-4">
          <div class="text-right">
            <p class="text-[10px] font-black uppercase text-slate-400">
              System Status
            </p>
            <p class="text-xs font-bold text-green-500">
              OPTIMAL / SOVEREIGN
            </p>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- AI Intelligence Widget -->
        <div class="lg:col-span-2">
          <AIPanel />
        </div>

        <!-- Management Stats -->
        <div class="space-y-6">
          <div class="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 text-center">
              Industrial Metrics
            </h3>
            <div class="space-y-4">
              <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                <span class="text-sm font-bold text-slate-600 dark:text-slate-400">Sovereign Capacity</span>
                <span class="text-blue-600 font-black">94%</span>
              </div>
              <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                <span class="text-sm font-bold text-slate-600 dark:text-slate-400">AI Accuracy</span>
                <span class="text-green-500 font-black">98.2%</span>
              </div>
            </div>
          </div>

          <div class="p-6 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
            <h3 class="text-xs font-black uppercase tracking-widest opacity-70 mb-2">
              Platform Maturity
            </h3>
            <p class="text-lg font-bold mb-4 italic">
              "CivilCOPZ is currently handling 2,400 grievance analysis threads in parallel."
            </p>
            <button class="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all backdrop-blur-sm">
              Scale Ops Layer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import AIPanel from './AIPanel.vue';
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
