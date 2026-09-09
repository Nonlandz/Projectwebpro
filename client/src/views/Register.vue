<template>
  <Layout>
    <div class="login-experience">
      <header class="login-nav">
        <router-link to="/" class="login-wordmark" aria-label="ExchangeKUB home">Exchange<span>KUB</span></router-link>
        <router-link to="/login" class="login-nav-link">Already a member? Sign in <span aria-hidden="true">↗</span></router-link>
      </header>
      <div class="login-content">
        <section class="trade-story" aria-labelledby="trade-heading">
          <div class="trade-copy">
            <p class="trade-eyebrow">YOUR THINGS. NEW POSSIBILITIES.</p>
            <h1 id="trade-heading">Something to give.<br />Something to find.</h1>
            <p class="trade-description">Make room for your next favourite.</p>
          </div>
          <img class="trade-image" src="/images/register-trade-hero.png" alt="Two people exchanging a jacket and a crate of everyday items" fetchpriority="high" width="1536" height="1024" />
          <p class="trade-caption">Books, clothes, home essentials. Every item has another story.</p>
        </section>
        <section class="login-panel" aria-labelledby="register-heading">
          <div class="login-form-content">
            <div class="login-symbol" aria-hidden="true">⇄</div>
            <h2 id="register-heading">Join the exchange.</h2>
            <p class="login-intro">Create your account. Discover what’s next.</p>
            <form @submit.prevent="register" class="signin-form" :aria-busy="isRegistering">
              <div class="login-field">
                <label for="email">Email address</label>
                <input type="email" name="email" id="email" autocomplete="email" placeholder="you@example.com" required v-model="data.email" />
              </div>
              <div class="login-field">
                <label for="password">Password</label>
                <input type="password" name="password" id="password" autocomplete="new-password" placeholder="Create a password" minlength="6" required aria-describedby="password-hint" v-model="data.password" />
                <small id="password-hint" class="password-hint">Use at least 6 characters.</small>
              </div>
              <div class="login-field">
                <label for="confirmPassword">Confirm password</label>
                <input type="password" name="confirmPassword" id="confirmPassword" autocomplete="new-password" placeholder="Enter your password again" minlength="6" required v-model="data.confirmPassword" />
              </div>
              <button type="submit" class="login-submit" :disabled="isRegistering">{{ isRegistering ? 'Creating account…' : 'Create account' }}<span v-if="!isRegistering" aria-hidden="true">→</span></button>
            </form>
            <div class="login-register"><p>Already part of the community?</p><router-link to="/login">Sign in to your account <span aria-hidden="true">↗</span></router-link></div>
            <p class="login-note">Good things deserve another story.</p>
          </div>
        </section>
      </div>
    </div>
  </Layout>
</template>

<script>
import Layout from "../components/Layout.vue";
import axios from "../api";
import useValidate from "@vuelidate/core";
import { required, email, minLength } from "@vuelidate/validators";
export default {
  components: {
    Layout,
  },
  data() {
    return {
      v$: useValidate(),
      isRegistering: false,
      data: {
        email: "",
        password: "",
        confirmPassword: "",
      },
    };
  },
  validations() { //validate
    return {
      data: {
        email: {
          required,
          email,
        },
        password: {
          required,
          minLength: minLength(6),
        },
        confirmPassword: {
          required,
          minLength: minLength(6), //ขั้นต่ำ6 ตัว
        },
      },
    };
  },
  methods: {
    async showAlert(type, text) { //show alert
      const Toast = await this.$swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener("mouseenter", this.$swal.stopTimer);
          toast.addEventListener("mouseleave", this.$swal.resumeTimer);
        },
      });

      Toast.fire({
        icon: type,
        title: text,
      });
    },
    async register() { //รีจีสเตอร์
      if (this.isRegistering) return;
      this.isRegistering = true;
      try {
        const result = await this.v$.$validate();

        if (!result) {
          throw new Error("Invalid data");
        }
            //check password
        if (this.data.password !== this.data.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        await axios.post("/user/register", this.data);
        this.$router.push("/login");
        this.showAlert("success", "Successfully registered");
      } catch (error) {
        if (error?.response?.data?.message) {
          this.showAlert("error", error?.response?.data?.message);
        } else {
          this.showAlert("error", error.message);
        }
      } finally {
        this.isRegistering = false;
      }
    },
  },
};
</script>

<style scoped src="../styles/auth.css"></style>
<style scoped>
.password-hint { color:#6e6e73; font-size:11px; font-weight:400; }
</style>
