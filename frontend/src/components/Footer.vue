<template>
  <footer class="mt-20 py-12 px-6 border-t border-slate-200 dark:border-gov-dark-800">
    <div class="max-w-6xl mx-auto space-y-8">
      <div class="flex flex-col md:flex-row justify-between items-start gap-8">
        <div class="space-y-4 max-w-sm">
          <div class="flex items-center gap-3">
            <div class="w-6 h-6 bg-gov-primary-600 rounded flex items-center justify-center font-black text-white text-[10px]">
              CP
            </div>
            <h4 class="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase">
              CivilCOPZ
            </h4>
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            National Consumer Awareness Repository v2.0
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-12">
          <div class="space-y-3">
            <h5 class="text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
              Platform
            </h5>
            <ul class="space-y-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <li>
                <router-link
                  to="/"
                  class="hover:text-gov-primary-600"
                >
                  Home
                </router-link>
              </li>
              <li>
                <router-link
                  to="/catalogue"
                  class="hover:text-gov-primary-600"
                >
                  BrandHub
                </router-link>
              </li>
              <li>
                <router-link
                  to="/policy"
                  class="hover:text-gov-primary-600"
                >
                  Protocol
                </router-link>
              </li>
              <li>
                <router-link
                  to="/cases"
                  class="hover:text-gov-primary-600"
                >
                  Archives
                </router-link>
              </li>
            </ul>
          </div>
          <div class="space-y-3">
            <h5 class="text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
              Legal
            </h5>
            <ul class="space-y-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <li>
                <a
                  href="#"
                  class="hover:text-gov-primary-600"
                >Privacy</a>
              </li>
              <li>
                <a
                  href="#"
                  class="hover:text-gov-primary-600"
                >Terms</a>
              </li>
              <li>
                <a
                  href="#"
                  class="hover:text-gov-primary-600"
                >Court Rules</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Mandatory Strict Legal Disclaimer -->
      <div class="pt-8 border-t border-slate-100 dark:border-gov-dark-800/50">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="p-6 bg-slate-100 dark:bg-gov-dark-950/40 rounded-2xl border border-slate-200 dark:border-gov-dark-800 flex-1">
            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Official System Classification Disclaimer
            </p>
            <p class="text-[10px] text-slate-600 dark:text-slate-500 font-medium leading-relaxed italic opacity-80">
              "All information are backed and sourced from respective legal courts and public and are system generated formula driven and no human intervention and any updation and adjustment happens only on court orders."
            </p>
          </div>
          <div class="text-right">
            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">
              © 2026 CivilCOPZ Core
            </p>
            <p class="text-[9px] font-black uppercase tracking-widest text-gov-primary-600">
              Digital Governance Initiative
            </p>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
</script>
