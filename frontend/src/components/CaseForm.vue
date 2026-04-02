<template>
  <div class="max-w-2xl mx-auto p-4 relative">
    <!-- Background atmospheric glow -->
    <div class="absolute -top-20 -right-20 w-64 h-64 bg-gov-primary-600/5 blur-[100px] rounded-full -z-10"></div>
    
    <div class="backdrop-blur-xl bg-white/70 dark:bg-gov-dark-900/80 border border-white/20 dark:border-gov-dark-800/50 p-10 rounded-[2.5rem] shadow-2xl">
      <div class="flex items-center gap-4 mb-10">
        <div class="w-12 h-12 bg-gov-primary-600 rounded-2xl flex items-center justify-center shadow-glow-indigo shrink-0">
          <span class="text-white text-xl">📝</span>
        </div>
        <div>
          <h2 class="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">File New Grievance</h2>
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Consumer Protection Protocol v2.0</p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Case Designation</label>
            <input 
              v-model="title" 
              required 
              placeholder="e.g., Defective Electronic Hardware"
              class="w-full bg-slate-50/50 dark:bg-gov-dark-950/50 border border-slate-200 dark:border-gov-dark-800 p-3.5 px-5 rounded-2xl text-sm focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all" 
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Target Entity</label>
            <input 
              v-model="company" 
              required 
              placeholder="Company Name"
              class="w-full bg-slate-50/50 dark:bg-gov-dark-950/50 border border-slate-200 dark:border-gov-dark-800 p-3.5 px-5 rounded-2xl text-sm focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all" 
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Grievance Category</label>
            <select 
              v-model="category" 
              required 
              class="w-full bg-slate-50/50 dark:bg-gov-dark-950/50 border border-slate-200 dark:border-gov-dark-800 p-3.5 px-5 rounded-2xl text-sm focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all appearance-none"
            >
              <option value="Telecom">Telecom</option>
              <option value="Banking">Banking</option>
              <option value="Insurance">Insurance</option>
              <option value="E-commerce">E-commerce</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Bureau Jurisdiction</label>
            <select 
              v-model="jurisdiction" 
              required 
              class="w-full bg-slate-50/50 dark:bg-gov-dark-950/50 border border-slate-200 dark:border-gov-dark-800 p-3.5 px-5 rounded-2xl text-sm focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all appearance-none"
            >
              <option value="District">District</option>
              <option value="State">State</option>
              <option value="National">National</option>
            </select>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Evidentiary Statement</label>
          <textarea 
            v-model="description" 
            required 
            rows="4" 
            placeholder="Detailed description of the incident..."
            class="w-full bg-slate-50/50 dark:bg-gov-dark-950/50 border border-slate-200 dark:border-gov-dark-800 p-3.5 px-5 rounded-2xl text-sm focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all resize-none"
          ></textarea>
        </div>

        <div class="space-y-1.5">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Digital Appendices (PDF)</label>
          <div class="flex items-center gap-3">
            <input 
              type="file" 
              @change="handleFileChange" 
              accept=".pdf" 
              class="flex-1 bg-slate-50/50 dark:bg-gov-dark-950/50 border border-slate-200 dark:border-gov-dark-800 p-2.5 px-4 rounded-2xl text-xs focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all" 
            />
          </div>
        </div>

        <div v-if="aiHint" class="p-4 bg-gov-primary-600/5 dark:bg-gov-primary-600/10 rounded-2xl border border-gov-primary-600/20">
          <p class="text-[10px] font-black uppercase tracking-widest text-gov-primary-600 mb-1">Intelligence Insight</p>
          <p class="text-xs font-bold text-slate-700 dark:text-slate-300 italic">{{ aiHint }}</p>
        </div>

        <div class="flex items-start gap-3 p-4 bg-slate-50 dark:bg-gov-dark-950/20 rounded-2xl border border-slate-200 dark:border-gov-dark-800">
          <input 
            type="checkbox" 
            v-model="consented" 
            id="disclaimer-consent" 
            required 
            class="mt-1 w-4 h-4 rounded-md border-slate-300 text-gov-primary-600 focus:ring-gov-primary-600" 
          />
          <label for="disclaimer-consent" class="text-[10px] text-slate-500 font-medium leading-relaxed italic cursor-pointer">
            I acknowledge that all information are backed and sourced from respective legal courts and public and are system generated formula driven and no human intervention and any updation and adjustment happens only on court orders.
          </label>
        </div>

        <div class="pt-4">
          <button 
            type="submit" 
            :disabled="submitting || !consented"
            class="w-full bg-gov-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow-indigo hover:bg-gov-primary-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span v-if="submitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ submitting ? 'Transmitting Records...' : 'Initiate Official Review' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createCaseWithSync } from '../services/caseService';

const router = useRouter();
const title = ref('');
const description = ref('');
const company = ref('');
const category = ref('Other');
const jurisdiction = ref('District');
const aiHint = ref('');
const file = ref(null);
const submitting = ref(false);
const consented = ref(false);

function handleFileChange(event) {
  file.value = event.target.files[0];
}

async function handleSubmit() {
  submitting.value = true;
  aiHint.value = '';

  try {
    const caseData = {
      title: title.value,
      description: description.value,
      company: company.value,
      category: category.value,
      jurisdiction: jurisdiction.value,
      file: file.value,
    };

    await createCaseWithSync(caseData);
    
    // Clear form
    title.value = '';
    description.value = '';
    company.value = '';
    file.value = null;
    
    // Alert user
    aiHint.value = 'Grievance logged in local engine. Syncing with National Database...';
    
    setTimeout(() => {
      router.push('/cases');
    }, 1000);
  } catch (error) {
    console.error('[SUBMISSION_ERROR]', error);
    aiHint.value = 'Execution failure. System unable to transmit records at this time.';
  } finally {
    submitting.value = false;
  }
}
</script>
