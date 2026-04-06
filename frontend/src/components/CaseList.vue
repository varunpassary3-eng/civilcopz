<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <!-- List Header & Controls -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <h2 class="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
          Grievance Archives
        </h2>
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Official Case Records & Resolution Tracking
        </p>
      </div>

      <!-- Discovery HUD: Search Substrate -->
      <div class="relative w-full md:w-80">
        <input 
          v-model="search" 
          placeholder="SEARCH RELIANCE, ADANI, TATA..."
          class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-gov-dark-900 border border-slate-200 dark:border-gov-dark-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all focus:ring-2 focus:ring-gov-primary-600 focus:border-gov-primary-600 outline-none" 
          @input="debouncedSearch"
        >
        <span class="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 select-none">🔍</span>
      </div>
    </div>

    <!-- Status Filters -->
    <div class="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-gov-dark-900 rounded-2xl border border-slate-200 dark:border-gov-dark-800">
      <button 
        v-for="status in ['All', ...lifecycleSteps]" 
        :key="status"
        class="px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
        :class="(statusFilter === status || (status === 'All' && !statusFilter)) ? 'bg-white dark:bg-gov-dark-800 text-gov-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'"
        @click="setStatusFilter(status)"
      >
        {{ status.replace(/_/g, ' ') }}
      </button>
    </div>

    <!-- Results Area -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div class="w-12 h-12 border-4 border-gov-primary-600 border-t-transparent rounded-full animate-spin shadow-glow-indigo" />
      <span class="text-[10px] font-black uppercase text-slate-400 animate-pulse tracking-widest">Accessing Secure Database...</span>
    </div>

    <div
      v-else
      class="space-y-4"
    >
      <div
        v-if="cases.length === 0"
        class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-gov-dark-800 rounded-[2.5rem] bg-slate-50/50 dark:bg-gov-dark-950/20"
      >
        <span class="text-4xl mb-4 grayscale opacity-50">📂</span>
        <h3 class="font-black uppercase tracking-tighter text-slate-400 dark:text-slate-600">
          No Records Found in Current Filter
        </h3>
      </div>
      
      <transition-group
        name="list"
        tag="div"
        class="grid grid-cols-1 gap-4"
      >
        <CaseCard 
          v-for="caseItem in cases" 
          :key="caseItem.id" 
          :case-data="caseItem" 
          :is-admin="isAdmin"
          :company-count="countSimilarCases(caseItem.company)"
          @status-changed="handleStatusChange"
          @select="handleSelect"
        />
      </transition-group>

      <!-- Archive Selection HUD -->
      <CaseModal 
        v-if="selectedCase"
        :is-open="isModalOpen"
        :case-data="selectedCase"
        :company-count="countSimilarCases(selectedCase.company)"
        @close="closeModal"
        @refresh="refreshRecord"
      />
      
      <!-- Pagination -->
      <div
        v-if="pagination.pages > 1"
        class="pt-8 flex items-center justify-center gap-4"
      >
        <button 
          :disabled="pagination.page <= 1" 
          class="p-2 px-4 bg-white dark:bg-gov-dark-900 border border-slate-200 dark:border-gov-dark-800 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-gov-dark-800 transition-all active:scale-95 shadow-sm"
          @click="changePage(pagination.page - 1)"
        >
          Previous
        </button>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-black text-gov-primary-600">{{ pagination.page }}</span>
          <span class="text-[10px] font-black text-slate-300">/</span>
          <span class="text-[10px] font-black text-slate-400">{{ pagination.pages }}</span>
        </div>
        <button 
          :disabled="pagination.page >= pagination.pages" 
          class="p-2 px-4 bg-white dark:bg-gov-dark-900 border border-slate-200 dark:border-gov-dark-800 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-gov-dark-800 transition-all active:scale-95 shadow-sm"
          @click="changePage(pagination.page + 1)"
        >
          Next Page
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import CaseCard from './CaseCard.vue';
import CaseModal from './CaseModal.vue';
import { fetchCasesWithFilters } from '../services/caseService';
import { getCurrentUser } from '../services/auth';
import { changeCaseStatus } from '../services/caseService';
import { getCaseById } from '../services/api';

const cases = ref([]);
const pagination = ref({ page: 1, pages: 1, total: 0, limit: 10 });
const search = ref('');
const categoryFilter = ref('');
const statusFilter = ref('');
const loading = ref(false);

const selectedCase = ref(null);
const isModalOpen = ref(false);

const isAdmin = computed(() => {
  const user = getCurrentUser();
  return user && user.role === 'admin';
});

const lifecycleSteps = [
  'Draft', 'Submitted', 'Under_Review', 'Notice_Sent', 
  'Company_Responded', 'Negotiation_Mediation', 'Escalated_to_Authority', 
  'Court_Filed', 'Judgment_Issued', 'Resolved', 
  'Satisfaction_Confirmed', 'Closed'
];

function countSimilarCases(companyName) {
  if (!companyName) return 0;
  return cases.value.filter(c => c.company === companyName).length;
}

let searchTimeout;

function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchCases(1), 500);
}



function setStatusFilter(status) {
  statusFilter.value = status === 'All' ? '' : status;
  fetchCases(1);
}

async function fetchCases(page = 1) {
  const currentFilters = { 
    page, 
    search: search.value, 
    status: statusFilter.value, 
    category: categoryFilter.value 
  };

  try {
    const { initial, initialPagination, syncPromise } = await fetchCasesWithFilters(currentFilters);
    
    // 1. Initial State: Load from cache immediately
    // If we have items in cache, show them and set a 'silent' loading state
    if (initial.length > 0) {
      cases.value = initial;
      pagination.value = initialPagination;
      loading.value = false; // Don't show full-page loader if we have cache
    } else {
      loading.value = true; // Show loader if cache is empty
    }

    // 2. Background Sync: Lock the transition until data is ready
    syncPromise.then(({ cases: syncedCases, pagination: remotePagination }) => {
      // Transition Locking: Smoothly update the reactive data
      // If the modal was open, it will now reflect the latest server-state automatically
      cases.value = syncedCases;
      pagination.value = remotePagination;

      if (selectedCase.value) {
        const updated = syncedCases.find(c => c.id === selectedCase.value.id);
        if (updated) selectedCase.value = updated;
      }
    }).catch(error => {
      console.error('[FETCH_RECORDS_SYNC_ERROR]', error);
    }).finally(() => {
      loading.value = false;
    });
  } catch (error) {
    console.error('[FETCH_RECORDS_ERROR]', error);
    loading.value = false;
  }
}

async function handleSelect(caseData) {
  // Phase 14: Substrate-level detail fetch to resolve memory pruning gaps
  try {
    loading.value = true;
    const fullRecord = await getCaseById(caseData.id);
    selectedCase.value = fullRecord;
    isModalOpen.value = true;
  } catch (error) {
    console.error('[DETAIL_FETCH_ERROR]', error);
    // Fallback to basic data if full fetch fails
    selectedCase.value = caseData;
    isModalOpen.value = true;
  } finally {
    loading.value = false;
  }
}

function closeModal() {
  isModalOpen.value = false;
  setTimeout(() => { selectedCase.value = null; }, 500); // Preserve exit transition
}

async function refreshRecord() {
    await fetchCases(pagination.value.page);
}

function changePage(page) {
  fetchCases(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleStatusChange({ id, status }) {
  try {
    await changeCaseStatus(id, status);
    await fetchCases(pagination.value.page);
  } catch (error) {
    console.error('[STATUS_UPDATE_ERROR]', error);
  }
}

onMounted(() => {
  fetchCases();
});

onUnmounted(() => {
  clearTimeout(searchTimeout);
});
</script>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.list-leave-active {
  position: absolute;
}
</style>
