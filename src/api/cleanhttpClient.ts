import axios, { AxiosInstance } from "axios";

const cleanhttpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://seekids-api.serigneabdouazizndaw.workers.dev",
  withCredentials: true,
  headers: {
    "X-School-Name": "dakar-leaders-school",
  }
});
cleanhttpClient.interceptors.request.use((config) => {
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.includes('admin');
  let academicYear = localStorage.getItem("academicYear") || "2026-2027";
  if (!isAdmin) {
    academicYear = "2026-2027";
  }
  config.headers["X-Academic-Year"] = academicYear;
  return config;
});

export default cleanhttpClient;
