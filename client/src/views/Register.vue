<template>
  <Layout>
    <div class="w-full h-full flex flex-grow items-center justify-center">
      <div class="w-96 border flex flex-col items-center gap-y-10 p-5 rounded-md shadow-md px-10 bg-white">
        <h1 class="text-3xl text-slate-600 font-bold my-10">Register</h1>
        <div class="w-full flex flex-col items-center gap-y-3">
          <div class="flex flex-col w-full">
            <label class="text-slate-600" for="username">Email</label>
            <input type="email" name="email" id="email" class="border rounded-md w-full py-1 px-1" v-model="data.email" />
          </div>
          <div class="flex flex-col w-full">
            <label class="text-slate-600" for="username">Password</label>
            <input type="password" name="password" id="password" class="border rounded-md w-full py-1 px-1" v-model="data.password" />
          </div>
          <div class="flex flex-col w-full">
            <label class="text-slate-600" for="username">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              class="border rounded-md w-full py-1 px-1"
              v-model="data.confirmPassword"
            />
          </div>
        </div>
        <button @click="register" class="bg-[#EB6648] text-white w-full rounded-md py-1.5">submit</button>
        <p class="text-sm xl:text-md text-gray-400 text-center mt-20">
          Have an account? <a @click="this.$router.push('/login')" class="text-black/70 cursor-pointer">Back to login ✨</a>
        </p>
      </div>
    </div>
  </Layout>
</template>

<script>
import Layout from "../components/Layout.vue";
import axios from "axios";
import useValidate from "@vuelidate/core";
import { required, email, minLength } from "@vuelidate/validators";
export default {
  components: {
    Layout,
  },
  data() {
    return {
      v$: useValidate(),
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
      try {
        const result = await this.v$.$validate();

        if (!result) {
          throw new Error("Invalid data");
        }
            //check password
        if (this.data.password !== this.data.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        await axios.post("http://localhost:8080/api/user/register", this.data);
        this.$router.push("/login");
        this.showAlert("success", "Successfully registered");
      } catch (error) {
        if (error?.response?.data?.message) {
          this.showAlert("error", error?.response?.data?.message);
        } else {
          this.showAlert("error", error);
        }
      }
    },
  },
};
</script>
