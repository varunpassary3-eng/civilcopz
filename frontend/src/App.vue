<template>
  <div class="min-h-screen bg-slate-50 dark:bg-gov-dark-950 text-slate-900 dark:text-slate-100 transition-colors duration-500">
    <!-- Floating Glassmorphism Header -->
    <header class="sticky top-4 z-50 px-4">
      <nav class="max-w-6xl mx-auto backdrop-blur-md bg-white/70 dark:bg-gov-dark-900/80 border border-white/20 dark:border-gov-dark-800/50 shadow-lg dark:shadow-indigo-500/10 rounded-2xl p-3 px-6 flex justify-between items-center">
        <router-link to="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div class="w-8 h-8 bg-gov-primary-600 rounded-lg flex items-center justify-center shadow-glow-indigo">
            <span class="text-white font-black text-xs">CP</span>
          </div>
          <h1 class="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gov-primary-600 to-indigo-400">CivilCOPZ</h1>
        </router-link>

        <div class="flex items-center gap-6">
          <div v-if="isLoggedIn" class="hidden md:flex items-center gap-6 text-sm font-bold tracking-tight uppercase">
            <router-link to="/dashboard" class="hover:text-gov-primary-600 transition-colors">Dashboard</router-link>
            <router-link to="/catalogue" class="hover:text-gov-primary-600 transition-colors">BrandHub</router-link>
            <router-link to="/policy" class="hover:text-gov-primary-600 transition-colors">Protocol</router-link>
            <router-link to="/cases" class="hover:text-gov-primary-600 transition-colors">Archives</router-link>
            <router-link to="/submit-case" class="hover:text-gov-primary-600 transition-colors">Submit</router-link>
          </div>
          
          <div class="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block"></div>

          <div class="flex items-center gap-3">
            <ThemeToggle />
            <div v-if="isLoggedIn">
              <button @click="logout" class="px-4 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-95">
                Logout
              </button>
            </div>
            <div v-else class="flex items-center gap-3">
              <router-link to="/login" class="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-gov-primary-600">Login</router-link>
              <router-link to="/register" class="px-4 py-1.5 bg-gov-primary-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-glow-indigo hover:bg-gov-primary-700 transition-all active:scale-95">
                Register
              </router-link>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Main Content Area with Transitions -->
    <main class="max-w-6xl mx-auto p-4 pt-12">
      <router-view v-slot="{ Component }">
        <transition 
          name="fade" 
          mode="out-in"
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-4"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Global Footer with Disclaimer -->
    <Footer />

    <!-- Decorative background elements -->
    <div class="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none opacity-20 dark:opacity-40">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/30 rounded-full blur-[100px]"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gov-primary-600/20 rounded-full blur-[100px]"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ThemeToggle from './components/ThemeToggle.vue';
import Footer from './components/Footer.vue';

const router = useRouter();
const isLoggedIn = ref(!!localStorage.getItem('token'));

function logout() {
  localStorage.removeItem('token');
  isLoggedIn.value = false;
  router.push('/login');
}

onMounted(() => {
  window.addEventListener('login', () => {
    isLoggedIn.value = true;
  });
});
</script>

<style>
.router-link-active {
  @apply text-gov-primary-600;
}
</style>

