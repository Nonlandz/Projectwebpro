<template>
  <p class="mt-2 text-xs text-slate-500">
    <template v-if="value">Approved · <time :datetime="value">{{ formatted }}</time></template>
    <template v-else>Approval time unavailable</template>
  </p>
</template>

<script>
export default {
  props: { value: { type: String, default: null } },
  computed: {
    formatted() {
      return new Date(this.value).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      });
    },
  },
};
</script>
