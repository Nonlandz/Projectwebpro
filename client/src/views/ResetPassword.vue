<template>
  <Layout><form class="max-w-md mx-auto my-16 p-6 bg-white rounded shadow" @submit.prevent="reset">
    <h1 class="text-2xl mb-5">Reset password</h1>
    <label for="new-password">New password (at least 8 characters)</label>
    <input id="new-password" v-model="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required class="border p-2 w-full my-2" />
    <label for="confirm-password">Confirm password</label>
    <input id="confirm-password" v-model="confirmation" type="password" autocomplete="new-password" required class="border p-2 w-full my-2" />
    <p role="status" class="my-3">{{ message }}</p>
    <button :disabled="busy || complete" class="bg-blue-700 text-white p-2 rounded">{{ busy ? 'Updating…' : 'Update password' }}</button>
    <router-link to="/login" class="block mt-4 underline">Back to sign in</router-link>
  </form></Layout>
</template>
<script>
import api from '../api';
import Layout from '../components/Layout.vue';
export default {
  components: { Layout },
  data: () => ({ password: '', confirmation: '', message: '', busy: false, complete: false }),
  methods: { async reset() {
    if (this.password !== this.confirmation) { this.message = 'Passwords must match'; return; }
    this.busy = true;
    try {
      const { data } = await api.post('/user/resetpassword', { token: this.$route.query.token, password: this.password });
      this.message = data.message; this.complete = true; this.password = ''; this.confirmation = '';
      localStorage.removeItem('token'); localStorage.removeItem('user');
      this.$router.replace('/reset-password');
    } catch (error) { this.message = error.response?.data?.message || 'Unable to reset password. Please try again.'; }
    finally { this.busy = false; }
  } },
};
</script>
