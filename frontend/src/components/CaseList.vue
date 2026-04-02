<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <!-- List Header & Controls -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <h2 class="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Grievance Archives</h2>
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Official Case Records & Resolution Tracking</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="relative group">
          <input 
            v-model="search" 
            @input="debouncedSearch" 
            placeholder="Search records..." 
            class="bg-white/50 dark:bg-gov-dark-900/50 border border-slate-200 dark:border-gov-dark-800 p-2.5 px-4 rounded-xl text-xs focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all w-48 md:w-64"
          />
          <span class="absolute right-3 top-2.5 opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
        </div>
        
        <div class="flex items-center gap-2 p-1 bg-slate-100 dark:bg-gov-dark-900 rounded-xl border border-slate-200 dark:border-gov-dark-800">
          <button 
            v-for="status in ['All', 'Pending', 'Review', 'Resolved']" 
            :key="status"
            @click="setStatusFilter(status)"
            class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            :class="(statusFilter === status || (status === 'All' && !statusFilter)) ? 'bg-white dark:bg-gov-dark-800 text-gov-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'"
          >
            {{ status }}
          </button>
        </div>
      </div>
    </div>

    <!-- Category Filters -->
    <div class="flex flex-wrap gap-2">
      <button 
        @click="setCategoryFilter('')"
        :class="!categoryFilter ? 'bg-gov-primary-600 text-white shadow-glow-indigo' : 'bg-slate-100 dark:bg-gov-dark-900 text-slate-500 dark:text-slate-400'"
        class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
      >
        All Departments
      </button>
      <button 
        v-for="cat in ['Telecom', 'Banking', 'Insurance', 'E-commerce']"
        :key="cat"
        @click="setCategoryFilter(cat)"
        :class="categoryFilter === cat ? 'bg-gov-primary-600 text-white shadow-glow-indigo' : 'bg-slate-100 dark:bg-gov-dark-900 text-slate-500 dark:text-slate-400'"
        class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Results Area -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-4">
      <div class="w-12 h-12 border-4 border-gov-primary-600 border-t-transparent rounded-full animate-spin shadow-glow-indigo"></div>
      <span class="text-[10px] font-black uppercase text-slate-400 animate-pulse tracking-widest">Accessing Secure Database...</span>
    </div>

    <div v-else class="space-y-4">
      <div v-if="cases.length === 0" class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-gov-dark-800 rounded-[2.5rem] bg-slate-50/50 dark:bg-gov-dark-950/20">
        <span class="text-4xl mb-4 grayscale opacity-50">📂</span>
        <h3 class="font-black uppercase tracking-tighter text-slate-400 dark:text-slate-600">No Records Found in Current Filter</h3>
      </div>
      
      <transition-group name="list" tag="div" class="grid grid-cols-1 gap-4">
        <CaseCard 
          v-for="caseItem in cases" 
          :key="caseItem.id" 
          :case-data="caseItem" 
          :isAdmin="isAdmin"
          :companyCount="countSimilarCases(caseItem.company)"
          @status-changed="handleStatusChange"
          @select="openModal"
        />
      </transition-group>
      
      <!-- High Impact Details Modal -->
      <CaseModal 
        :isOpen="isModalOpen" 
        :caseData="selectedCase" 
        :companyCount="countSimilarCases(selectedCase?.company)"
        @close="closeModal" 
      />
      
      <!-- Pagination -->
      <div v-if="pagination.pages > 1" class="pt-8 flex items-center justify-center gap-4">
        <button 
          @click="changePage(pagination.page - 1)" 
          :disabled="pagination.page <= 1"
          class="p-2 px-4 bg-white dark:bg-gov-dark-900 border border-slate-200 dark:border-gov-dark-800 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-gov-dark-800 transition-all active:scale-95 shadow-sm"
        >
          Previous
        </button>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-black text-gov-primary-600">{{ pagination.page }}</span>
          <span class="text-[10px] font-black text-slate-300">/</span>
          <span class="text-[10px] font-black text-slate-400">{{ pagination.pages }}</span>
        </div>
        <button 
          @click="changePage(pagination.page + 1)" 
          :disabled="pagination.page >= pagination.pages"
          class="p-2 px-4 bg-white dark:bg-gov-dark-900 border border-slate-200 dark:border-gov-dark-800 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-gov-dark-800 transition-all active:scale-95 shadow-sm"
        >
          Next Page
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import CaseCard from './CaseCard.vue';
import CaseModal from './CaseModal.vue';
import { fetchCasesWithFilters } from '../services/caseService';
import { getCurrentUser } from '../services/auth';
import { changeCaseStatus } from '../services/caseService';

const cases = ref([]);
const pagination = ref({ page: 1, pages: 1, total: 0, limit: 10 });
const search = ref('');
const categoryFilter = ref('');
const statusFilter = ref('');
const loading = ref(false);

const isAdmin = computed(() => {
  const user = getCurrentUser();
  return user && user.role === 'admin';
});

const isModalOpen = ref(false);
const selectedCase = ref(null);

function countSimilarCases(companyName) {
  if (!companyName) return 0;
  return cases.value.filter(c => c.company === companyName).length;
}

function openModal(caseData) {
  selectedCase.value = caseData;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  selectedCase.value = null;
}

let searchTimeout;

function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchCases(1), 500);
}

function setCategoryFilter(cat) {
  categoryFilter.value = cat;
  fetchCases(1);
}

function setStatusFilter(status) {
  statusFilter.value = status === 'All' ? '' : status;
  fetchCases(1);
}

async function fetchCases(page = 1) {
  loading.value = true;
  try {
    const params = { page };
    if (search.value) params.search = search.value;
    if (categoryFilter.value) params.category = categoryFilter.value;
    if (statusFilter.value) params.status = statusFilter.value;

    const { initial, syncPromise } = await fetchCasesWithFilters(params);
    cases.value = initial; // Instant render from cache
    
    // Background update
    syncPromise.then(syncedCases => {
      cases.value = syncedCases;
    });
  } catch (error) {
    console.error('[FETCH_RECORDS_ERROR]', error);
  } finally {
    loading.value = false;
  }
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
