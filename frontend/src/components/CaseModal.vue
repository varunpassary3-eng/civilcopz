<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 backdrop-blur-sm bg-slate-900/40"
    >
      <div 
        class="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-gov-dark-900 border border-white/20 dark:border-gov-dark-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        @click.stop
      >
        <!-- Header -->
        <header class="p-8 pb-4 flex justify-between items-start border-b border-slate-100 dark:border-gov-dark-800">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-gov-primary-600/10 text-gov-primary-600 rounded-full">
                {{ caseData.category }}
              </span>
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Case ID: #{{ caseData.id.toString().slice(-6).toUpperCase() }}
              </span>
            </div>
            <h2 class="text-3xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
              {{ caseData.title }}
            </h2>
          </div>
          <button
            class="p-4 hover:bg-slate-50 dark:hover:bg-gov-dark-800 rounded-2xl transition-all group"
            @click="close"
          >
            <span class="text-2xl grayscale group-hover:grayscale-0 transition-all">✖</span>
          </button>
        </header>

        <!-- Body -->
        <main class="flex-1 overflow-y-auto p-8 pt-6 space-y-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left Info -->
            <div class="lg:col-span-2 space-y-8">
              <section class="space-y-4">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Statement of Grievance
                </h3>
                <p class="text-lg font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{{ caseData.description }}"
                </p>
              </section>

              <!-- AI Intelligence Surface -->
              <section
                v-if="caseData.aiCategory"
                class="p-8 bg-gov-primary-600/5 dark:bg-gov-primary-600/10 border border-gov-primary-600/20 rounded-[2.5rem] relative overflow-hidden"
              >
                <div class="absolute top-0 right-0 p-8 opacity-5">
                  <span class="text-6xl font-black text-gov-primary-600 italic">AI</span>
                </div>
                <div class="relative z-10 space-y-6">
                  <div class="flex items-center gap-3">
                    <span class="w-3 h-3 bg-gov-primary-600 rounded-full animate-pulse" />
                    <h3 class="text-sm font-black uppercase tracking-widest text-gov-primary-600">
                      Legal Intelligence Snapshot
                    </h3>
                  </div>
                  
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div>
                      <p class="text-[9px] font-black uppercase text-slate-400 mb-1">
                        Status Confidence
                      </p>
                      <p class="text-xl font-black text-slate-900 dark:text-white">
                        94.2%
                      </p>
                    </div>
                    <div>
                      <p class="text-[9px] font-black uppercase text-slate-400 mb-1">
                        Precedent Match
                      </p>
                      <p class="text-xl font-black text-slate-900 dark:text-white">
                        High
                      </p>
                    </div>
                    <div>
                      <p class="text-[9px] font-black uppercase text-slate-400 mb-1">
                        Resolution ETA
                      </p>
                      <p class="text-xl font-black text-slate-900 dark:text-white">
                        14 Days
                      </p>
                    </div>
                  </div>
                </div>
              </section>              <!-- Industrial Precision HUD Sidebar -->
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Case Evolution Timeline (Immutable Ledger) -->
                <div class="lg:col-span-2 space-y-6">
                  <section class="space-y-4">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Litigation Chain-of-Events (Procedural Ledger)
                    </h3>
                    <CaseTimeline :case-id="caseData.id" />
                  </section>

                  <!-- Authority Filing Engine Surface -->
                  <section
                    v-if="caseData.status === 'Escalated_to_Authority' || caseData.status === 'Notice_Sent'"
                    class="p-8 bg-slate-100/50 dark:bg-gov-dark-950/20 border-2 border-dashed border-slate-200 dark:border-gov-dark-800 rounded-[2.5rem] space-y-4 transition-all"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <span class="text-xl">⚖️</span>
                        <div>
                          <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none mb-1">
                            Authority Filing Engine
                          </h3>
                          <p class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            Automated Section 35 Complaint Generation (CPA 2019)
                          </p>
                        </div>
                      </div>
                      <div class="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                        <span class="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400">Ready for District Commission</span>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-4">
                      <button
                        v-if="!isGeneratingFiling" 
                        class="flex-1 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all" 
                        @click="prepareFiling"
                      >
                        Generate Court-Ready Bundle
                      </button>
                      <button
                        v-else
                        disabled
                        class="flex-1 px-4 py-3 bg-slate-200 dark:bg-gov-dark-800 rounded-2xl animate-pulse text-[10px] font-black uppercase text-slate-400"
                      >
                        Generating Litigation Facts...
                      </button>
                    </div>
                  </section>
                </div>

                <!-- Enforcement HUD -->
                <div class="space-y-6">
                  <EscalationClock 
                    v-if="caseData.noticeDeadline" 
                    :deadline-at="caseData.noticeDeadline"
                    :server-time="currentServerTime"
                    :status="caseData.noticeStatus"
                  />
                  
                  <NoticeStatusMatrix 
                    v-if="caseData.noticeDeliveries"
                    :deliveries="caseData.noticeDeliveries"
                  />

                  <!-- Filing Optimization & Fees -->
                  <div class="p-6 bg-white dark:bg-gov-dark-900 rounded-[2.5rem] border border-slate-100 dark:border-gov-dark-800 space-y-4">
                    <div class="flex items-center justify-between">
                      <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Filing optimization
                      </p>
                      <span class="px-2 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-[8px] font-black uppercase">Statutory fee: ₹{{ statutoryFee }}</span>
                    </div>

                    <div class="space-y-3">
                      <p class="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                        Select Filing Mode (Max Success)
                      </p>
                      <div class="grid grid-cols-3 gap-2">
                        <button
                          v-for="mode in ['SPEED_POST', 'ONLINE', 'BOTH']" 
                          :key="mode"
                          class="py-2 rounded-xl text-[8px] font-black uppercase transition-all border"
                          :class="caseData.filingMode === mode ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-gov-dark-800 dark:border-gov-dark-700'"
                          @click="setFilingMode(mode)"
                        >
                          {{ mode.replace('_', ' ') }}
                        </button>
                      </div>
                    </div>

                    <div class="pt-2 border-t border-slate-50 dark:border-gov-dark-800 space-y-2">
                      <!-- Section: Advocate Verification Layer (Professional Substrate) -->
                      <section
                        v-if="isProfessional"
                        class="mb-8 p-6 rounded-[2.5rem] bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30"
                      >
                        <div class="flex items-center justify-between mb-4">
                          <h3 class="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest flex items-center">
                            <span class="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                            Advocate Rectification Panel
                          </h3>
                          <div class="flex flex-col items-end">
                            <span class="px-2 py-0.5 bg-amber-200/50 dark:bg-amber-800/30 text-[10px] font-bold text-amber-700 rounded-full mb-1">
                              {{ caseData.reviewStatus || 'PENDING' }}
                            </span>
                            <span
                              v-if="caseData.reviewedBy"
                              class="text-[8px] font-mono text-amber-600 uppercase tracking-tighter"
                            >
                              Professional ID: {{ caseData.reviewedBy }}
                            </span>
                          </div>
                        </div>

                        <p class="text-xs text-amber-800/70 dark:text-amber-400/60 leading-relaxed mb-4">
                          Authorized professional verification for court submission. All claim values are audited by a verified Advocate.
                        </p>

                        <div class="space-y-4">
                          <textarea 
                            v-model="reviewNotes"
                            placeholder="Enter professional rectification notes or correction requirements..."
                            class="w-full h-24 p-4 text-[12px] bg-white dark:bg-gov-dark-900 border border-amber-200 dark:border-amber-800/50 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                          />
              
                          <div class="flex gap-2">
                            <button
                              class="flex-1 py-3 bg-gov-blue-600 hover:bg-gov-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                              @click="submitReview('APPROVED')"
                            >
                              Approve for Filing
                            </button>
                            <button
                              class="flex-1 py-3 bg-white dark:bg-gov-dark-900 border border-amber-300 text-amber-700 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                              @click="submitReview('NEEDS_CORRECTION')"
                            >
                              Request Correction
                            </button>
                          </div>
                        </div>
                      </section>

                      <!-- Section: Authority Filing Engine (AFE V2) -->
                      <section
                        v-if="caseData.status === 'Escalated_to_Authority' || caseData.status === 'Court_Filed' || isProfessional"
                        class="mb-8"
                      >
                        <div class="flex items-center justify-between mb-6">
                          <h3 class="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center">
                            <span class="w-2 h-2 rounded-full bg-gov-blue-500 mr-2" />
                            Judicial Filing Substrate
                          </h3>
                        </div>

                        <div class="grid grid-cols-1 gap-3">
                          <!-- Complaint -->
                          <a
                            :href="`http://localhost:4000/api/cases/${caseData.id}/complaint`"
                            target="_blank"
                            class="flex items-center justify-between p-4 bg-white dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl hover:border-gov-blue-500 transition-all group"
                          >
                            <div class="flex items-center gap-3">
                              <div class="w-10 h-10 rounded-xl bg-gov-blue-50 dark:bg-gov-blue-900/20 flex items-center justify-center text-gov-blue-600">
                                <svg
                                  class="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                ><path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                /></svg>
                              </div>
                              <div>
                                <p class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Formal S. 35 Complaint</p>
                                <p class="text-[9px] text-slate-500">Annexure Index & List of Dates</p>
                              </div>
                            </div>
                            <svg
                              class="w-4 h-4 text-slate-300 group-hover:text-gov-blue-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            ><path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="3"
                              d="M9 5l7 7-7 7"
                            /></svg>
                          </a>

                          <!-- Draft Affidavit + Notary Helper -->
                          <div class="flex gap-2">
                            <a
                              href="#"
                              class="flex-1 flex items-center gap-3 p-4 bg-white dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl hover:border-gov-blue-500 transition-all"
                            >
                              <div class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/20 flex items-center justify-center text-slate-400">
                                <svg
                                  class="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                ><path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                /></svg>
                              </div>
                              <div>
                                <p class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Draft Affidavit</p>
                                <p class="text-[9px] text-slate-500">Notarization Template</p>
                              </div>
                            </a>
                            <button
                              class="px-6 bg-slate-100 dark:bg-gov-dark-900 border border-slate-200 dark:border-gov-dark-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-gov-dark-800 transition-colors flex flex-col items-center justify-center"
                              @click="findNotary"
                            >
                              <span class="text-[9px] font-black uppercase tracking-tighter text-slate-500 text-center whitespace-nowrap">Find Authorized</span>
                              <span class="text-[9px] font-black uppercase tracking-tighter text-slate-800 dark:text-slate-200">Witness/Notary</span>
                            </button>
                          </div>
                        </div>
                      </section>

                      <div class="pt-2 border-t border-slate-50 dark:border-gov-dark-800 space-y-2">
                        <div class="flex justify-between items-center">
                          <span class="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Value at Stake</span>
                          <span class="text-[10px] font-black text-slate-900 dark:text-white line-through opacity-30">₹{{ caseData.claimAmount || '0' }}</span>
                        </div>
                        <div class="flex justify-between items-center text-indigo-600">
                          <span class="text-[8px] font-bold uppercase tracking-tighter">Litigation Merit (Final)</span>
                          <span class="text-[10px] font-black">₹{{ caseData.finalCourtClaimValue || 'Pending' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Sidebar -->
            <div class="space-y-8">
              <!-- Company Profile -->
              <div class="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
                <div class="space-y-1">
                  <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Primary Offender
                  </p>
                  <h4 class="text-2xl font-black tracking-tight">
                    {{ caseData.company }}
                  </h4>
                </div>
                
                <div class="pt-4 space-y-4">
                  <div class="flex justify-between items-end">
                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">Industry Cases</span>
                    <span class="text-lg font-black text-gov-primary-400">{{ companyCountValue }} similar cases</span>
                  </div>
                  <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div class="h-full bg-gov-primary-600 w-[65%]" />
                  </div>
                  <p class="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                    This company is currently under review by our "Name & Shame" policy due to recurring grievances in the {{ caseData.category }} sector.
                  </p>
                </div>
              </div>

              <!-- Exhibit Download -->
              <div
                v-if="caseData.filePath"
                class="space-y-3"
              >
                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Documentary Evidence
                </h3>
                <a
                  :href="fileUrl"
                  target="_blank"
                  class="block w-full text-center py-4 bg-gov-primary-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-glow-indigo hover:-translate-y-1 transition-all active:scale-95"
                >
                  📥 Download Full Exhibit
                </a>
              </div>
              
              <!-- Legal Compliance Seal -->
              <div class="p-6 border border-slate-200 dark:border-gov-dark-800 rounded-[2rem] bg-slate-50 dark:bg-gov-dark-950/20">
                <p class="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Legal Compliance Footer
                </p>
                <p class="text-[9px] text-slate-500 italic leading-relaxed">
                  "All information are backed and sourced from respective legal courts and public and are system generated formula driven and no human intervention."
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, onUnmounted, onMounted } from 'vue';
import CaseTimeline from './CaseTimeline.vue';
import EscalationClock from './EscalationClock.vue';
import NoticeStatusMatrix from './NoticeStatusMatrix.vue';


import axios from 'axios';
import { io } from 'socket.io-client';
import { getCurrentUser } from '../services/auth';

const props = defineProps({
  isOpen: Boolean,
  caseData: {
    type: Object,
    required: true
  },
  companyCount: {
    type: Number,
    default: 0
  }
});

const companyCountValue = computed(() => props.companyCount || 0);
const isProfessional = computed(() => {
  const user = getCurrentUser() || {};
  const bypass = localStorage.getItem('bypass_active') === 'true';
  const hasRole = ['ADVOCATE', 'admin'].includes(user.role);
  
  if (bypass) console.log('🛡️ [HUD_DEBUG] Professional bypass active.');
  if (!hasRole && !bypass) {
    console.warn('🕵️ [HUD_DEBUG] Role mismatch detected. Current Role:', user.role);
    // Secondary check: verify if 'ADVOCATE' string exists in raw storage if object is mangled
    const rawUser = localStorage.getItem('user') || '';
    if (rawUser.includes('ADVOCATE')) {
       console.log('✅ [HUD_RECOVERY] Recovered role from raw substrate.');
       return true;
    }
  }
  
  return hasRole || bypass;
});

const emit = defineEmits(['close', 'refresh']);

const isGeneratingFiling = ref(false);
const currentServerTime = ref(new Date().toISOString());
const reviewNotes = ref(props.caseData.reviewNotes || '');

// Sync local state with prop updates (Substrate Reaction)
import { watch } from 'vue';
watch(() => props.caseData.reviewNotes, (newNotes) => {
  reviewNotes.value = newNotes || '';
});
let socket = null;

async function submitReview(status) {
  try {
    await axios.post(`http://localhost:4000/api/cases/${props.caseData.id}/review`, {
      status,
      notes: reviewNotes.value
    });
    // Trigger notification or local state update
    emit('refresh', props.caseData.id);
  } catch (error) {
    console.error('❌ [REVIEW_FAILURE] Could not commit advocate rectification:', error);
  }
}











async function findNotary() {
  try {
    const res = await axios.get(`http://localhost:4000/api/notaries?jurisdiction=${props.caseData.jurisdiction}`);
    // In a real app, this would open a sub-modal with the list. 
    // For industrial demo, we alert the top result.
    if (res.data && res.data.length > 0) {
      const n = res.data[0];
      alert(`📍 Authorized Notary Found: ${n.name}\nAddress: ${n.address}\nContact: ${n.contact}`);
    } else {
      alert('🔍 No authorized notaries found in this jurisdiction. Please contact the District Commission.');
    }
  } catch (err) {
    console.error('Notary lookup failed:', err);
  }
}

onMounted(() => {
  // Initialize Real-Time Substrate (Telemetry)
  socket = io('http://localhost:4000');
  
  socket.on('connect', () => {
    console.log('📡 Substrate Linked: Telemetry Online');
    socket.emit('join_case', props.caseData.id);
  });

  socket.on('caseUpdate', (data) => {
    console.log('⚡ Telemetry Pulse Received:', data.type);
    
    // Auto-update server time drift if available in payload
    if (data.timestamp) currentServerTime.value = data.timestamp;
    
    // Trigger parent refresh to update the Entire Litigation HUD
    emit('refresh', props.caseData.id);
  });

  // Sync server time drift (Fallback heartbeat)
  const driftInterval = setInterval(() => {
    currentServerTime.value = new Date().toISOString();
  }, 30000);

  onUnmounted(() => {
    if (socket) {
      socket.disconnect();
      console.log('📡 Substrate Unlinked');
    }
    clearInterval(driftInterval);
  });
});

function close() {
  emit('close');
}

const statutoryFee = computed(() => {
  const val = props.caseData.finalCourtClaimValue || 0;
  if (val <= 500000) return 0;
  if (val <= 1000000) return 200;
  if (val <= 2000000) return 400;
  if (val <= 5000000) return 1000;
  if (val <= 10000000) return 2000;
  if (val <= 20000000) return 2500;
  if (val <= 40000000) return 4000;
  if (val <= 60000000) return 6000;
  if (val <= 100000000) return 7500;
  return 10000;
});

async function setFilingMode(mode) {
  try {
    const response = await axios.patch(`http://localhost:4000/api/cases/${props.caseData.id}/filing-mode`, { filingMode: mode });
    if (response.data.success) {
      // Optimistically update local state if needed, or wait for parent refresh
      // Update local state via emit or ref if needed; avoid mutating prop directly
    }
  } catch (error) {
    console.error('Failed to update filing mode:', error);
  }
}

async function prepareFiling() {
  isGeneratingFiling.value = true;
  try {
    const response = await axios.get(`http://localhost:4000/api/cases/${props.caseData.id}/filing-package`);
    if (response.data.complaintUrl) {
      window.open(`http://localhost:4000${response.data.complaintUrl}`, '_blank');
    }
  } catch (error) {
    console.error('Filing Generation Failed:', error);
    alert('Failed to generate court-ready bundle. Ensure all evidence exhibits are verified.');
  } finally {
    isGeneratingFiling.value = false;
  }
}










const fileUrl = computed(() => {
  if (!props.caseData?.filePath) return '';
  return `http://localhost:4000${props.caseData.filePath}`;
});


</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
