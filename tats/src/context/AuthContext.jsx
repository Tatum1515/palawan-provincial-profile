import {
    useContext,
    useEffect,
    useState,
} from "react";

import {
    createContext,
} from "react";

import api, { SESSION_EXPIRED_EVENT } from "../api/axios.js";

const AuthContext =
    createContext(null);

export function AuthProvider({
    children,
}) {
    const [
        user,
        setUser,
    ] = useState(null);

    const [
        token,
        setToken,
    ] = useState(() =>
        localStorage.getItem(
            "token"
        )
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const refreshSession =
        async () => {
            const storedToken =
                localStorage.getItem(
                    "token"
                );

            if (!storedToken) {
                setUser(null);
                setToken(null);
                setLoading(false);
                return;
            }

            try {
                const {
                    data,
                } =
                    await api.get(
                        "/auth/session"
                    );

                setUser(
                    data.user
                );
            } catch {
                localStorage.removeItem(
                    "token"
                );

                setUser(null);

                setToken(null);
            } finally {
                setLoading(false);
            }
        };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refreshSession();
    }, []);

    useEffect(() => {
        // Fired by the axios response interceptor whenever a request comes
        // back 401 with a token already present (expired/invalid JWT).
        // RoleRoute redirects to /login automatically once `user` is null.
        const handleSessionExpired = () => {
            setUser(null);
            setToken(null);
        };

        window.addEventListener(
            SESSION_EXPIRED_EVENT,
            handleSessionExpired
        );

        return () =>
            window.removeEventListener(
                SESSION_EXPIRED_EVENT,
                handleSessionExpired
            );
    }, []);

    const login = async (
        email,
        password,
        role_type
    ) => {
        const {
            data,
        } =
            await api.post(
                "/auth/login",
                {
                    email,
                    password,
                    role_type,
                }
            );

        localStorage.setItem(
            "token",
            data.token
        );

        setToken(
            data.token
        );

        setUser(
            data.user
        );

        return data.user;
    };

    const logout = async () => {
        localStorage.removeItem(
            "token"
        );

        setToken(null);

        setUser(null);
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        refreshSession,
    };

    return (
        <AuthContext.Provider
            value={
                value
            }
        >
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx =
        useContext(
            AuthContext
        );

    if (!ctx) {
        throw new Error(
            "useAuth must be used within AuthProvider"
        );
    }

    return ctx;
}