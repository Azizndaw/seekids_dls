import axios, { AxiosInstance } from "axios";

const cleanhttpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://api.seekids.net",
  withCredentials: true,
  headers: {
    "X-School-Name": "dakar-leaders-school",
  }
});

export default cleanhttpClient;
