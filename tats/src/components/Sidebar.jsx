import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, BarChart2, Menu, Settings, UserRound, X, LogOut, ListTodo, CalendarDays } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import ppdoLogo from "../assets/ppdo-logo.png";

export default function Sidebar() {
    const { pathname } = useLocation();
    const { user, logout } = useAuth();
    const [userName, setUserName] = useState("");
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        api.get("/profile")
            .then(({ data }) => {
                if (mounted && data?.firstName) setUserName(`${data.firstName} ${data.lastName || ""}`.trim());
            })
            .catch(() => {});
        return () => { mounted = false; };
    }, []);

    const isAdmin = user?.role === "ADMIN";
    const isDepartmentHead = user?.role === "DEPARTMENT_HEAD";
    const items = isAdmin
        ? [
            { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
            { name: "Monitoring / Submissions", href: "/admin-monitoring", icon: ListTodo },
            { name: "Performance & Summary", href: "/performance-summary", icon: BarChart2 },
            { name: "Physical Report Control", href: "/physical-report-control", icon: ListTodo },
            { name: "Calendar of Activities", href: "/calendar", icon: CalendarDays },
            { name: "Users", href: "/employees", icon: UserRound },
            { name: "Settings", href: "/settings", icon: Settings },
        ]
        : [
            { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
            { name: isDepartmentHead ? "For Approval / Submissions" : "Tasks & Submissions", href: isDepartmentHead ? "/approval" : "/submissions", icon: ListTodo },
            { name: "Physical Reports", href: "/physical-report", icon: ListTodo },
            { name: "Calendar of Activities", href: "/calendar", icon: CalendarDays },
            { name: "Settings", href: "/settings", icon: Settings },
        ];

    const logoutUser = () => {
        logout();
        window.location.assign("/login");
    };

    // A couple of nav entries are "hubs" for several related routes reached by drilling in
    // from that hub, so highlight the hub link while the user is on any of those sub-pages.
    const isActive = (href) => {
        if (pathname === href) return true;
        if (href === "/admin-monitoring") return pathname === "/documents";
        if (href === "/submissions") return ["/timeline"].includes(pathname);
        if (href === "/approval") return pathname === "/approval" || pathname === "/submissions";
        if (href === "/performance-summary") return ["/performance", "/office-performance", "/physical-report", "/monitoring-summary"].includes(pathname);
        if (href === "/physical-report-control") return pathname === "/physical-report-control";
        if (href === "/calendar") return pathname === "/calendar";
        return false;
    };

    const content = (
        <div className="flex h-full flex-col bg-[#0d1629] text-white">
            <div className="border-b border-white/10 px-5 py-6">
                <div className="flex items-center gap-3">
                    <img
                        src={ppdoLogo}
                        alt="Province of Palawan"
                        className="h-12 w-12 object-contain"
                    />
                    <div className="min-w-0">
                        <p className="font-semibold">PPDO Monitor</p>
                        <p className="truncate text-xs text-slate-400">Document & Performance System</p>
                    </div>
                </div>
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="truncate font-semibold">{userName || user?.email || "User"}</p>
                    <p className="text-xs text-slate-400">{isAdmin ? "Administrator" : isDepartmentHead ? "Department Head / Approval Body" : "Encoder / Office User"}</p>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-5">
                <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Navigation</p>
                {items.map((item) => {
                    const Icon = item.icon;
                    return <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${isActive(item.href) ? "bg-indigo-600/20 text-indigo-300" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
                        <Icon size={19} />
                        <span>{item.name}</span>
                    </Link>;
                })}
            </nav>

            <button onClick={logoutUser} className="m-3 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
                <LogOut size={19} />
                Logout
            </button>
        </div>
    );

    return <>
        <aside className="hidden h-screen w-72 shrink-0 lg:block">{content}</aside>
        <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-40 rounded-xl bg-[#0d1629] p-3 text-white shadow-lg lg:hidden"><Menu size={20} /></button>
        {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-72">{content}<button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-white"><X size={20} /></button></aside></div>}
    </>;
}
