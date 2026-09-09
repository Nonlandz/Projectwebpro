import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import VueSweetalert2 from "vue-sweetalert2";

import "sweetalert2/dist/sweetalert2.min.css";
import "./style.css";
import "./styles/theme.css";
import ThemeToggle from "./components/ThemeToggle.vue";

const app = createApp(App);
app.component('ThemeToggle', ThemeToggle);

app.use(router);
app.use(VueSweetalert2);
app.mount("#app");
