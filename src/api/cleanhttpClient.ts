import axios, { AxiosInstance } from "axios";

const cleanhttpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://seekids-api.serigneabdouazizndaw.workers.dev",
  withCredentials: true,
  headers: {
    "X-School-Name": "dakar-leaders-school",
  }
});
cleanhttpClient.interceptors.request.use((config) => {
  config.headers["X-Academic-Year"] = localStorage.getItem("academicYear") || "2025-2026";
  return config;
});

export default cleanhttpClient;
