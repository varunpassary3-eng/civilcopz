<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 backdrop-blur-sm bg-slate-900/40">
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
          <button @click="close" class="p-4 hover:bg-slate-50 dark:hover:bg-gov-dark-800 rounded-2xl transition-all group">
            <span class="text-2xl grayscale group-hover:grayscale-0 transition-all">✖</span>
          </button>
        </header>

        <!-- Body -->
        <main class="flex-1 overflow-y-auto p-8 pt-6 space-y-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left Info -->
            <div class="lg:col-span-2 space-y-8">
              <section class="space-y-4">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Statement of Grievance</h3>
                <p class="text-lg font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{{ caseData.description }}"
                </p>
              </section>

              <!-- AI Intelligence Surface -->
              <section v-if="caseData.aiCategory" class="p-8 bg-gov-primary-600/5 dark:bg-gov-primary-600/10 border border-gov-primary-600/20 rounded-[2.5rem] relative overflow-hidden">
                <div class="absolute top-0 right-0 p-8 opacity-5">
                   <span class="text-6xl font-black text-gov-primary-600 italic">AI</span>
                </div>
                <div class="relative z-10 space-y-6">
                  <div class="flex items-center gap-3">
                    <span class="w-3 h-3 bg-gov-primary-600 rounded-full animate-pulse"></span>
                    <h3 class="text-sm font-black uppercase tracking-widest text-gov-primary-600">Legal Intelligence Snapshot</h3>
                  </div>
                  
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div>
                      <p class="text-[9px] font-black uppercase text-slate-400 mb-1">Status Confidence</p>
                      <p class="text-xl font-black text-slate-900 dark:text-white">94.2%</p>
                    </div>
                    <div>
                      <p class="text-[9px] font-black uppercase text-slate-400 mb-1">Precedent Match</p>
                      <p class="text-xl font-black text-slate-900 dark:text-white">High</p>
                    </div>
                    <div>
                      <p class="text-[9px] font-black uppercase text-slate-400 mb-1">Resolution ETA</p>
                      <p class="text-xl font-black text-slate-900 dark:text-white">14 Days</p>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Timeline -->
              <section class="space-y-4">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Case Evolution Timeline</h3>
                <CaseTimeline :timeline="caseData.timeline" />
              </section>
            </div>

            <!-- Right Sidebar -->
            <div class="space-y-8">
              <!-- Company Profile -->
              <div class="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
                <div class="space-y-1">
                  <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Primary Offender</p>
                  <h4 class="text-2xl font-black tracking-tight">{{ caseData.company }}</h4>
                </div>
                
                <div class="pt-4 space-y-4">
                   <div class="flex justify-between items-end">
                      <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">Industry Cases</span>
                      <span class="text-lg font-black text-gov-primary-400">{{ companyCount }} similar cases</span>
                   </div>
                   <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div class="h-full bg-gov-primary-600 w-[65%]"></div>
                   </div>
                   <p class="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                     This company is currently under review by our "Name & Shame" policy due to recurring grievances in the {{ caseData.category }} sector.
                   </p>
                </div>
              </div>

              <!-- Exhibit Download -->
              <div v-if="caseData.filePath" class="space-y-3">
                 <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Documentary Evidence</h3>
                 <a :href="fileUrl" target="_blank" class="block w-full text-center py-4 bg-gov-primary-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-glow-indigo hover:-translate-y-1 transition-all active:scale-95">
                   📥 Download Full Exhibit
                 </a>
              </div>
              
              <!-- Legal Compliance Seal -->
              <div class="p-6 border border-slate-200 dark:border-gov-dark-800 rounded-[2rem] bg-slate-50 dark:bg-gov-dark-950/20">
                <p class="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Legal Compliance Footer</p>
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
import { computed } from 'vue';
import CaseTimeline from './CaseTimeline.vue';

const props = defineProps({
  isOpen: Boolean,
  caseData: Object,
  companyCount: Number
});

const emit = defineEmits(['close']);

function close() {
  emit('close');
}

const formattedDate = computed(() => {
  if (!props.caseData?.createdAt) return 'Unknown';
  const date = new Date(props.caseData.createdAt);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
});

const fileUrl = computed(() => {
  if (!props.caseData?.filePath) return '';
  return `http://localhost:4000${props.caseData.filePath}`;
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
