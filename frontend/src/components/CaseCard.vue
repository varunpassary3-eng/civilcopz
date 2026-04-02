<template>
  <article 
    class="backdrop-blur-md bg-white/60 dark:bg-gov-dark-900/60 border border-white/20 dark:border-gov-dark-800/50 p-6 rounded-3xl shadow-xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden mb-6 cursor-pointer"
    @click="$emit('select', caseData)"
  >
    <!-- Status Accent Bar -->
    <div class="absolute left-0 top-0 bottom-0 w-1.5" :class="accentClass"></div>
    
    <div class="flex justify-between items-start gap-4 mb-4 pl-2">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[9px] font-black uppercase tracking-widest text-gov-primary-600 bg-gov-primary-600/10 px-2 py-0.5 rounded-full">{{ caseData.category }}</span>
          <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">{{ formattedDate }}</span>
        </div>
        <h3 class="text-xl font-black text-slate-900 dark:text-white leading-tight transition-colors">{{ caseData.title }}</h3>
      </div>
      
      <div class="flex flex-col items-end gap-2">
        <span class="text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-widest shadow-sm" :class="statusClass">
          {{ caseData.status }}
        </span>
        <select 
          v-if="isAdmin" 
          :value="caseData.status" 
          @change="changeStatus($event.target.value)" 
          class="text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-gov-dark-950 border-none p-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-gov-primary-600 appearance-none cursor-pointer"
        >
          <option value="Pending">Set Pending</option>
          <option value="Review">Set Review</option>
          <option value="Resolved">Set Resolved</option>
        </select>
      </div>
    </div>

    <p class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4 pl-2 leading-relaxed">{{ caseData.description }}</p>

    <!-- AI Intelligence Insight Badge -->
    <div v-if="caseData.aiCategory" class="mb-6 mx-2 p-4 bg-gov-primary-600/5 dark:bg-gov-primary-600/10 border border-gov-primary-600/20 rounded-2xl">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-[9px] font-black uppercase tracking-widest text-gov-primary-600">CivilCOPZ Intelligence</span>
        <span class="text-[8px] font-bold px-2 py-0.5 bg-gov-primary-600 text-white rounded-full uppercase tracking-widest">AI Verified</span>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-[8px] font-black uppercase text-slate-400">Classified Sector</p>
          <p class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ caseData.aiCategory }}</p>
        </div>
        <div>
          <p class="text-[8px] font-black uppercase text-slate-400">Severity Risk</p>
          <p class="text-xs font-bold text-red-500">{{ caseData.aiSeverity }}</p>
        </div>
      </div>
      <div v-if="caseData.aiRelevantLaws && caseData.aiRelevantLaws.length" class="mt-3 pt-3 border-t border-gov-primary-600/10">
        <p class="text-[8px] font-black uppercase text-slate-400 mb-1">Legal Baseline Mapping</p>
        <div class="flex flex-wrap gap-1">
          <span v-for="law in caseData.aiRelevantLaws" :key="law" class="text-[7px] font-black uppercase bg-white dark:bg-gov-dark-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-gov-dark-800">{{ law }}</span>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-6 pl-2 pt-4 border-t border-slate-100 dark:border-gov-dark-800/50">
      <div class="flex flex-col">
        <span class="text-[9px] font-black uppercase text-slate-400 mb-0.5">Primary Target</span>
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ caseData.company }}</span>
        <span class="text-[9px] font-black uppercase text-gov-primary-600 mt-0.5 tracking-widest">{{ companyCount }} similar cases</span>
      </div>
      <div class="flex flex-col">
        <span class="text-[9px] font-black uppercase text-slate-400 mb-0.5">Jurisdiction</span>
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ caseData.jurisdiction }}</span>
      </div>
      <div class="flex-1 flex justify-between items-center pr-2">
        <button 
          @click.stop="$emit('select', caseData)" 
          class="text-[10px] font-black text-gov-primary-600 uppercase tracking-widest hover:underline active:scale-95 transition-all"
        >
          Read More →
        </button>
        <a v-if="caseData.filePath" :href="fileUrl" target="_blank" class="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-gov-primary-600 uppercase tracking-widest transition-colors bg-slate-50 dark:bg-gov-dark-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-gov-dark-800">
          📥 Exhibit
        </a>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  caseData: Object,
  companyCount: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
});

const emit = defineEmits(['status-changed', 'select']);

const formattedDate = computed(() => {
  if (!props.caseData?.createdAt) return 'Unknown';
  const date = new Date(props.caseData.createdAt);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
});

const statusClass = computed(() => {
  const status = props.caseData?.status?.toLowerCase();
  if (status === 'resolved') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (status === 'review') return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400';
  return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
});

const accentClass = computed(() => {
  const status = props.caseData?.status?.toLowerCase();
  if (status === 'resolved') return 'bg-green-500 shadow-[2px_0_10px_rgba(34,197,94,0.4)]';
  if (status === 'review') return 'bg-indigo-500 shadow-[2px_0_10px_rgba(99,102,241,0.4)]';
  return 'bg-amber-500 shadow-[2px_0_10px_rgba(245,158,11,0.4)]';
});

const fileUrl = computed(() => {
  if (!props.caseData?.filePath) return '';
  return `http://localhost:3000${props.caseData.filePath}`;
});

function changeStatus(newStatus) {
  emit('status-changed', { id: props.caseData.id, status: newStatus });
}
</script>

