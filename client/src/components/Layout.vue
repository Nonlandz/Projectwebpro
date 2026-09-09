<template>
  <main class="app-shell flex flex-col">
    <div class="w-full flex flex-grow flex-col">
      <slot />
    </div>
    <Footer />
  </main>
</template>

<script>
import Footer from "./Footer.vue";
export default {
  components: {
    Footer,
  },
};
</script>
