import axios from "axios";
import toast from "react-hot-toast";

const baseUrl = String(import.meta.env.VITE_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

const api = axios.create({
    baseURL: `${baseUrl}/api`,
    timeout: 30000,
});

//attach auth token to all network requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config;
})

// ======================================================
// SESSION EXPIRY / INVALID TOKEN HANDLING
// ======================================================
//
// A single custom event is dispatched so AuthContext (which
// owns user/token state) can react without axios needing to
// import React or the router. RoleRoute already redirects to
// /login whenever `user` becomes null, so clearing state here
// is enough to send the user back to the login screen.
//
// The login request itself is exempt: a 401 from /auth/login
// means "wrong password", not "your session expired", and
// should be handled by the login form as a normal error.

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

let sessionExpiredNoticeShown = false;

const isLoginRequest = (config) =>
    Boolean(config?.url && config.url.replace(/^\//, "").startsWith("auth/login"));

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const hadToken = Boolean(localStorage.getItem("token"));

        if (status === 401 && hadToken && !isLoginRequest(error.config)) {
            localStorage.removeItem("token");

            if (!sessionExpiredNoticeShown) {
                sessionExpiredNoticeShown = true;
                toast.error("Your session has expired. Please log in again.");
                // Allow future expirations (e.g. after the user logs back in)
                // to show the notice again.
                setTimeout(() => {
                    sessionExpiredNoticeShown = false;
                }, 3000);
            }

            window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        }

        return Promise.reject(error);
    }
);

export default api