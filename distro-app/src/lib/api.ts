import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.100:3001/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Attach token from SecureStore before every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("distro_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Surface error messages cleanly
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ?? err.message ?? "Network error";
    return Promise.reject(new Error(message));
  }
);
