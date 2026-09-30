import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";

const httpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://seekids-api.serigneabdouazizndaw.workers.dev",
  withCredentials: true, // Needed for cookies (if refresh token is stored in httpOnly cookie)
});

// Attach token to requests
httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("accessToken");
  const academicYear = localStorage.getItem("academicYear") || "2025-2026";
  if (config.headers) {
    config.headers["X-School-Name"] = "dakar-leaders-school";
    config.headers["X-Academic-Year"] = academicYear;
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              if (originalRequest.headers) {
                originalRequest.headers["Authorization"] = `Bearer ${token}`;
              }
              resolve(httpClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<{ accessToken: string }>(
          `/auth/refresh`,
          {},
          { baseURL: httpClient.defaults.baseURL, withCredentials: true }
        );

        const newToken = response.data.accessToken;
        localStorage.setItem("accessToken", newToken);
        httpClient.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        }

        return httpClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("accessToken");
        window.location.href = "/";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;
