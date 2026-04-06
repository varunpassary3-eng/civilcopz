<template>
  <div class="p-6 bg-slate-50 dark:bg-gov-dark-950/40 border border-slate-200 dark:border-gov-dark-800 rounded-[2.5rem] space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span
          class="w-2 h-2 rounded-full"
          :class="riskBg"
        />
        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
          Adversary Risk Rating
        </h3>
      </div>
      <span
        class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
        :class="riskBadge"
      >
        {{ riskLevel }}
      </span>
    </div>

    <div class="flex items-end justify-between">
      <div>
        <p
          class="text-3xl font-black tabular-nums tracking-tighter"
          :class="scoreColor"
        >
          {{ reputationScore }}<span class="text-xs text-slate-400 font-normal">/100</span>
        </p>
        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
          Procedural Risk Index
        </p>
      </div>
      
      <div class="text-right">
        <p class="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase leading-none mb-1">
          Impact Reason:
        </p>
        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter max-w-[120px]">
          {{ riskReason }}
        </p>
      </div>
    </div>

    <!-- Procedural Warning (Phase 2 Litigation Pressure) -->
    <div
      v-if="isHighRisk"
      class="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl"
    >
      <p class="text-[8px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest leading-tight">
        Behavioral Penalty Applied: Company has failed to respond within statutory 15-day window.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  reputationScore: { type: Number, default: 0 },
  riskLevel: { type: String, default: 'Low' },
  status: { type: String, default: 'Submitted' }
});

const isHighRisk = computed(() => props.riskLevel === 'High' || props.riskLevel === 'Critical');

const riskBg = computed(() => {
  if (props.riskLevel === 'Critical') return 'bg-red-600 shadow-[0_0_10px_#dc2626]';
  if (props.riskLevel === 'High') return 'bg-orange-500';
  if (props.riskLevel === 'Medium') return 'bg-amber-400';
  return 'bg-emerald-500';
});

const riskBadge = computed(() => {
  if (props.riskLevel === 'Critical') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (props.riskLevel === 'High') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
});

const scoreColor = computed(() => {
  if (props.reputationScore > 50) return 'text-red-600 dark:text-red-400';
  if (props.reputationScore > 30) return 'text-orange-500';
  return 'text-slate-900 dark:text-white';
});

const riskReason = computed(() => {
  if (props.status === 'Escalated_to_Authority') return 'Statutory Expiry Breach';
  if (props.reputationScore > 50) return 'History of Non-Compliance';
  return 'Standard Review';
});
</script>
