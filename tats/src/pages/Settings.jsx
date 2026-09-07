import {
    KeyRound,
    Clock3,
    Mail,
    Phone,
    RefreshCw,
    Save,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ChangePasswordModal } from "../components/ChangePasswordModal";
import api from "../api/axios.js";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const Settings = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPasswordModal, setShowPasswordModal] =
        useState(false);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
    });

    const loadProfile = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(
                "/profile"
            );
            setProfile(data);
            setForm({
                firstName: data.firstName || "",
                lastName: data.lastName || "",
                phone: data.phone || "",
            });
        } catch (error) {
            toast.error(
                error.response?.data?.error ||
                    "Unable to load account settings."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Intentional API synchronization: the effect loads external data into local state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProfile();
    }, []);

    const handleSaveProfile = async (event) => {
        event.preventDefault();

        if (!form.firstName.trim() || !form.lastName.trim()) {
            toast.error(
                "First name and last name are required."
            );
            return;
        }

        try {
            setSaving(true);
            const { data } = await api.put(
                "/profile",
                {
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    phone: form.phone.trim(),
                }
            );

            setProfile((current) => ({
                ...current,
                firstName: data.profile.firstName,
                lastName: data.profile.lastName,
                phone: data.profile.phone,
            }));

            toast.success(
                "Profile updated successfully."
            );
        } catch (error) {
            toast.error(
                error.response?.data?.error ||
                    "Unable to update profile."
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-fade-in space-y-5">
                <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-100" />
                <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                    <div className="card h-80 animate-pulse bg-slate-50" />
                    <div className="card h-80 animate-pulse bg-slate-50" />
                </div>
            </div>
        );
    }

    const fullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">
                    Manage your account information and security settings.
                </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <section className="card overflow-hidden">
                    <div className="border-b border-slate-100 p-5 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <UserRound className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900">
                                    Personal Information
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Update the information displayed for your account.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form
                        onSubmit={handleSaveProfile}
                        className="space-y-5 p-5 sm:p-6"
                    >
                        <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
                                {`${form.firstName?.[0] || ""}${form.lastName?.[0] || ""}`.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                    {fullName || "Your Name"}
                                </p>
                                <p className="truncate text-sm text-slate-500">
                                    {profile?.position ||
                                        "System User"}
                                </p>
                            </div>
                            <div className="ml-auto hidden sm:block">
                                <StatusBadge
                                    active={profile?.isActive}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field
                                label="First Name"
                                value={form.firstName}
                                onChange={(value) =>
                                    setForm((current) => ({
                                        ...current,
                                        firstName: value,
                                    }))
                                }
                            />
                            <Field
                                label="Last Name"
                                value={form.lastName}
                                onChange={(value) =>
                                    setForm((current) => ({
                                        ...current,
                                        lastName: value,
                                    }))
                                }
                            />
                            <div className="sm:col-span-2">
                                <Field
                                    label="Phone Number"
                                    value={form.phone}
                                    onChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            phone: value,
                                        }))
                                    }
                                    icon={Phone}
                                    placeholder="09XXXXXXXXX"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <ReadOnlyField
                                label="Email"
                                value={profile?.email}
                                icon={Mail}
                            />
                            <ReadOnlyField
                                label="System Role"
                                value={
                                    profile?.role ===
                                    "ADMIN"
                                        ? "Administrator"
                                        : "User"
                                }
                                icon={ShieldCheck}
                            />
                            <ReadOnlyField
                                label="Office / Department"
                                value={
                                    profile?.department
                                }
                            />
                            <ReadOnlyField
                                label="Position"
                                value={
                                    profile?.position
                                }
                            />
                        </div>

                        <div className="flex justify-end border-t border-slate-100 pt-5">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary inline-flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </section>

                <div className="space-y-5">
                    <section className="card p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <KeyRound className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="font-semibold text-slate-900">Password</h2>
                                <p className="text-xs text-slate-500">Change your account password.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPasswordModal(true)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                            >
                                Change
                            </button>
                        </div>
                    </section>

                    <section className="card p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <Clock3 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-900">
                                    Account Activity
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Basic session information.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <InfoRow
                                label="Last Login"
                                value={formatDateTime(
                                    profile?.lastLoginAt
                                )}
                            />
                            <InfoRow
                                label="Account Created"
                                value={formatDateTime(
                                    profile?.createdAt
                                )}
                            />
                            <InfoRow
                                label="Account Status"
                                value={
                                    profile?.isActive
                                        ? "Active"
                                        : "Inactive"
                                }
                                valueClass={
                                    profile?.isActive
                                        ? "text-emerald-600"
                                        : "text-rose-600"
                                }
                            />
                        </div>
                    </section>

                    {user?.role === "ADMIN" && (
                        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                            <div className="flex gap-3">
                                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                                <div>
                                    <p className="text-sm font-semibold text-indigo-900">
                                        Administrator account
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-indigo-700">
                                        You have access to Users, Office Performance, Automatic Monitoring Summary, Documents, and administrative settings.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>

            <ChangePasswordModal
                open={showPasswordModal}
                onClose={() =>
                    setShowPasswordModal(false)
                }
            />
        </div>
    );
};

const Field = ({
    label,
    value,
    onChange,
    icon: Icon,
    placeholder,
}) => (
    <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
            {label}
        </label>
        <div className="relative">
            {Icon && (
                <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            )}
            <input
                value={value || ""}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                placeholder={placeholder}
                className={Icon ? "pl-10!" : ""}
            />
        </div>
    </div>
);

const ReadOnlyField = ({
    label,
    value,
    icon: Icon,
}) => (
    <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
            {label}
        </label>
        <div className="relative">
            {Icon && (
                <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            )}
            <input
                value={value || "—"}
                disabled
                className={`cursor-not-allowed bg-slate-50 text-slate-500 ${
                    Icon ? "pl-10!" : ""
                }`}
            />
        </div>
    </div>
);

const StatusBadge = ({ active }) => (
    <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
        }`}
    >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {active ? "Active" : "Inactive"}
    </span>
);

const InfoRow = ({
    label,
    value,
    valueClass = "text-slate-700",
}) => (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
        <span className="text-xs text-slate-500">
            {label}
        </span>
        <span
            className={`text-right text-xs font-medium ${valueClass}`}
        >
            {value || "—"}
        </span>
    </div>
);

const formatDateTime = (value) => {
    if (!value) return "Never";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

export default Settings;
