<template>
  <div class="relative pl-8 space-y-6">
    <!-- Vertical Line -->
    <div class="absolute left-[3px] top-1 bottom-1 w-[2px] bg-slate-100 dark:bg-gov-dark-800" />

    <div
      v-for="(item, index) in events"
      :key="index"
      class="relative group"
    >
      <!-- Marker dot -->
      <div 
        class="absolute left-[-33px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-gov-dark-900 ring-4 ring-slate-50 dark:ring-gov-dark-950 transition-all duration-300"
        :class="index === 0 ? 'bg-gov-primary-600 ring-gov-primary-600/10' : 'bg-slate-200 dark:bg-slate-700 ring-slate-100 dark:ring-gov-dark-800'"
      />

      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h4
            class="text-[11px] font-black uppercase tracking-wider transition-colors"
            :class="index === 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'"
          >
            {{ getActionLabel(item.eventType) }}
          </h4>
          <span
            v-if="index === 0"
            class="text-[8px] font-black uppercase px-2 py-0.5 bg-gov-primary-600 text-white rounded-md tracking-widest"
          >Latest Fact</span>
        </div>
        <div class="flex items-center gap-2">
          <p class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {{ formatDate(item.timestamp) }}
          </p>
          <span class="text-[8px] font-mono text-slate-300 px-1 border border-slate-100 rounded">
            {{ item.hash?.slice(0, 8) }}
          </span>
        </div>
        
        <div class="mt-2 text-[10px] font-medium text-slate-500 flex flex-col gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
          <p><span class="font-black text-slate-700 dark:text-slate-300">{{ item.actor }}</span> recorded on {{ item.source }} Substrate.</p>
          <p
            v-if="item.payload && item.payload.reason"
            class="text-slate-400 italic"
          >
            "{{ item.payload.reason }}"
          </p>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!events || events.length === 0"
      class="text-xs text-slate-400 italic py-4"
    >
      Initializing litigation ledger...
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  events: {
    type: Array,
    default: () => []
  }
});

function getActionLabel(type) {
  const labels = {
    'CASE_CREATED': 'Complaint Registered',
    'NOTICE_SENT': 'Legal Notice Served',
    'NOTICE_DELIVERED': 'Notice Delivered to Device',
    'NOTICE_READ': 'Notice Read by Company',
    'NOTICE_EXPIRED': 'Statutory Window Expired',
    'ESCALATED': 'Matured for Authority Filing',
    'PECUNIARY_RECTIFIED': 'Pecuniary Claim Verified',
    'FILING_PACKAGE_GENERATED': 'Court Bundle Compiled'
  };
  return labels[type] || type.replace(/_/g, ' ');
}

function formatDate(date) {
  if (!date) return 'Processing...';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
</script>
