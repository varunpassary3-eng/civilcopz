<template>
  <button 
    @click="toggleTheme" 
    class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gov-dark-800 dark:hover:bg-gov-dark-900 transition-all duration-300 shadow-sm hover:shadow-indigo-500/20 active:scale-95 group focus:outline-none"
    title="Toggle Theme"
  >
    <div v-if="isDark" class="flex items-center gap-2">
      <span class="text-orange-400 group-hover:rotate-12 transition-transform">☀️</span>
      <span class="text-[10px] uppercase font-bold text-slate-400">Light Mode</span>
    </div>
    <div v-else class="flex items-center gap-2">
      <span class="text-indigo-600 group-hover:-rotate-12 transition-transform">🌙</span>
      <span class="text-[10px] uppercase font-bold text-indigo-600/70">Dark Mode</span>
    </div>
  </button>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const isDark = ref(false);

function toggleTheme() {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
    isDark.value = true;
    document.documentElement.classList.add('dark');
  }
});
</script>
