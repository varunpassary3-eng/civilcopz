<template>
  <article 
    class="backdrop-blur-md bg-white/60 dark:bg-gov-dark-900/60 border border-white/20 dark:border-gov-dark-800/50 p-6 rounded-3xl shadow-xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden mb-6 cursor-pointer"
    @click="goToDetail"
  >
    <!-- Status Accent Bar -->
    <div
      class="absolute left-0 top-0 bottom-0 w-1.5"
      :class="accentClass"
    />
    
    <div class="flex justify-between items-start gap-4 mb-4 pl-2">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[9px] font-black uppercase tracking-widest text-gov-primary-600 bg-gov-primary-600/10 px-2 py-0.5 rounded-full">{{ caseData.category }}</span>
          <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">{{ formattedDate }}</span>
        </div>
        <h3 class="text-xl font-black text-slate-900 dark:text-white leading-tight transition-colors">
          {{ caseData.title }}
        </h3>
      </div>
      
      <div class="flex flex-col items-end gap-2">
        <span
          class="text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-widest shadow-sm"
          :class="statusClass"
        >
          {{ caseData.status }}
        </span>
        <!-- Forensic Registry Badge (v3.0) -->
        <span 
          v-if="caseData.registryStatus && caseData.registryStatus !== 'DRAFT'"
          class="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest bg-blue-500 text-white shadow-lg shadow-blue-500/20"
        >
          ⚖️ {{ caseData.registryStatus }}
        </span>
        <select 
          v-if="isAdmin" 
          :value="caseData.status" 
          class="text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-gov-dark-950 border-none p-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-gov-primary-600 appearance-none cursor-pointer" 
          @change="changeStatus($event.target.value)"
        >
          <option
            v-for="step in lifecycleSteps"
            :key="step"
            :value="step"
          >
            {{ step.replace(/_/g, ' ') }}
          </option>
        </select>
      </div>
    </div>

    <p class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4 pl-2 leading-relaxed">
      {{ caseData.description }}
    </p>

    <!-- Legal Notice Execution HUD -->
    <div
      v-if="caseData.noticeStatus"
      class="mb-6 mx-2 p-4 bg-slate-50 dark:bg-gov-dark-950/40 border border-slate-200 dark:border-gov-dark-800 rounded-2xl flex items-center justify-between"
    >
      <div class="flex flex-col">
        <span class="text-[8px] font-black uppercase text-slate-400 mb-1">Notice Execution Status</span>
        <div class="flex items-center gap-2">
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="noticeStatusClass"
          />
          <span
            class="text-xs font-bold"
            :class="noticeStatusColor"
          >{{ noticeLabel }}</span>
        </div>
      </div>
      
      <div
        v-if="caseData.status === 'Notice_Sent'"
        class="text-right"
      >
        <p class="text-[8px] font-black uppercase text-slate-400 mb-0.5">
          Statutory Response Window
        </p>
        <div class="flex items-center gap-2 justify-end">
          <span
            class="text-lg font-black"
            :class="countdownColor"
          >{{ daysRemaining }}</span>
          <span class="text-[9px] font-black uppercase text-slate-500">Days Left</span>
        </div>
      </div>
    </div>

    <!-- AI Intelligence Insight Badge (Materialized in Detail View) -->
    <div
      v-if="caseData.aiCategory && caseData.aiSeverity"
      class="mb-6 mx-2 p-4 bg-gov-primary-600/5 dark:bg-gov-primary-600/10 border border-gov-primary-600/20 rounded-2xl"
    >
      <div class="flex items-center gap-2 mb-2">
        <span class="text-[9px] font-black uppercase tracking-widest text-gov-primary-600">CivilCOPZ Intelligence</span>
        <span class="text-[8px] font-bold px-2 py-0.5 bg-gov-primary-600 text-white rounded-full uppercase tracking-widest">AI Verified</span>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-[8px] font-black uppercase text-slate-400">
            Classified Sector
          </p>
          <p class="text-xs font-bold text-slate-700 dark:text-slate-300">
            {{ caseData.aiCategory }}
          </p>
        </div>
        <div>
          <p class="text-[8px] font-black uppercase text-slate-400">
            Severity Risk
          </p>
          <p class="text-xs font-bold text-red-500">
            {{ caseData.aiSeverity }}
          </p>
        </div>
      </div>
      <div
        v-if="caseData.aiRelevantLaws && caseData.aiRelevantLaws.length"
        class="mt-3 pt-3 border-t border-gov-primary-600/10"
      >
        <div class="flex justify-between items-center mb-1">
          <p class="text-[8px] font-black uppercase text-slate-400">
            Legal Baseline Mapping
          </p>
          <span
            v-if="caseData.statutoryGrounds"
            class="text-[7px] font-black uppercase text-blue-600 bg-blue-600/10 px-1.5 py-0.5 rounded-md"
          >{{ caseData.statutoryGrounds }}</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="law in caseData.aiRelevantLaws"
            :key="law"
            class="text-[7px] font-black uppercase bg-white dark:bg-gov-dark-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-gov-dark-800"
          >{{ law }}</span>
        </div>
      </div>
    </div>

    <!-- Forensic Litigation Actions (v3.0) -->
    <div 
      v-if="['Escalated_to_Authority', 'Court_Filed', 'Notice_Sent'].includes(caseData.status)" 
      class="mb-6 mx-2 p-4 bg-slate-900 rounded-2xl flex items-center justify-between border border-gov-primary-600/30"
    >
      <div class="flex flex-col">
        <span class="text-[8px] font-black uppercase text-gov-primary-400 mb-1">Litigation Readiness</span>
        <span class="text-xs font-bold text-white">{{ forensicStatusLabel }}</span>
      </div>
      
      <div class="flex gap-2">
        <button 
          v-if="!caseData.signed"
          class="text-[9px] font-black uppercase px-3 py-2 bg-gov-primary-600 text-white rounded-xl hover:bg-gov-primary-500 transition-all shadow-lg shadow-gov-primary-600/20"
          @click.stop="handleSign"
        >
          ✍️ Sign Complaint
        </button>
        <button 
          v-else-if="caseData.registryStatus !== 'TIMESTAMPED'"
          class="text-[9px] font-black uppercase px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
          @click.stop="handleTimestamp"
        >
          ⏱️ Seal with Timestamp
        </button>
        <span
          v-else
          class="text-[10px] font-black text-emerald-400 uppercase tracking-widest"
        >✅ Court Ready</span>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-6 pl-2 pt-4 border-t border-slate-100 dark:border-gov-dark-800/50">
      <div class="flex flex-col">
        <span class="text-[9px] font-black uppercase text-slate-400 mb-0.5">Primary Target</span>
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ caseData.company }}</span>
        <div
          v-if="reputation"
          class="flex items-center gap-1.5 mt-0.5 transition-opacity"
        >
          <span
            class="text-[9px] font-black uppercase tracking-widest"
            :class="reputationColor"
          >{{ reputation.tier }}</span>
          <span class="text-[10px] font-bold text-slate-400">({{ reputation.score }} pts)</span>
        </div>
        <span
          v-else
          class="text-[9px] font-black uppercase text-gov-primary-600 mt-0.5 tracking-widest"
        >{{ companyCount }} similar cases</span>
      </div>
      <div class="flex flex-col">
        <span class="text-[9px] font-black uppercase text-slate-400 mb-0.5">Jurisdiction</span>
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ caseData.jurisdiction }}</span>
      </div>
      <div class="flex-1 flex justify-between items-center pr-2">
        <button 
          class="text-[10px] font-black text-gov-primary-600 uppercase tracking-widest hover:underline active:scale-95 transition-all"
        >
          View Full Lifecycle →
        </button>
        <a
          v-if="caseData.filePath"
          :href="fileUrl"
          target="_blank"
          class="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-gov-primary-600 uppercase tracking-widest transition-colors bg-slate-50 dark:bg-gov-dark-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-gov-dark-800"
        >
          📥 Exhibit
        </a>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { getCompanyScore } from '../services/reputation';
import { getRemainingDays, getNoticeStatusLabel } from '../services/caseService';

const props = defineProps({
  caseData: Object,
  companyCount: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
});

const emit = defineEmits(['status-changed', 'select']);
const router = useRouter();

const lifecycleSteps = [
  'Draft', 'Submitted', 'Under_Review', 'Notice_Sent', 
  'Company_Responded', 'Negotiation_Mediation', 'Escalated_to_Authority', 
  'Court_Filed', 'Judgment_Issued', 'Resolved', 
  'Satisfaction_Confirmed', 'Closed'
];

const noticeLabel = computed(() => getNoticeStatusLabel(props.caseData.noticeStatus).label);
const noticeStatusColor = computed(() => getNoticeStatusLabel(props.caseData.noticeStatus).color);
const noticeStatusClass = computed(() => {
  const status = props.caseData.noticeStatus;
  if (status === 'READ') return 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
  if (status === 'ESCALATED' || status === 'EXPIRED') return 'bg-red-500 animate-pulse';
  if (status === 'DELIVERED') return 'bg-blue-500';
  return 'bg-slate-300';
});

const daysRemaining = computed(() => getRemainingDays(props.caseData.noticeDeadline));
const countdownColor = computed(() => {
  const days = daysRemaining.value;
  if (days <= 3) return 'text-red-500 animate-pulse';
  if (days <= 7) return 'text-amber-500';
  return 'text-slate-900 dark:text-white';
});

const forensicStatusLabel = computed(() => {
  if (!props.caseData.signed) return 'Awaiting Aadhaar eSign';
  if (props.caseData.registryStatus !== 'TIMESTAMPED') return 'Pending Certified Timestamp';
  return 'Forensically Sealed';
});

async function handleSign() {
  try {
    const res = await axios.post(`http://localhost:4000/api/litigation/sign/${props.caseData.id}`);
    if (res.data.redirectUrl) {
      // Redirect to the mock eSign provider
      window.location.href = `http://localhost:4000${res.data.redirectUrl}&caseId=${props.caseData.id}`;
    }
  } catch (err) {
    alert('Failed to initiate eSign: ' + err.message);
  }
}

async function handleTimestamp() {
  try {
    const res = await axios.post(`http://localhost:4000/api/litigation/timestamp/${props.caseData.id}`);
    alert('Certified Timestamp Applied: ' + res.data.token.substring(0, 20) + '...');
    emit('status-changed', { id: props.caseData.id, status: props.caseData.status }); // Refresh
  } catch (err) {
    alert('Failed to apply timestamp: ' + err.message);
  }
}

function goToDetail() {
  emit('select', props.caseData);
}

const formattedDate = computed(() => {
  if (!props.caseData?.createdAt) return 'Unknown';
  const date = new Date(props.caseData.createdAt);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
});

const statusClass = computed(() => {
  const status = props.caseData?.status;
  if (['Resolved', 'Satisfaction_Confirmed', 'Closed'].includes(status)) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (['Under_Review', 'Notice_Sent'].includes(status)) return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400';
  if (['Court_Filed', 'Judgment_Issued', 'Escalated_to_Authority'].includes(status)) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
});

const accentClass = computed(() => {
  const status = props.caseData?.status;
  if (['Resolved', 'Satisfaction_Confirmed', 'Closed'].includes(status)) return 'bg-green-500';
  if (['Under_Review', 'Notice_Sent'].includes(status)) return 'bg-indigo-600';
  if (['Court_Filed', 'Judgment_Issued', 'Escalated_to_Authority'].includes(status)) return 'bg-red-600';
  return 'bg-amber-500';
});

const reputation = ref(null);

const reputationColor = computed(() => {
  if (!reputation.value) return 'text-slate-400';
  const risk = (reputation.value.risk || '').toLowerCase();
  if (risk === 'high') return 'text-red-500 animate-pulse';
  if (risk === 'medium') return 'text-amber-500';
  return 'text-green-500';
});

onMounted(async () => {
  try {
    reputation.value = await getCompanyScore(props.caseData.company);
  } catch (err) {
    console.error('Failed to fetch company reputation:', err);
  }
});

const fileUrl = computed(() => {
  if (!props.caseData?.filePath) return '';
  return `http://localhost:4000${props.caseData.filePath}`;
});

function changeStatus(newStatus) {
  emit('status-changed', { id: props.caseData.id, status: newStatus });
}
</script>

