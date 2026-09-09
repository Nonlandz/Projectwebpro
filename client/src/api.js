import axios from "axios";
const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";
const api = axios.create({ baseURL: apiBaseUrl });

// Axios uses baseURL automatically, but native <img src> URLs do not. Keep
// stored API image paths working both locally (Vite proxy) and on Vercel.
export function assetUrl(url) {
  if (!url || /^(?:https?:|data:|blob:)/i.test(url) || !url.startsWith("/api/")) return url;
  if (!/^https?:\/\//i.test(apiBaseUrl)) return url;
  return `${apiBaseUrl.replace(/\/api\/?$/, "")}${url}`;
}
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    if (!location.hash.startsWith("#/login")) location.hash = "/login";
  }
  return Promise.reject(error);
});
export default api;
