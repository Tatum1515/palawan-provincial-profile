import {
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    X,
} from "lucide-react";
import { useState } from "react";
import api from "../api/axios.js";
import toast from "react-hot-toast";

const strengthLabel = (password) => {
    if (!password) return "";
    if (password.length < 8) return "Weak";

    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return "Weak";
    if (score === 2) return "Fair";
    if (score === 3) return "Good";
    return "Strong";
};

export const ChangePasswordModal = ({
    open,
    onClose,
}) => {
    const [loading, setLoading] =
        useState(false);
    const [showCurrent, setShowCurrent] =
        useState(false);
    const [showNew, setShowNew] =
        useState(false);
    const [showConfirm, setShowConfirm] =
        useState(false);
    const [newPassword, setNewPassword] =
        useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");
    const [message, setMessage] =
        useState({
            type: "",
            text: "",
        });

    const reset = () => {
        setNewPassword("");
        setConfirmPassword("");
        setMessage({
            type: "",
            text: "",
        });
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
    };

    const handleClose = () => {
        if (loading) return;
        reset();
        onClose?.();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const formData = new FormData(
            event.currentTarget
        );
        const currentPassword = formData.get(
            "currentPassword"
        );

        if (newPassword.length < 8) {
            setMessage({
                type: "error",
                text:
                    "New password must be at least 8 characters long.",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({
                type: "error",
                text:
                    "New password and confirmation do not match.",
            });
            return;
        }

        setLoading(true);
        setMessage({
            type: "",
            text: "",
        });

        try {
            await api.post(
                "/auth/change-password",
                {
                    currentPassword,
                    newPassword,
                }
            );

            toast.success(
                "Password updated successfully."
            );

            setMessage({
                type: "success",
                text:
                    "Your password has been updated successfully.",
            });

            event.currentTarget.reset();
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error.response?.data?.error ||
                    "Unable to update password.",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const strength = strengthLabel(
        newPassword
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onMouseDown={handleClose}
        >
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />

            <div
                className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <KeyRound className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">
                                Change Password
                            </h2>
                            <p className="text-xs text-slate-500">
                                Keep your PPDO account secure.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 p-6"
                >
                    {message.text && (
                        <div
                            className={`flex gap-3 rounded-xl border p-3 text-sm ${
                                message.type ===
                                "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-rose-200 bg-rose-50 text-rose-700"
                            }`}
                        >
                            {message.type ===
                            "success" ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            ) : (
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            )}
                            <span>
                                {message.text}
                            </span>
                        </div>
                    )}

                    <PasswordField
                        label="Current Password"
                        name="currentPassword"
                        placeholder="Enter current password"
                        show={showCurrent}
                        onToggle={() =>
                            setShowCurrent(
                                (value) => !value
                            )
                        }
                        required
                    />

                    <PasswordField
                        label="New Password"
                        name="newPassword"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(event) =>
                            setNewPassword(
                                event.target.value
                            )
                        }
                        show={showNew}
                        onToggle={() =>
                            setShowNew(
                                (value) => !value
                            )
                        }
                        required
                    />

                    {newPassword && (
                        <div className="-mt-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">
                                    Password strength
                                </span>
                                <span className="font-medium text-slate-700">
                                    {strength}
                                </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-indigo-500 transition-all"
                                    style={{
                                        width:
                                            strength ===
                                            "Weak"
                                                ? "25%"
                                                : strength ===
                                                  "Fair"
                                                ? "50%"
                                                : strength ===
                                                  "Good"
                                                ? "75%"
                                                : "100%",
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <PasswordField
                        label="Confirm New Password"
                        name="confirmPassword"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(event) =>
                            setConfirmPassword(
                                event.target.value
                            )
                        }
                        show={showConfirm}
                        onToggle={() =>
                            setShowConfirm(
                                (value) => !value
                            )
                        }
                        required
                    />

                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary inline-flex items-center justify-center gap-2"
                        >
                            {loading && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PasswordField = ({
    label,
    name,
    placeholder,
    value,
    onChange,
    show,
    onToggle,
    required,
}) => (
    <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
            {label}
        </label>
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="pr-11"
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={
                    show
                        ? "Hide password"
                        : "Show password"
                }
            >
                {show ? (
                    <EyeOff className="h-4 w-4" />
                ) : (
                    <Eye className="h-4 w-4" />
                )}
            </button>
        </div>
    </div>
);
