<template>
  <div class="max-w-md mx-auto mt-20 p-8 pt-10 relative">
    <!-- Decorative background glow -->
    <div class="absolute inset-0 bg-gov-primary-600/10 blur-3xl rounded-full -z-10"></div>
    
    <div class="backdrop-blur-xl bg-white/80 dark:bg-gov-dark-900/90 border border-white/20 dark:border-gov-dark-800/50 p-8 rounded-3xl shadow-2xl">
      <div class="text-center mb-10">
        <div class="w-12 h-12 bg-gov-primary-600 rounded-2xl flex items-center justify-center shadow-glow-indigo mx-auto mb-6">
          <span class="text-white text-xl">📝</span>
        </div>
        <h2 class="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase mb-2">Directorate Portal</h2>
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Citizen & Consumer Identity Initialization</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-6">
        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Full Legal Name</label>
          <input 
            v-model="name" 
            type="text" 
            required 
            placeholder="John Doe"
            class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 p-3 px-4 rounded-2xl text-sm focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700" 
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Digital Address</label>
          <input 
            v-model="email" 
            type="email" 
            required 
            placeholder="citizen@civilcopz.gov"
            class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 p-3 px-4 rounded-2xl text-sm focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700" 
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Secure Key</label>
          <input 
            v-model="password" 
            type="password" 
            required 
            placeholder="••••••••"
            class="w-full bg-slate-50 dark:bg-gov-dark-950 border border-slate-200 dark:border-gov-dark-800 p-3 px-4 rounded-2xl text-sm focus:ring-2 focus:ring-gov-primary-600 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700" 
          />
        </div>
        
        <button 
          type="submit" 
          class="w-full bg-gov-primary-600 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow-indigo hover:bg-gov-primary-700 hover:-translate-y-0.5 transition-all active:scale-95"
        >
          Initialize Account
        </button>
      </form>

      <div class="mt-8 pt-6 border-t border-slate-100 dark:border-gov-dark-800 text-center">
        <p class="text-xs text-slate-500 font-bold uppercase tracking-tight">
          Already Personnel? 
          <router-link to="/login" class="text-gov-primary-600 hover:text-gov-primary-700 underline decoration-2 underline-offset-4">Authenticate Locally</router-link>
        </p>
      </div>

      <div v-if="error" class="mt-4 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/20 text-center">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../services/auth';

const router = useRouter();
const email = ref('');
const password = ref('');
const role = ref('consumer');
const error = ref('');

async function handleRegister() {
  try {
    await register({ email: email.value, password: password.value, role: role.value });
    router.push('/login');
  } catch (err) {
    error.value = 'Registration failed. Email might be taken.';
  }
}
</script>
