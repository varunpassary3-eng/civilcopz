<template>
  <div class="relative pl-8 space-y-6">
    <!-- Vertical Line -->
    <div class="absolute left-[3px] top-1 bottom-1 w-[2px] bg-slate-100 dark:bg-gov-dark-800"></div>

    <div v-for="(item, index) in timeline" :key="index" class="relative group">
      <!-- Marker dot -->
      <div 
        class="absolute left-[-33px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-gov-dark-900 ring-4 ring-slate-50 dark:ring-gov-dark-950 transition-all duration-300"
        :class="index === 0 ? 'bg-gov-primary-600 ring-gov-primary-600/10' : 'bg-slate-200 dark:bg-slate-700 ring-slate-100 dark:ring-gov-dark-800'"
      ></div>

      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h4 class="text-[11px] font-black uppercase tracking-wider transition-colors" :class="index === 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'">
            {{ item.action }}
          </h4>
          <span v-if="index === 0" class="text-[8px] font-black uppercase px-2 py-0.5 bg-gov-primary-600 text-white rounded-md tracking-widest animate-pulse">Latest Action</span>
        </div>
        <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {{ formatDate(item.timestamp) }}
        </p>
        
        <div v-if="item.status" class="mt-2 text-[10px] font-medium text-slate-500 italic flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
           <span>Status Classification updated to:</span>
           <span class="text-gov-primary-600 font-black">{{ item.status }}</span>
        </div>
      </div>
    </div>

    <!-- Empty state if no history yet -->
    <div v-if="!timeline || timeline.length === 0" class="text-xs text-slate-400 italic py-4">
      No official court actions recorded for this case ID.
    </div>
  </div>
</template>

<script setup>
defineProps({
  timeline: {
    type: Array,
    default: () => []
  }
});

function formatDate(date) {
  if (!date) return 'Processing...';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>
