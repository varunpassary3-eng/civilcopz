<template>
  <div 
    v-if="recommendations.length > 0" 
    class="backdrop-blur-md bg-white/60 dark:bg-gov-dark-900/60 border border-white/20 dark:border-gov-dark-800/50 p-6 rounded-3xl shadow-xl mt-6 relative overflow-hidden group"
  >
    <div class="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        class="h-24 w-24 text-gov-primary-600" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" 
        />
      </svg>
    </div>
    
    <div class="relative z-10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-black uppercase tracking-widest text-gov-primary-600 flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            class="h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          Recommended Action Space
        </h3>
        <span class="text-[9px] font-bold bg-gov-primary-600/10 px-2 py-1 rounded text-gov-primary-600 uppercase tracking-widest">Sponsored / Promoted</span>
      </div>
      
      <div class="space-y-4">
        <div 
          v-for="service in recommendations" 
          :key="service.id" 
          class="p-4 bg-white/80 dark:bg-gov-dark-950/80 rounded-2xl border border-slate-100 dark:border-gov-dark-800 hover:border-gov-primary-600/30 hover:shadow-lg transition-all flex gap-4 items-start"
        >
          <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gov-dark-900 flex items-center justify-center text-xl shadow-inner shrink-0">
            {{ service.isProBono ? '🤝' : '💼' }}
          </div>
          <div class="flex-1">
            <div class="flex items-start justify-between">
              <h4 class="font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                {{ service.name }}
              </h4>
              <span 
                v-if="service.isProBono" 
                class="text-[8px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-sm uppercase font-black tracking-widest"
              >Pro-Bono</span>
            </div>
            <p class="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-medium">
              {{ service.description }}
            </p>
            <div class="flex items-center gap-3 mt-3">
              <span 
                v-if="service.contactEmail" 
                class="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  class="h-3 w-3" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                  />
                </svg>
                {{ service.contactEmail }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import adService from '../services/adService';

const props = defineProps({
  category: {
    type: String,
    default: ''
  },
  severity: {
    type: String,
    default: 'Medium'
  }
});

const recommendations = ref([]);

const fetchRecommendations = async () => {
  if (!props.category) return;
  try {
    const services = await adService.getRecommendations(props.category, props.severity);
    recommendations.value = services || [];
  } catch (e) {
    console.error('Failed to load Ad Space recommendations');
  }
};

onMounted(() => {
  fetchRecommendations();
});

watch(() => props.category, () => {
  fetchRecommendations();
});
</script>
