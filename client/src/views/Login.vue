<template>
  <Layout>
    <div class="login-experience">
      <header class="login-nav">
        <router-link to="/" class="login-wordmark" aria-label="ExchangeKUB home">Exchange<span>KUB</span></router-link>
        <router-link to="/register" class="login-nav-link">Join the community <span aria-hidden="true">↗</span></router-link>
      </header>
      <div class="login-content">
        <section class="trade-story" aria-labelledby="trade-heading">
          <div class="trade-copy">
            <p class="trade-eyebrow">LESS UNUSED. MORE POSSIBILITIES.</p>
            <h1 id="trade-heading">A new chapter.<br />For your things.</h1>
            <p class="trade-description">Trade what you have.<br class="mobile-break" /> Find what you love.</p>
          </div>
          <img class="trade-image" src="/images/trade-hero.png" alt="People exchanging books and a plant above a collection of clothing, sneakers, a lamp, and a camera" fetchpriority="high" width="1536" height="1024" />
          <p class="trade-caption">From your everyday essentials to someone’s next favourite.</p>
        </section>
        <section class="login-panel" aria-labelledby="signin-heading">
          <div class="login-form-content">
            <div class="login-symbol" aria-hidden="true">⇄</div>
            <h2 id="signin-heading">Welcome back.</h2>
            <p class="login-intro">Your next great exchange starts here.</p>
            <form @submit.prevent="login" class="signin-form">
              <div class="login-field">
                <label for="email">Email address</label>
                <input type="email" name="email" id="email" autocomplete="email" placeholder="you@example.com" required v-model="data.email" />
              </div>
              <div class="login-field">
                <label for="password">Password</label>
                <input type="password" name="password" id="password" autocomplete="current-password" placeholder="Enter your password" required v-model="data.password" />
              </div>
              <button type="button" @click="forgotPassword" class="login-forgot">Forgot password?</button>
              <button type="submit" class="login-submit" :disabled="isSigningIn">{{ isSigningIn ? 'Signing in…' : 'Sign in' }}<span v-if="!isSigningIn" aria-hidden="true">→</span></button>
            </form>
            <div class="login-register"><p>New to ExchangeKUB?</p><router-link to="/register">Create your account <span aria-hidden="true">↗</span></router-link></div>
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
      isSigningIn: false,
      data: {
        email: "",
        password: "",
      },
    };
  },
  validations() {
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
      },
    };
  },
  mounted() {
    this.checkAuth();
  },
  methods: {
    checkAuth() {
      if (localStorage.getItem("token")) {
        this.$router.push("/");
      }
    },
    async showAlert(type, text) {
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

    async forgotPassword() {
      const { value: email } = await this.$swal.fire({
        title: "Reset your password",
        html: '<p class="exchange-reset-copy">Enter your email and we’ll send a link to reset your password.</p>',
        input: "email",
        inputLabel: "Email address",
        inputPlaceholder: "you@example.com",
        inputAttributes: { autocomplete: "email", "aria-label": "Email address" },
        showCancelButton: true,
        confirmButtonText: "Send reset link <span aria-hidden=\"true\">→</span>",
        cancelButtonText: "Cancel",
        buttonsStyling: false,
        focusConfirm: false,
        customClass: {
          popup: "exchange-reset-modal",
          title: "exchange-reset-title",
          input: "exchange-reset-input",
          actions: "exchange-reset-actions",
          confirmButton: "exchange-reset-confirm",
          cancelButton: "exchange-reset-cancel",
        },
      });
      if (!email) return;
      try { const { data } = await axios.post("/user/forgotpassword", { email }); this.showAlert("success", data.message); }
      catch (error) { this.showAlert("error", error.response?.data?.message || "Unable to request a reset link"); }
    },

async login() {
  if (this.isSigningIn) return;
  this.isSigningIn = true;
  try {
    const result = await this.v$.$validate();

    if (!result) {
      throw new Error("Invalid data");
    }

    const res = await axios.post("/user/login", this.data);

    localStorage.setItem("user", JSON.stringify(res.data.user));
    localStorage.setItem("token", res.data.accessToken);

    // Check if user information is complete
    if (!res.data.user.UserInfo?.username) {
      // Redirect to userinfo page if user information is not complete
      this.$router.push("/userinfo");
      this.showAlert("info", "Please complete your user information.");
    } else {
      if (res.data.user.role === "admin") {
        // Redirect to admin page for admin users
        this.$router.push("/admin");
      } else {
        // Redirect to home page for non-admin users
        this.$router.push("/");
      }
      this.showAlert("success", "Successfully Login");
    }
  } catch (error) {
    if (error?.response?.data?.message) {
      this.showAlert("error", error.response.data.message);
    } else {
      this.showAlert("error", error.message);
    }
  } finally {
    this.isSigningIn = false;
  }
},


    register() {
      this.$router.push("/register");
    },
  },
};
</script>

<style scoped src="../styles/auth.css"></style>
