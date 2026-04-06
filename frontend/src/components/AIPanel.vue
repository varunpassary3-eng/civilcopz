<template>
  <div class="p-6 bg-gray-900 text-white rounded-xl shadow-2xl border border-blue-500/20">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center animate-pulse">
        🤖
      </div>
      <h2 class="text-xl font-bold">
        AI CivilCOPZ Control Panel
      </h2>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-400 mb-2">Case Narrative Analysis</label>
        <textarea 
          v-model="input" 
          placeholder="Paste consumer grievance text here for industrial classification..."
          class="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-white h-32 transition-all"
        />
      </div>

      <button 
        :disabled="loading" 
        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
        @click="analyze"
      >
        <span
          v-if="loading"
          class="animate-spin"
        >🌀</span>
        {{ loading ? 'Analyzing Sovereign Substrate...' : 'Execute AI Analysis' }}
      </button>

      <div
        v-if="result"
        class="mt-6 p-4 bg-gray-800/50 rounded-lg border-l-4 border-blue-500 animate-fade-in space-y-4"
      >
        <h3 class="text-blue-400 font-bold mb-2 flex items-center gap-2">
          ✅ Analysis & Reputation Complete
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="p-3 bg-gray-800 rounded">
            <p class="text-xs text-gray-500 uppercase font-bold">
              Category
            </p>
            <p class="text-lg">
              {{ result.category }}
            </p>
          </div>
          <div class="p-3 bg-gray-800 rounded">
            <p class="text-xs text-gray-500 uppercase font-bold">
              Risk Tier
            </p>
            <p
              class="text-lg"
              :class="{'text-red-400': result.severity === 'High'}"
            >
              {{ result.severity }}
            </p>
          </div>
        </div>
        
        <!-- Reputation Insight (Operations-Grade - Phase 11) -->
        <div
          v-if="result.reputation"
          class="p-3 bg-gray-800/80 rounded border border-gray-700"
        >
          <div class="flex justify-between items-center mb-1">
            <p class="text-xs text-gray-500 uppercase font-bold">
              Historical Risk Score
            </p>
            <span class="text-[10px] font-black px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">{{ result.reputation.score }} pts</span>
          </div>
          <p
            class="text-sm font-bold"
            :class="{'text-red-500': result.reputation.score > 30}"
          >
            {{ result.reputation.tier }} Detected
          </p>
          <p class="text-[10px] text-gray-500">
            Based on {{ result.reputation.totalCases }} historical grievances.
          </p>
        </div>

        <div class="mt-4 p-3 bg-blue-900/20 rounded">
          <p class="text-xs text-blue-400 uppercase font-bold">
            Intelligence Advisory
          </p>
          <p class="italic text-gray-300">
            "{{ result.suggestion || result.suggestedAction }}"
          </p>
        </div>

        <!-- Statutory Advocacy (Phase 12) -->
        <div
          v-if="caseId"
          class="pt-4 border-t border-gray-700"
        >
          <button 
            class="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2" 
            @click="draftLegalNotice"
          >
            ⚖️ Draft Statutory Notice
          </button>
          
          <div
            v-if="legalNotice"
            class="mt-4 p-3 bg-black/40 rounded border border-blue-900/50 animate-fade-in"
          >
            <h4 class="text-[10px] font-black uppercase text-blue-500 mb-2">
              Notice Boilerplate (Sec 2(11) CPA)
            </h4>
            <pre class="text-[10px] font-mono text-gray-400 whitespace-pre-wrap h-32 overflow-y-auto">{{ legalNotice }}</pre>
            <button
              class="mt-2 text-[10px] font-bold text-blue-400 underline"
              @click="copyNotice"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { classifyCase } from '../services/ai'

const props = defineProps(['caseId'])
const input = ref('')
const loading = ref(false)
const result = ref(null)
const legalNotice = ref('')

const analyze = async () => {
  if (!input.value) return;
  
  loading.value = true;
  try {
    result.value = await classifyCase(input.value);
  } catch (err) {
    console.error('AI Analysis failed:', err);
  } finally {
    loading.value = false;
  }
}

const draftLegalNotice = async () => {
  if (!props.caseId) return;
  try {
    const response = await axios.get(`http://localhost:4000/api/ai/advise/${props.caseId}`);
    legalNotice.value = response.data.statutoryNotice;
  } catch (err) {
    console.error('Legal drafting failed:', err);
  }
}

const copyNotice = () => {
  navigator.clipboard.writeText(legalNotice.value);
  alert('Legal notice substrate copied to clipboard.');
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
