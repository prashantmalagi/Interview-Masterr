import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true
});

// Request interceptor to attach the stored JWT Bearer token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to catch 401/403 errors and auto-logout
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Expired/invalid token or access forbidden: clear local session details and force redirect
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            const currentPath = window.location.pathname;
            if (currentPath !== "/login" && currentPath !== "/register") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);
