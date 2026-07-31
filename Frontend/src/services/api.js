import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Expired/invalid token or access forbidden: clear local session details and force redirect
            localStorage.removeItem("user");
            const currentPath = window.location.pathname;
            if (currentPath !== "/login" && currentPath !== "/register") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);
