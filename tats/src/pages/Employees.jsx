import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Edit3,
    Filter,
    Mail,
    MoreHorizontal,
    Printer,
    RefreshCw,
    Search,
    ShieldCheck,
    ShieldOff,
    UserCheck,
    UserPlus,
    Users as UsersIcon,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEPARTMENTS } from "../assets/assets";
import EmployeeForm from "../components/EmployeeForm";
import api from "../api/axios.js";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 10;

const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>'"]/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    })[char]);

const printUsers = (users) => {
    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) {
        toast.error("Please allow popups to print the user list.");
        return;
    }

    const rows = users.map((employee) => `<tr>
        <td>${escapeHtml(`${employee.firstName || ""} ${employee.lastName || ""}`.trim())}</td>
        <td>${escapeHtml(employee.email)}</td>
        <td>${escapeHtml(employee.department)}</td>
        <td>${escapeHtml(employee.position)}</td>
        <td>${escapeHtml(employee.user?.role || "EMPLOYEE")}</td>
        <td>${escapeHtml(employee.employmentStatus)}</td>
        <td>${escapeHtml(employee.user?.lastLoginAt ? new Date(employee.user.lastLoginAt).toLocaleString() : "—")}</td>
    </tr>`).join("");

    popup.document.write(`
        <html><head><title>PPDO User Directory</title><style>
            @page { size: legal landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 10px; color: #111827; }
            h1,h2 { text-align:center; } h1 { font-size:18px; margin-bottom:3px; } h2 { font-size:13px; font-weight:normal; margin-top:0; }
            table { width:100%; border-collapse:collapse; margin-top:18px; } th,td { border:1px solid #cbd5e1; padding:6px; } th { background:#f1f5f9; text-align:left; }
        </style></head><body>
            <h1>PROVINCIAL PLANNING AND DEVELOPMENT OFFICE</h1>
            <h2>PPDO User Directory</h2>
            <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
            <table><thead><tr><th>Name</th><th>Email</th><th>Office</th><th>Position</th><th>Role</th><th>Status</th><th>Last Login</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No users found.</td></tr>'}</tbody></table>
            <script>window.onload=()=>window.print();</script>
        </body></html>
    `);
    popup.document.close();
};

const Employees = () => {
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedDept, setSelectedDept] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [confirmUser, setConfirmUser] = useState(null);
    const [page, setPage] = useState(1);

    const fetchUsers = useCallback(async (silent = false) => {
        try {
            if (silent) setRefreshing(true);
            else setLoading(true);

            const params = new URLSearchParams();

            if (selectedDept) params.set("department", selectedDept);
            if (selectedRole) params.set("role", selectedRole);
            if (selectedStatus) params.set("status", selectedStatus);
            if (search.trim()) params.set("search", search.trim());

            const query = params.toString();
            const { data } = await api.get(
                query ? `/employees?${query}` : "/employees"
            );

            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(
                error.response?.data?.error ||
                    "Unable to load users."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search, selectedDept, selectedRole, selectedStatus]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, search ? 300 : 0);

        return () => clearTimeout(timer);
    }, [fetchUsers, search]);

    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter(
            (item) => item.employmentStatus === "ACTIVE"
        ).length;
        const inactive = users.filter(
            (item) => item.employmentStatus === "INACTIVE"
        ).length;
        const admins = users.filter(
            (item) => item.user?.role === "ADMIN"
        ).length;

        return { total, active, inactive, admins };
    }, [users]);

    const pageCount = Math.max(
        1,
        Math.ceil(users.length / PAGE_SIZE)
    );

    const paginatedUsers = users.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    const resetFilters = () => {
        setSearch("");
        setSelectedDept("");
        setSelectedRole("");
        setSelectedStatus("");
        setPage(1);
    };

    const handleDeactivate = async () => {
        if (!confirmUser) return;

        try {
            await api.delete(`/employees/${confirmUser.id}`);
            toast.success("User account deactivated.");
            setConfirmUser(null);
            await fetchUsers(true);
        } catch (error) {
            toast.error(
                error.response?.data?.error ||
                    "Unable to deactivate user."
            );
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <UsersIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="page-title">Users</h1>
                            <p className="page-subtitle">
                                Manage system accounts, roles, offices, and access status.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => printUsers(users)}
                        className="btn-secondary inline-flex items-center justify-center gap-2"
                    >
                        <Printer className="h-4 w-4" />
                        Print
                    </button>
                    <button
                        type="button"
                        onClick={() => fetchUsers(true)}
                        disabled={refreshing}
                        className="btn-secondary inline-flex items-center justify-center gap-2"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                        />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary inline-flex items-center justify-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" />
                        Add User
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="Total Users"
                    value={stats.total}
                    icon={UsersIcon}
                />
                <StatCard
                    label="Active"
                    value={stats.active}
                    icon={UserCheck}
                    tone="emerald"
                />
                <StatCard
                    label="Inactive"
                    value={stats.inactive}
                    icon={ShieldOff}
                    tone="rose"
                />
                <StatCard
                    label="Administrators"
                    value={stats.admins}
                    icon={ShieldCheck}
                    tone="violet"
                />
            </div>

            <section className="card overflow-hidden">
                <div className="border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search name, email, position..."
                                className="pl-10!"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setShowFilters((value) => !value)
                            }
                            className={`btn-secondary inline-flex items-center justify-center gap-2 ${
                                showFilters ? "bg-slate-100" : ""
                            }`}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {(selectedDept || selectedRole || selectedStatus) && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                                    {[selectedDept, selectedRole, selectedStatus].filter(Boolean).length}
                                </span>
                            )}
                        </button>
                    </div>

                    {showFilters && (
                        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-3">
                            <FilterSelect
                                label="Office / Department"
                                value={selectedDept}
                                onChange={(value) => {
                                    setSelectedDept(value);
                                    setPage(1);
                                }}
                                options={DEPARTMENTS}
                                placeholder="All offices"
                            />
                            <FilterSelect
                                label="System Role"
                                value={selectedRole}
                                onChange={(value) => {
                                    setSelectedRole(value);
                                    setPage(1);
                                }}
                                options={[
                                    "ADMIN",
                                    "EMPLOYEE",
                                    "DEPARTMENT_HEAD",
                                ]}
                                labels={[
                                    "Administrator",
                                    "Encoder / Office User",
                                    "Approval Body / Department Head",
                                ]}
                                placeholder="All roles"
                            />
                            <FilterSelect
                                label="Account Status"
                                value={selectedStatus}
                                onChange={(value) => {
                                    setSelectedStatus(value);
                                    setPage(1);
                                }}
                                options={[
                                    "ACTIVE",
                                    "INACTIVE",
                                ]}
                                labels={[
                                    "Active",
                                    "Inactive",
                                ]}
                                placeholder="All statuses"
                            />

                            {(selectedDept || selectedRole || selectedStatus) && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-left text-xs font-medium text-indigo-600 hover:text-indigo-700 md:col-span-3"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {loading ? (
                    <LoadingTable />
                ) : paginatedUsers.length === 0 ? (
                    <EmptyUsers onReset={resetFilters} />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                        <th className="px-5 py-3.5">User</th>
                                        <th className="px-5 py-3.5">Office</th>
                                        <th className="px-5 py-3.5">Position</th>
                                        <th className="px-5 py-3.5">Role</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5">Last Login</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedUsers.map((employee) => {
                                        const isSelf =
                                            employee.user?.id === currentUser?.id;

                                        return (
                                            <tr
                                                key={employee.id}
                                                className="group transition hover:bg-slate-50/70"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar employee={employee} />
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-slate-900">
                                                                {employee.firstName} {employee.lastName}
                                                                {isSelf && (
                                                                    <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                                                <Mail className="h-3 w-3" />
                                                                <span>{employee.user?.email || employee.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="max-w-[250px] px-5 py-4 text-sm text-slate-600">
                                                    <span className="line-clamp-2">
                                                        {employee.department || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-slate-600">
                                                    {employee.position || "—"}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <RoleBadge role={employee.user?.role} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusBadge status={employee.employmentStatus} />
                                                </td>
                                                <td className="px-5 py-4 text-xs text-slate-500">
                                                    {formatDate(employee.user?.lastLoginAt)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            title="Edit user"
                                                            onClick={() => setEditUser(employee)}
                                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>
                                                        {!isSelf && employee.employmentStatus === "ACTIVE" && (
                                                            <button
                                                                type="button"
                                                                title="Deactivate user"
                                                                onClick={() => setConfirmUser(employee)}
                                                                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                                            >
                                                                <ShieldOff className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {employee.employmentStatus === "INACTIVE" && (
                                                            <button
                                                                type="button"
                                                                title="Reactivate user"
                                                                onClick={() => setEditUser(employee)}
                                                                className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                                                            >
                                                                <UserCheck className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            title="Edit account"
                                                            onClick={() => setEditUser(employee)}
                                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                Showing {Math.min((page - 1) * PAGE_SIZE + 1, users.length)}–
                                {Math.min(page * PAGE_SIZE, users.length)} of {users.length} users
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                                    className="rounded-lg border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="min-w-16 text-center font-medium text-slate-700">
                                    Page {page} / {pageCount}
                                </span>
                                <button
                                    type="button"
                                    disabled={page >= pageCount}
                                    onClick={() =>
                                        setPage((value) =>
                                            Math.min(pageCount, value + 1)
                                        )
                                    }
                                    className="rounded-lg border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {showCreateModal && (
                <UserModal
                    title="Add New User"
                    subtitle="Create a PPDO system account for an office."
                    onClose={() => setShowCreateModal(false)}
                >
                    <EmployeeForm
                        onSuccess={async () => {
                            setShowCreateModal(false);
                            await fetchUsers(true);
                        }}
                        onCancel={() => setShowCreateModal(false)}
                    />
                </UserModal>
            )}

            {editUser && (
                <UserModal
                    title="Edit User"
                    subtitle="Update account access, office assignment, and account information."
                    onClose={() => setEditUser(null)}
                >
                    <EmployeeForm
                        initialData={editUser}
                        onSuccess={async () => {
                            setEditUser(null);
                            await fetchUsers(true);
                        }}
                        onCancel={() => setEditUser(null)}
                    />
                </UserModal>
            )}

            {confirmUser && (
                <ConfirmModal
                    employee={confirmUser}
                    onCancel={() => setConfirmUser(null)}
                    onConfirm={handleDeactivate}
                />
            )}
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, tone = "indigo" }) => {
    const tones = {
        indigo: "bg-indigo-50 text-indigo-600",
        emerald: "bg-emerald-50 text-emerald-600",
        rose: "bg-rose-50 text-rose-600",
        violet: "bg-violet-50 text-violet-600",
    };

    return (
        <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                        {value}
                    </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
};

const FilterSelect = ({
    label,
    value,
    onChange,
    options,
    labels,
    placeholder,
}) => (
    <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
            {label}
        </label>
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
        >
            <option value="">{placeholder}</option>
            {options.map((option, index) => (
                <option key={option} value={option}>
                    {labels?.[index] || option}
                </option>
            ))}
        </select>
    </div>
);

const Avatar = ({ employee }) => {
    const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase();

    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {initials || "U"}
        </div>
    );
};

const RoleBadge = ({ role }) => (
    <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            role === "ADMIN"
                ? "bg-violet-50 text-violet-700"
                : role === "DEPARTMENT_HEAD"
                ? "bg-blue-50 text-blue-700"
                : "bg-slate-100 text-slate-600"
        }`}
    >
        <ShieldCheck className="h-3 w-3" />
        {role === "ADMIN"
            ? "PPDO / Administrator"
            : role === "DEPARTMENT_HEAD"
            ? "Approval Body / Department Head"
            : "Encoder / Office User"}
    </span>
);

const StatusBadge = ({ status }) => (
    <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
        }`}
    >
        {status === "ACTIVE" ? (
            <CheckCircle2 className="h-3 w-3" />
        ) : (
            <ShieldOff className="h-3 w-3" />
        )}
        {status === "ACTIVE" ? "Active" : "Inactive"}
    </span>
);

const formatDate = (value) => {
    if (!value) return "Never";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Never";

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const UserModal = ({ title, subtitle, onClose, children }) => (
    <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
        onMouseDown={onClose}
    >
        <div
            className="relative my-6 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
        >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div className="max-h-[calc(100vh-100px)] overflow-y-auto p-6">
                {children}
            </div>
        </div>
    </div>
);

const ConfirmModal = ({ employee, onCancel, onConfirm }) => (
    <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        onMouseDown={onCancel}
    >
        <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
        >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
                Deactivate this user?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
                <strong className="font-semibold text-slate-700">
                    {employee.firstName} {employee.lastName}
                </strong>{" "}
                will no longer be able to sign in. Existing account and monitoring records will be preserved.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={onCancel} className="btn-secondary">
                    Cancel
                </button>
                <button type="button" onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
                    <ShieldOff className="h-4 w-4" />
                    Deactivate User
                </button>
            </div>
        </div>
    </div>
);

const LoadingTable = () => (
    <div className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
    </div>
);

const EmptyUsers = ({ onReset }) => (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <UsersIcon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-semibold text-slate-800">
            No users found
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
            Try changing the search or filters, or create a new user account.
        </p>
        <button type="button" onClick={onReset} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Clear filters
        </button>
    </div>
);

export default Employees;
