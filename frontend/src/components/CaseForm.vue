<template>
  <div class="max-w-4xl mx-auto p-4 md:p-8">
    <div class="bg-white dark:bg-gov-dark-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-gov-dark-800">
      <!-- Stepper Header -->
      <div class="bg-slate-50 dark:bg-gov-dark-950 p-8 border-b border-slate-200 dark:border-gov-dark-800">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              Grievance Submission
            </h1>
            <p class="text-[10px] font-black text-gov-primary-600 uppercase tracking-widest">
              Consumer Justice Substrate v2.0
            </p>
          </div>
          <div class="text-right">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step {{ currentStep }} of 5</span>
            <div class="flex gap-1 mt-2">
              <div
                v-for="i in 5"
                :key="i"
                :class="['h-1 w-8 rounded-full transition-all duration-500', i <= currentStep ? 'bg-gov-primary-600' : 'bg-slate-200 dark:bg-gov-dark-800']"
              />
            </div>
          </div>
        </div>
      </div>

      <form
        class="p-8 md:p-12 space-y-10"
        @submit.prevent="submitCase"
      >
        <!-- Step 1: Grievant KYC Details -->
        <div
          v-if="currentStep === 1"
          class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500"
        >
          <div class="space-y-2">
            <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <span class="w-2 h-2 bg-gov-primary-600 rounded-full" />
              Grievant KYC Details
            </h2>
            <p class="text-xs text-slate-400 font-medium">
              Capture the official identity of the complainant for the evidentiary record.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Complainant Name</label>
              <input
                v-model="form.consumerName"
                type="text"
                required
                placeholder="As per Identity Proof"
                class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
              >
            </div>
            <div class="space-y-2">
              <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Email Address</label>
              <input
                v-model="form.consumerEmail"
                type="email"
                required
                placeholder="Verification destination..."
                class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
              >
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Primary</label>
              <input
                v-model="form.consumerPhone"
                type="tel"
                required
                placeholder="+91..."
                class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
              >
            </div>
            <div class="space-y-2">
              <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Residential/Official Address</label>
              <input
                v-model="form.consumerAddress"
                type="text"
                required
                placeholder="Complete address for statutory service..."
                class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
              >
            </div>
          </div>
        </div>

        <!-- Step 2: Grievance Specification -->
        <div
          v-if="currentStep === 2"
          class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500"
        >
          <div class="space-y-2">
            <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <span class="w-2 h-2 bg-gov-primary-600 rounded-full" />
              Grievance Specification
            </h2>
            <p class="text-xs text-slate-400 font-medium">
              Define the core issue and the entity responsible.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-6">
            <div class="space-y-2">
              <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Case Title</label>
              <input
                v-model="form.title"
                type="text"
                required
                placeholder="e.g. Unauthorized Deductions from Savings Account"
                class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
              >
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Against Company/Entity</label>
                <input
                  v-model="form.company"
                  type="text"
                  required
                  placeholder="e.g. National Bank of India"
                  class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
                >
              </div>
              <div class="space-y-2">
                <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Industry Category</label>
                <select
                  v-model="form.category"
                  required
                  class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select Category
                  </option>
                  <option
                    v-for="cat in categories"
                    :key="cat"
                    :value="cat"
                  >
                    {{ cat }}
                  </option>
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Factual Description</label>
              <textarea
                v-model="form.description"
                required
                placeholder="Detailed sequence of events..."
                class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all min-h-[150px]"
              />
            </div>
          </div>
        </div>

        <!-- Step 3: Pecuniary Substrate -->
        <div
          v-if="currentStep === 3"
          class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500"
        >
          <div class="space-y-2">
            <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <span class="w-2 h-2 bg-gov-primary-600 rounded-full" />
              Pecuniary & Territorial Jurisdiction
            </h2>
            <p class="text-xs text-slate-400 font-medium">
              Specify the economic values involved to determine the appropriate Commission.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Consideration Paid (INR)</label>
              <input
                v-model="form.considerationPaid"
                type="number"
                step="0.01"
                placeholder="Amount actually spent..."
                class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
              >
            </div>
            <div class="space-y-2">
              <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Compensation Claimed (Expected)</label>
              <input
                v-model="form.expectedCompensationClient"
                type="number"
                step="0.01"
                placeholder="Desired compensation..."
                class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
              >
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Territorial Commission Level</label>
            <div class="grid grid-cols-3 gap-2">
              <button 
                v-for="j in ['District', 'State', 'National']" 
                :key="j"
                type="button"
                class="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border"
                :class="form.jurisdiction === j ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-100'"
                @click="form.jurisdiction = j"
              >
                {{ j }}
              </button>
            </div>
          </div>
        </div>

        <!-- Step 4: Evidence Submission -->
        <div
          v-if="currentStep === 4"
          class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500"
        >
          <div class="space-y-2">
            <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <span class="w-2 h-2 bg-gov-primary-600 rounded-full" />
              Evidence Locker (Multi-File)
            </h2>
            <p class="text-xs text-slate-400 font-medium">
              Upload supporting documents. Every file is hashed for integrity. (PDF Only)
            </p>
          </div>

          <div 
            :class="['border-2 border-dashed rounded-[2rem] p-12 text-center transition-all cursor-pointer', dragActive ? 'border-gov-primary-600 bg-gov-primary-600/5' : 'border-slate-200 dark:border-gov-dark-800 hover:border-slate-300 dark:hover:border-gov-dark-700']"
            @dragover.prevent="dragActive = true"
            @dragleave.prevent="dragActive = false"
            @drop.prevent="handleDrop"
            @click="$refs.fileInput.click()"
          >
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="application/pdf"
              class="hidden"
              @change="handleFiles"
            >
            <div class="w-20 h-20 bg-slate-100 dark:bg-gov-dark-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">
              Drop Evidence Here
            </h3>
            <p class="text-[10px] font-bold text-slate-400 uppercase">
              Limit: 5 Files, Total 25MB (PDF only)
            </p>
          </div>

          <!-- File List -->
          <div
            v-if="files.length > 0"
            class="space-y-3"
          >
            <div
              v-for="(file, index) in files"
              :key="index"
              class="bg-white dark:bg-gov-dark-950 p-4 rounded-2xl border border-slate-200 dark:border-gov-dark-800 flex justify-between items-center shadow-sm"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-red-100 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                  <span class="text-[8px] font-black text-red-600 dark:text-red-400 uppercase">PDF</span>
                </div>
                <div>
                  <p class="text-xs font-black text-slate-700 dark:text-slate-200">
                    {{ file.name }}
                  </p>
                  <p class="text-[8px] font-bold text-slate-400 uppercase">
                    {{ (file.size / 1024 / 1024).toFixed(2) }} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full text-red-500 transition-colors"
                @click.stop="removeFile(index)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Step 5: Legal Declaration -->
        <div
          v-if="currentStep === 5"
          class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500"
        >
          <div class="space-y-2">
            <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <span class="w-2 h-2 bg-gov-primary-600 rounded-full" />
              Procedural Declaration
            </h2>
            <p class="text-xs text-slate-400 font-medium">
              Final validation of grievance veracity under the Consumer Protection Act, 2019.
            </p>
          </div>

          <div class="bg-slate-50 dark:bg-gov-dark-950 p-6 rounded-[2rem] border border-slate-200 dark:border-gov-dark-800 space-y-4">
            <div class="text-[11px] text-slate-600 dark:text-slate-400 font-serif leading-relaxed italic">
              <p class="mb-4">
                I, <strong>{{ form.consumerName || '[Full Name]' }}</strong>, the complainant above named, do hereby solemnly affirm and declare that:
              </p>
              <ol class="list-decimal pl-4 space-y-2">
                <li>The contents of this complaint are true and correct to my knowledge and belief.</li>
                <li>I have not suppressed any material fact.</li>
                <li>The documents uploaded by me are true copies of their respective originals.</li>
                <li>The matter is within the jurisdiction of the appropriate Consumer Commission.</li>
                <li>This complaint is filed in good faith and in the interest of justice.</li>
              </ol>
            </div>

            <div class="pt-4 border-t border-slate-200 dark:border-gov-dark-800">
              <label class="flex items-start gap-3 cursor-pointer group">
                <input
                  v-model="form.isDeclaredTrue"
                  type="checkbox"
                  class="mt-1 w-4 h-4 rounded border-slate-300 text-gov-primary-600 focus:ring-gov-primary-600"
                >
                <span class="text-[10px] font-black uppercase text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                  I accept this declaration and solemnly affirm its contents.
                </span>
              </label>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Type Full Legal Name to Sign</label>
            <input 
              v-model="form.declaredName" 
              type="text" 
              :placeholder="form.consumerName"
              class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all"
            >
            <p
              v-if="form.declaredName && form.declaredName !== form.consumerName"
              class="text-[8px] font-bold text-red-500 uppercase tracking-wider ml-1"
            >
              Warning: Signature name does not match KYC name.
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between items-center pt-10 border-t border-slate-100 dark:border-gov-dark-800">
          <button 
            v-if="currentStep > 1"
            type="button" 
            class="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
            @click="currentStep--"
          >
            ← Back
          </button>
          <div v-else />

          <button 
            v-if="currentStep < 5"
            type="button"
            class="px-10 py-4 bg-gov-primary-600 hover:bg-gov-primary-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-gov-primary-600/25 active:scale-95"
            @click="currentStep++"
          >
            Proceed to {{ currentStep === 4 ? 'Declaration' : (currentStep === 3 ? 'Evidence' : (currentStep === 2 ? 'Pecuniary' : 'Specification')) }} →
          </button>

          <button 
            v-else
            type="submit" 
            :disabled="loading || !form.isDeclaredTrue || form.declaredName !== form.consumerName"
            class="px-12 py-4 bg-gov-primary-600 hover:bg-gov-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-gov-primary-600/25 active:scale-95"
          >
            {{ loading ? 'Synchronizing with Substrate...' : 'Finalize Grievance Filing' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createCase } from '../services/api';

const router = useRouter();
const currentStep = ref(1);
const loading = ref(false);
const dragActive = ref(false);
const files = ref([]);

const categories = ['Telecom', 'Banking', 'Insurance', 'E-Commerce', 'Other'];

const form = ref({
  consumerName: '',
  consumerEmail: '',
  consumerPhone: '',
  consumerAddress: '',
  title: '',
  description: '',
  company: '',
  category: '',
  jurisdiction: 'District',
  considerationPaid: null,
  expectedCompensationClient: null,
  isDeclaredTrue: false,
  declaredName: '',
});

function handleFiles(e) {
  const newFiles = Array.from(e.target.files);
  files.value = [...files.value, ...newFiles].slice(0, 5);
}

function handleDrop(e) {
  dragActive.value = false;
  const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
  files.value = [...files.value, ...newFiles].slice(0, 5);
}

function removeFile(index) {
  files.value.splice(index, 1);
}

async function submitCase() {
  loading.value = true;
  try {
    const caseData = {
      ...form.value,
      documents: files.value
    };
    
    await createCase(caseData);
    alert('Case submitted successfully to the National Consumer Substrate.');
    router.push('/cases');
  } catch (error) {
    console.error('Submission failure:', error);
    alert('System error during substrate synchronization. Please verify input data.');
  } finally {
    loading.value = false;
  }
}
</script>
