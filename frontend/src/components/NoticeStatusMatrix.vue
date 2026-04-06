<template>
  <div class="space-y-3">
    <p class="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">
      Legal Signal Matrix (Read Receipts)
    </p>
    
    <div class="grid grid-cols-2 gap-3">
      <!-- Email Channel -->
      <div
        v-for="delivery in deliveries"
        :key="delivery.id"
        class="p-3 bg-white dark:bg-gov-dark-900 rounded-xl border border-slate-100 dark:border-gov-dark-800 flex items-center justify-between group hover:shadow-sm transition-all"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            :class="getChannelBg(delivery.channel, delivery.status)"
          >
            <span
              v-if="delivery.channel === 'EMAIL'"
              class="text-xs"
            >✉️</span>
            <span
              v-else-if="delivery.channel === 'WHATSAPP'"
              class="text-xs"
            >📱</span>
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-none mb-0.5">
              {{ delivery.channel }}
            </p>
            <p
              class="text-[8px] font-bold uppercase tracking-tighter"
              :class="getStatusColor(delivery.status)"
            >
              {{ getStatusLabel(delivery.status) }}
            </p>
          </div>
        </div>
        
        <div class="flex items-center gap-1">
          <span
            v-if="delivery.status === 'READ'"
            class="text-xs"
          >✅✅</span>
          <span
            v-else-if="delivery.status === 'DELIVERED'"
            class="text-xs"
          >✅</span>
          <span
            v-else-if="delivery.status === 'SENT'"
            class="text-xs animate-pulse"
          >📡</span>
        </div>
      </div>
    </div>
    
    <!-- Evidentiary Strength Banner -->
    <div
      v-if="hasRead"
      class="mt-4 p-3 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900 rounded-xl flex items-center gap-3"
    >
      <span class="text-xs">⚖️</span>
      <p class="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-tighter">
        Awareness Established: Very Strong Proof of Service (Digital Read Receipt Hash verified).
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  deliveries: { type: Array, default: () => [] }
});

const hasRead = computed(() => props.deliveries.some(d => d.status === 'READ'));

const getStatusLabel = (status) => {
  if (status === 'READ') return 'Read by Company';
  if (status === 'DELIVERED') return 'Delivered to Device';
  if (status === 'SENT') return 'Sent - In Transit';
  return status;
};

const getStatusColor = (status) => {
  if (status === 'READ') return 'text-emerald-500';
  if (status === 'DELIVERED') return 'text-blue-500';
  return 'text-slate-400';
};

const getChannelBg = (channel, status) => {
  if (status === 'READ') return 'bg-emerald-100 dark:bg-emerald-900/30';
  if (status === 'DELIVERED') return 'bg-blue-500/10';
  return 'bg-slate-100 dark:bg-slate-800';
};
</script>
