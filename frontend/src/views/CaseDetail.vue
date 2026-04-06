<template>
  <div class="min-h-screen bg-slate-50 dark:bg-gov-dark-950 pb-20">
    <!-- Premium Navigation Header -->
    <nav class="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gov-dark-900/80 border-b border-slate-200 dark:border-gov-dark-800 px-6 py-4">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        <div class="flex items-center gap-4">
          <router-link
            to="/cases"
            class="p-2 hover:bg-slate-100 dark:hover:bg-gov-dark-800 rounded-full transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-slate-600 dark:text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </router-link>
          <div>
            <h1 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
              Case Lifecycle Explorer
            </h1>
            <p class="text-[10px] font-bold text-gov-primary-600 uppercase tracking-tighter">
              ID: {{ caseId }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span :class="['text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm', getStatusColor(caseData.status)]">
            {{ caseData.status?.replace(/_/g, ' ') }}
          </span>
          <button
            class="p-2 hover:rotate-180 transition-transform duration-500"
            @click="refreshCase"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left Column: Details & Evidence -->
      <div class="lg:col-span-8 space-y-8">
        <!-- Case Header Card -->
        <section class="bg-white dark:bg-gov-dark-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-gov-dark-800 shadow-2xl shadow-indigo-500/5 relative overflow-hidden">
          <div class="absolute top-0 right-0 p-8 opacity-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-32 w-32 text-gov-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          
          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gov-primary-600 bg-gov-primary-600/10 px-3 py-1 rounded-lg">{{ caseData.category }}</span>
              <span class="text-[10px] font-bold text-slate-400">{{ formatDate(caseData.createdAt) }}</span>
            </div>
            <h2 class="text-4xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              {{ caseData.title }}
            </h2>
            <div class="flex flex-wrap gap-8 items-center mb-8 pb-8 border-b border-slate-100 dark:border-gov-dark-800">
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase text-slate-400 mb-1">Against Entity</span>
                <span class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ caseData.company }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase text-slate-400 mb-1">Legal Jurisdiction</span>
                <span class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ caseData.jurisdiction }}</span>
              </div>
            </div>
            
            <div class="prose prose-slate dark:prose-invert max-w-none mb-10">
              <p class="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {{ caseData.description }}
              </p>
            </div>

            <!-- Consumer Documentation (KYC Display) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-gov-dark-950 p-6 rounded-3xl border border-slate-100 dark:border-gov-dark-800">
              <div class="space-y-4">
                <h4 class="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  Grievant Identification
                </h4>
                <div class="space-y-1">
                  <p class="text-sm font-black text-slate-800 dark:text-slate-100">
                    {{ caseData.consumerName || 'Not Documented' }}
                  </p>
                  <p class="text-[10px] font-bold text-slate-500">
                    {{ caseData.consumerEmail }}
                  </p>
                  <p class="text-[10px] font-bold text-slate-500">
                    {{ caseData.consumerPhone }}
                  </p>
                </div>
              </div>
              <div class="space-y-4">
                <h4 class="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  Service Address
                </h4>
                <p class="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  {{ caseData.consumerAddress || 'No address provided in substrate.' }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Dynamic Ad Space Display -->
        <AdSpace 
          v-if="caseData.category" 
          :category="caseData.category" 
        />

        <!-- Dynamic LifeCycle Stepper -->
        <section class="bg-white dark:bg-gov-dark-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-gov-dark-800 shadow-lg">
          <div class="flex items-center justify-between mb-10">
            <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white">
              Procedural Progression
            </h3>
            <span class="text-[9px] font-bold text-slate-400">Phase {{ currentStepIndex + 1 }} of 12</span>
          </div>
          
          <div class="relative flex justify-between items-start">
            <div class="absolute left-0 top-5 right-0 h-1 bg-slate-100 dark:bg-gov-dark-800 -z-0" />
            <div
              class="absolute left-0 top-5 h-1 bg-gov-primary-600 transition-all duration-1000 -z-0"
              :style="{ width: progressPercentage + '%' }"
            />
            
            <div 
              v-for="(step, index) in lifecycleSteps" 
              :key="step"
              class="relative z-10 flex flex-col items-center group"
            >
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-4"
                :class="getStepClass(index)"
              >
                <span
                  v-if="index < currentStepIndex"
                  class="text-white"
                >✓</span>
                <div
                  v-else-if="index === currentStepIndex"
                  class="w-2 h-2 rounded-full bg-white animate-ping"
                />
              </div>
              <span 
                class="mt-4 text-[7px] font-black uppercase tracking-tighter text-center w-16 transition-colors"
                :class="index <= currentStepIndex ? 'text-slate-900 dark:text-white' : 'text-slate-300'"
              >
                {{ step.replace(/_/g, ' ') }}
              </span>
            </div>
          </div>
        </section>
        <!-- Evidence Locker Substrate -->
        <section class="bg-white dark:bg-gov-dark-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-gov-dark-800 shadow-lg">
          <div class="flex items-center justify-between mb-8">
            <div>
              <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white">
                Evidence Locker
              </h3>
              <p class="text-[8px] font-black text-gov-primary-600 uppercase mt-1">
                SHA-256 Integrity Verified
              </p>
            </div>
            <span class="text-[10px] font-bold text-slate-400">{{ caseData.documents?.length || 0 }} Documents Anchored</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="doc in caseData.documents"
              :key="doc.id"
              class="p-4 bg-slate-50 dark:bg-gov-dark-950 rounded-2xl border border-slate-100 dark:border-gov-dark-800 flex items-center gap-4 group hover:border-gov-primary-600/30 transition-all"
            >
              <div class="w-12 h-12 bg-white dark:bg-gov-dark-900 rounded-xl flex items-center justify-center shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate uppercase tracking-tighter">
                  {{ doc.fileUrl.split('/').pop() }}
                </p>
                <p class="text-[7px] font-mono text-slate-400 truncate mt-1">
                  HASH: {{ doc.fileHash }}
                </p>
              </div>
              <a
                :href="`http://localhost:4000${doc.fileUrl}`"
                target="_blank"
                class="p-2 opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-gov-dark-800 rounded-lg transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 text-gov-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </a>
            </div>
          </div>
           
          <div
            v-if="!caseData.documents || caseData.documents.length === 0"
            class="text-center py-10 border-2 border-dashed border-slate-100 dark:border-gov-dark-800 rounded-3xl"
          >
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              No multi-file evidence anchored to this substrate.
            </p>
          </div>
        </section>

        <!-- AI Advisory Substrate -->
        <section
          v-if="advice"
          class="bg-gov-primary-600/5 dark:bg-gov-primary-600/10 rounded-[2.5rem] p-10 border border-gov-primary-600/20 shadow-inner"
        >
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 bg-gov-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-gov-primary-600/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-xs font-black uppercase tracking-widest text-gov-primary-600">
                Legal Advisory Substrate
              </h3>
              <p class="text-[8px] font-black uppercase text-slate-400">
                AI-Enhanced Compliance Analysis
              </p>
            </div>
          </div>
           
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div class="space-y-4">
              <h4 class="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Statutory Grounding
              </h4>
              <div class="space-y-2">
                <div
                  v-for="ground in advice.legalGrounds"
                  :key="ground"
                  class="bg-white/50 dark:bg-gov-dark-950/50 p-3 rounded-xl border border-slate-200 dark:border-gov-dark-800"
                >
                  <p class="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {{ ground }}
                  </p>
                </div>
              </div>
            </div>
            <div class="space-y-4">
              <h4 class="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Automated Statutory Notice Preview
              </h4>
              <div class="p-6 bg-white dark:bg-gov-dark-950 rounded-2xl border border-slate-200 dark:border-gov-dark-800 font-serif text-xs leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-line shadow-sm italic">
                {{ advice.statutoryNotice }}
              </div>
            </div>
          </div>
           
          <div class="text-[9px] font-bold text-slate-400/80 uppercase leading-relaxed max-w-2xl">
            {{ advice.disclaimer }}
          </div>
        </section>
      </div>

      <!-- Right Column: Timeline & Actions -->
      <div class="lg:col-span-4 space-y-8">
        <!-- Timeline Feed -->
        <section class="bg-white dark:bg-gov-dark-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-gov-dark-800 shadow-xl">
          <div class="flex items-center gap-2 mb-8 uppercase">
            <div class="w-1.5 h-6 bg-gov-primary-600 rounded-full" />
            <h3 class="text-xs font-black tracking-widest text-slate-900 dark:text-white">
              Audit Timeline
            </h3>
          </div>
          
          <div class="relative pl-8 space-y-8">
            <!-- Vertical Line -->
            <div class="absolute left-[3px] top-1 bottom-1 w-[1px] bg-slate-100 dark:bg-gov-dark-800" />

            <div
              v-for="(item, index) in caseTimeline"
              :key="index"
              class="relative group"
            >
              <!-- Marker dot -->
              <div 
                class="absolute left-[-33px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gov-dark-900 shadow-sm transition-all duration-300"
                :class="index === 0 ? 'bg-gov-primary-600 scale-125' : 'bg-slate-200 dark:bg-gov-dark-800'"
              />

              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h4
                    class="text-[10px] font-black uppercase tracking-wider"
                    :class="index === 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'"
                  >
                    {{ item.action }}
                  </h4>
                  <span
                    v-if="item.actor"
                    class="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-gov-dark-800 text-slate-500 rounded-md"
                  >{{ item.actor }}</span>
                </div>
                <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  {{ formatDateTime(item.timestamp) }}
                </p>
                <div
                  v-if="item.status"
                  class="mt-2 text-[9px] font-bold text-gov-primary-600/60 uppercase"
                >
                  Classified: {{ item.status.replace(/_/g, ' ') }}
                </div>
              </div>
            </div>
            
            <div
              v-if="caseTimeline.length === 0"
              class="text-xs text-slate-400 italic"
            >
              No events recorded.
            </div>
          </div>
        </section>

        <!-- Admin Control Panel (Visible if Admin) -->
        <section
          v-if="isAdmin"
          class="bg-slate-900 dark:bg-gov-dark-800 rounded-[2rem] p-8 border border-white/5 shadow-2xl"
        >
          <h3 class="text-[10px] font-black uppercase tracking-widest text-white mb-6">
            Governing Authority Actions
          </h3>
          <div class="space-y-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[9px] font-black uppercase text-slate-500">Update State Transition</label>
              <select
                v-model="selectedStatus"
                class="w-full bg-slate-800 border-none text-slate-200 text-xs font-bold p-3 rounded-xl focus:ring-1 focus:ring-gov-primary-600 outline-none"
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
            <div class="flex flex-col gap-1.5">
              <label class="text-[9px] font-black uppercase text-slate-500">Action Substrate Description</label>
              <textarea
                v-model="actionDescription"
                placeholder="Official observation or order summary..."
                class="w-full bg-slate-800 border-none text-slate-200 text-xs font-medium p-3 rounded-xl focus:ring-1 focus:ring-gov-primary-600 outline-none min-h-[80px]"
              />
            </div>
            <button 
              :disabled="isUpdating" 
              class="w-full py-4 bg-gov-primary-600 hover:bg-gov-primary-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-gov-primary-600/20 disabled:opacity-50"
              @click="updateStatus"
            >
              {{ isUpdating ? 'Updating...' : 'Dispatch State Transition' }}
            </button>
          </div>
        </section>

        <!-- User Satisfaction Engine (Visible if Resolved) -->
        <section
          v-if="canGiveSatisfaction"
          class="bg-indigo-600 rounded-[2rem] p-8 border border-white/10 shadow-2xl"
        >
          <h3 class="text-[10px] font-black uppercase tracking-widest text-white mb-4">
            Grievance Feedback Loop
          </h3>
          <p class="text-xs font-medium text-white/70 mb-6 font-medium">
            Was the resolution provided by {{ caseData.company }} satisfactory?
          </p>
          
          <div class="grid grid-cols-2 gap-4">
            <button 
              class="flex flex-col items-center p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/5 transition-all group" 
              @click="submitSatisfaction('Satisfied')"
            >
              <span class="text-2xl mb-2 group-hover:scale-125 transition-transform">😊</span>
              <span class="text-[9px] font-black uppercase text-white tracking-widest">Satisfied</span>
            </button>
            <button 
              class="flex flex-col items-center p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/5 transition-all group" 
              @click="submitSatisfaction('Unsatisfied')"
            >
              <span class="text-2xl mb-2 group-hover:scale-125 transition-transform">😞</span>
              <span class="text-[9px] font-black uppercase text-white tracking-widest">Unsatisfied</span>
            </button>
          </div>
          
          <p class="mt-4 text-[8px] font-bold text-white/40 uppercase text-center">
            Impacts Reputation Score of {{ caseData.company }}
          </p>
        </section>
        
        <div
          v-if="caseData.satisfaction"
          class="bg-emerald-600 rounded-[2rem] p-8 border border-white/10 text-white text-center"
        >
          <p class="text-[9px] font-black uppercase tracking-widest mb-1">
            User Satisfaction Documented
          </p>
          <p class="text-xl font-black">
            {{ caseData.satisfaction }}
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { getCaseById, updateCaseStatus, setSatisfaction } from '../services/api';
import { getStatusColor } from '../services/caseService';
import { connectSocket, disconnectSocket, onCaseUpdate, offCaseUpdate } from '../socket';
import AdSpace from '../components/AdSpace.vue';
import axios from 'axios';

const route = useRoute();
const caseId = route.params.id;

const caseData = ref({});
const caseTimeline = ref([]);
const advice = ref(null);
const isLoading = ref(true);
const isAdmin = ref(false);
const isUpdating = ref(false);

const selectedStatus = ref('');
const actionDescription = ref('');

const lifecycleSteps = [
  'Draft', 'Submitted', 'Under_Review', 'Notice_Sent', 
  'Company_Responded', 'Negotiation_Mediation', 'Escalated_to_Authority', 
  'Court_Filed', 'Judgment_Issued', 'Resolved', 
  'Satisfaction_Confirmed', 'Closed'
];

const currentStepIndex = computed(() => {
  return lifecycleSteps.indexOf(caseData.value.status) || 0;
});

const progressPercentage = computed(() => {
  return (currentStepIndex.value / (lifecycleSteps.length - 1)) * 100;
});

const canGiveSatisfaction = computed(() => {
    return caseData.value.status === 'Resolved' && !caseData.value.satisfaction;
});

async function fetchCaseDetails() {
  try {
    isLoading.value = true;
    const data = await getCaseById(caseId);
    caseData.value = data;
    caseTimeline.value = (data.timeline || []).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    selectedStatus.value = data.status;
    
    // Fetch Legal Advisory AI
    fetchLegalAdvice();
  } catch (err) {
    console.error('Failed to fetch case details:', err);
    // router.push('/cases');
  } finally {
    isLoading.value = false;
  }
}

async function fetchLegalAdvice() {
  try {
    const response = await axios.get(`http://localhost:4000/api/ai/advise/${caseId}`, {
         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    advice.value = response.data;
  } catch (err) {
    console.error('Legal AI substrate unavailable:', err);
  }
}

async function updateStatus() {
  if (isUpdating.value) return;
  isUpdating.value = true;
  try {
    await updateCaseStatus(caseId, selectedStatus.value, actionDescription.value);
    actionDescription.value = '';
    // Refresh will happen via Socket.io preferably, but manually for fallback
    await fetchCaseDetails();
  } catch (err) {
    alert('Failed to update case state transition.');
  } finally {
    isUpdating.value = false;
  }
}

async function submitSatisfaction(val) {
   try {
       await setSatisfaction(caseId, val);
       await fetchCaseDetails();
   } catch (err) {
       alert('Feedback substrate error.');
   }
}

function getStepClass(index) {
  if (index < currentStepIndex.value) return 'bg-gov-primary-600 border-gov-primary-600 shadow-md shadow-gov-primary-600/30';
  if (index === currentStepIndex.value) return 'bg-white dark:bg-gov-dark-900 border-gov-primary-600 scale-110 shadow-xl shadow-gov-primary-100 dark:shadow-gov-primary-950';
  return 'bg-slate-50 dark:bg-gov-dark-950 border-slate-200 dark:border-gov-dark-800';
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function refreshCase() {
    fetchCaseDetails();
}

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  isAdmin.value = user.role === 'admin' || localStorage.getItem('bypass_active') === 'true';
  
  fetchCaseDetails();
  
  // Connect Socket.io for real-time lifecycle updates
  connectSocket(caseId);
  onCaseUpdate((data) => {
    console.log('[SOCKET] Real-time state transition received:', data);
    fetchCaseDetails(); // Refresh UI on update
  });
});

onUnmounted(() => {
  offCaseUpdate();
  disconnectSocket();
});
</script>

<style scoped>
.prose {
  max-width: 65ch;
  line-height: 1.8;
}
</style>
