import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loading from "./Loading.jsx";

const normalizeRole = (role) => String(role || "").trim().toUpperCase();

const homeFor = (user) => {
    if (!user) return "/login";
    if (normalizeRole(user.role) === "ADMIN") return "/dashboard";
    return "/submissions";
};

export function RoleRoute({ allowedRoles = [] }) {
    const { user, loading } = useAuth();

    if (loading) return <Loading />;
    if (!user) return <Navigate to="/login" replace />;

    const currentRole = normalizeRole(user.role);
    const allowed = allowedRoles.map(normalizeRole);

    if (allowed.length > 0 && !allowed.includes(currentRole)) {
        return <Navigate to={homeFor(user)} replace />;
    }

    return <Outlet />;
}

export function MainAdminRoute() {
    const { user, loading } = useAuth();
    if (loading) return <Loading />;
    if (!user) return <Navigate to="/login" replace />;
    if (normalizeRole(user.role) !== "ADMIN" || user.isMainAdmin !== true) return <Navigate to="/unauthorized" replace />;
    return <Outlet />;
}

export function RoleHome() {
    const { user, loading } = useAuth();
    if (loading) return <Loading />;
    return <Navigate to={homeFor(user)} replace />;
}

export default RoleRoute;
