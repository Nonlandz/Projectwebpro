<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
const dark = ref(document.documentElement.dataset.theme === 'dark');
const sync = () => { dark.value = document.documentElement.dataset.theme === 'dark'; };
function toggle() {
  const theme = dark.value ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch { /* Keep the session preference. */ }
  window.dispatchEvent(new Event('themechange'));
}
onMounted(() => window.addEventListener('themechange', sync));
onUnmounted(() => window.removeEventListener('themechange', sync));
</script>

<template>
  <button type="button" class="theme-toggle" :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'" :title="dark ? 'Switch to light mode' : 'Switch to dark mode'" :aria-pressed="dark" @click="toggle">
    <span class="material-icons-outlined" aria-hidden="true">{{ dark ? 'light_mode' : 'dark_mode' }}</span>
  </button>
</template>
