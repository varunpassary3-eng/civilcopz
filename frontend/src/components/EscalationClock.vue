<template>
  <div
    class="p-4 rounded-2xl border flex items-center justify-between transition-all duration-500"
    :class="containerClass"
  >
    <div class="flex flex-col">
      <span
        class="text-[8px] font-black uppercase tracking-widest mb-1"
        :class="labelColor"
      >Statutory Enforcement Clock</span>
      <div class="flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full"
          :class="dotClass"
        />
        <span class="text-xs font-bold uppercase">{{ statusLabel }}</span>
      </div>
    </div>
    
    <div class="text-right">
      <p class="text-[8px] font-black uppercase text-slate-400 mb-0.5">
        Enforcement Deadline
      </p>
      <div
        v-if="daysRemaining > 0"
        class="flex items-center gap-2 justify-end"
      >
        <span
          class="text-2xl font-black tabular-nums tracking-tighter"
          :class="timerColor"
        >{{ daysRemaining }}</span>
        <span class="text-[10px] font-black uppercase text-slate-500">Days<br>Left</span>
      </div>
      <div
        v-else
        class="flex flex-col items-end"
      >
        <span class="text-lg font-black text-red-600 leading-none">EXPIRED</span>
        <span class="text-[8px] font-bold text-red-400 uppercase">Matured for Filing</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  deadlineAt: String,
  serverTime: String,
  status: String
});

const serverOffset = ref(0);
const now = ref(Date.now());

// Server-Time Authority: Calculate offset on mount
onMounted(() => {
  if (props.serverTime) {
    serverOffset.value = new Date(props.serverTime).getTime() - Date.now();
  }
  
  const timer = setInterval(() => {
    now.value = Date.now() + serverOffset.value;
  }, 1000);
  
  onUnmounted(() => clearInterval(timer));
});

const diffInMs = computed(() => {
  if (!props.deadlineAt) return 0;
  return new Date(props.deadlineAt).getTime() - now.value;
});

const daysRemaining = computed(() => {
  const diff = Math.ceil(diffInMs.value / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
});

const statusLabel = computed(() => {
  if (daysRemaining.value <= 0) return 'Notice Period Expired';
  if (daysRemaining.value <= 2) return 'Final Notice Period';
  return 'Awaiting Response';
});

const containerClass = computed(() => {
  if (daysRemaining.value <= 0) return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900 shadow-glow-red';
  if (daysRemaining.value <= 2) return 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 animate-pulse-slow';
  return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30';
});

const timerColor = computed(() => {
  if (daysRemaining.value <= 2) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-700 dark:text-emerald-400';
});

const labelColor = computed(() => {
  if (daysRemaining.value <= 0) return 'text-red-500';
  if (daysRemaining.value <= 2) return 'text-amber-500';
  return 'text-emerald-600';
});

const dotClass = computed(() => {
  if (daysRemaining.value <= 0) return 'bg-red-500 shadow-[0_0_8px_#ef4444]';
  if (daysRemaining.value <= 2) return 'bg-amber-500 animate-ping';
  return 'bg-emerald-500';
});
</script>

<style scoped>
.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
</style>
