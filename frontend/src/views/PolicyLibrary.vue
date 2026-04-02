<template>
  <div class="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
    <!-- Policy Header / Hero -->
    <header class="relative p-12 bg-indigo-900 rounded-[3rem] overflow-hidden shadow-2xl">
      <div class="absolute top-0 right-0 p-8 opacity-10">
        <span class="text-8xl font-black text-white italic">LAW</span>
      </div>
      
      <div class="relative z-10 space-y-4">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400">
          <span class="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">National Legal Repository</span>
        </div>
        
        <h2 class="text-5xl font-black tracking-tighter text-white leading-none">THE CONSUMER<br/><span class="text-gov-primary-400">PROTECTION PROTOCOL</span></h2>
        <p class="max-w-xl text-slate-300 text-sm font-medium leading-relaxed">
          Comprehensive legal intelligence framework based on the Consumer Protection Act, 2019. Browse sections, precedents, and regulatory baselines used by the CivilCOPZ AI.
        </p>

        <div class="flex gap-4 pt-4">
          <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Total Sections</p>
            <p class="text-2xl font-black text-white">107 Sections</p>
          </div>
          <div class="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Legal Precedents</p>
            <p class="text-2xl font-black text-white">12,500+ Cases</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Search / Filter -->
    <div class="max-w-xl mx-auto flex gap-4 p-2 bg-white/50 dark:bg-gov-dark-950/20 border border-slate-200 dark:border-gov-dark-800 rounded-3xl backdrop-blur-xl">
       <input 
        v-model="search"
        placeholder="Search sections or legal terms (e.g. 'Unfair Trade', 'Liability')..."
        class="flex-1 bg-transparent border-none p-4 px-6 text-sm font-medium outline-none"
       />
       <button class="px-8 bg-gov-primary-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gov-primary-700 transition-all active:scale-95">
         GO
       </button>
    </div>

    <!-- Legal Sections Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div v-for="section in filteredSections" :key="section.id" class="group p-8 bg-white dark:bg-gov-dark-900 border border-slate-200 dark:border-gov-dark-800 rounded-[2.5rem] shadow-xl hover:-translate-y-2 transition-all duration-300">
         <div class="flex justify-between items-start mb-6">
            <span class="text-xs font-black text-gov-primary-600 bg-gov-primary-600/5 px-3 py-1 rounded-full uppercase tracking-widest border border-gov-primary-600/10">Section {{ section.id }}</span>
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Precedent Count: {{ section.precedents }}</span>
         </div>
         <h3 class="text-xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-gov-primary-600 transition-colors">{{ section.title }}</h3>
         <p class="text-sm font-medium text-slate-500 leading-relaxed mb-8">{{ section.description }}</p>
         
         <div class="pt-6 border-t border-slate-100 dark:border-gov-dark-800 flex items-center justify-between">
            <button class="text-[10px] font-black uppercase tracking-widest text-gov-primary-600 hover:underline">Full Legal Text</button>
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-300">Updated Jan 2025</span>
         </div>
      </div>
    </div>

    <!-- Mandatory Legal Disclaimer Footer -->
    <div class="p-8 border-2 border-slate-200 dark:border-gov-dark-800 rounded-3xl bg-slate-50 dark:bg-gov-dark-950/40">
      <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Legal Disclaimer: Policy Hub Protocol</p>
      <p class="text-xs text-slate-600 dark:text-slate-500 leading-relaxed italic">
        "All information are backed and sourced from respective legal courts and public and are system generated formula driven and no human intervention and any updation and adjustment happens only on court orders."
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const search = ref('');

const sections = [
  { id: '2(1)(o)', title: 'Deficient Service', precedents: '4,200', description: 'Covers any fault, imperfection, shortcoming or inadequacy in the quality, nature and manner of performance which is required to be maintained.' },
  { id: '14', title: 'Relief Powers', precedents: '2,800', description: 'Deals with the powers of the District Commission to issue orders for removal of defects, replacement of goods, or return of price.' },
  { id: '2(47)', title: 'Unfair Trade Practices', precedents: '3,100', description: 'Covers false representations, misleading advertisements, and trickery to offer goods or services.' },
  { id: '82', title: 'Product Liability', precedents: '1,200', description: 'The responsibility of a product manufacturer or seller to compensate for any harm caused by a defective product.' },
  { id: '34', title: 'Jurisdiction Control', precedents: 'N/A', description: 'Determines which consumer forum has the authority based on the value of goods or services and compensation claimed.' },
  { id: '71', title: 'Mediation Process', precedents: '900', description: 'Framework for Alternate Dispute Resolution (ADR) through Consumer Mediation Cells.' },
];

const filteredSections = computed(() => {
  if (!search.value) return sections;
  const lowerSearch = search.value.toLowerCase();
  return sections.filter(s => 
    s.title.toLowerCase().includes(lowerSearch) || 
    s.id.toLowerCase().includes(lowerSearch) || 
    s.description.toLowerCase().includes(lowerSearch)
  );
});
</script>
