import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { OFFICES_BY_SECTOR } from "../assets/assets";
import {
    Eye,
    EyeOff,
    Loader2,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import api from "../api/axios.js";
import toast from "react-hot-toast";

const EmployeeForm = ({
    initialData,
    onSuccess,
    onCancel,
}) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isEditMode = Boolean(initialData);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(
            event.currentTarget
        );
        const payload = Object.fromEntries(
            formData.entries()
        );

        if (
            isEditMode &&
            !payload.password
        ) {
            delete payload.password;
        }

        try {
            const url = isEditMode
                ? `/employees/${initialData.id}`
                : "/employees";

            const method = isEditMode
                ? "put"
                : "post";

            await api[method](url, payload);

            toast.success(
                isEditMode
                    ? "User updated successfully."
                    : "User created successfully."
            );

            onSuccess
                ? onSuccess()
                : navigate("/employees");
        } catch (error) {
            toast.error(
                error.response?.data?.error ||
                    error.message ||
                    "Unable to save user."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5 animate-fade-in"
        >
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            Personal Information
                        </h3>
                        <p className="text-xs text-slate-500">
                            Basic information for this office account.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                        label="First Name"
                        name="firstName"
                        required
                        defaultValue={
                            initialData?.firstName
                        }
                    />
                    <Field
                        label="Last Name"
                        name="lastName"
                        required
                        defaultValue={
                            initialData?.lastName
                        }
                    />
                    <Field
                        label="Phone Number"
                        name="phone"
                        required
                        defaultValue={
                            initialData?.phone
                        }
                        placeholder="09XXXXXXXXX"
                    />
                    <Field
                        label="Join Date"
                        name="joinDate"
                        type="date"
                        required
                        defaultValue={
                            initialData?.joinDate
                                ? new Date(
                                      initialData.joinDate
                                  )
                                      .toISOString()
                                      .split("T")[0]
                                : ""
                        }
                    />
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-5 border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                        Employment Details
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                        Assign the user to the appropriate PPDO office and position.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Office / Department
                        </label>
                        <select
                            name="department"
                            required
                            defaultValue={
                                initialData?.department ||
                                ""
                            }
                        >
                            <option value="">
                                Select office
                            </option>
                            {Object.entries(
                                OFFICES_BY_SECTOR
                            ).map(
                                ([
                                    sector,
                                    offices,
                                ]) => (
                                    <optgroup
                                        key={sector}
                                        label={sector}
                                    >
                                        {offices.map(
                                            (
                                                office
                                            ) => (
                                                <option
                                                    key={office}
                                                    value={office}
                                                >
                                                    {
                                                        office
                                                    }
                                                </option>
                                            )
                                        )}
                                    </optgroup>
                                )
                            )}
                        </select>
                    </div>

                    <Field
                        label="Position"
                        name="position"
                        required
                        defaultValue={
                            initialData?.position
                        }
                        placeholder="e.g. Planning Officer"
                    />

                    {isEditMode && (
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Account Status
                            </label>
                            <select
                                name="employmentStatus"
                                defaultValue={
                                    initialData?.employmentStatus ||
                                    "ACTIVE"
                                }
                            >
                                <option value="ACTIVE">
                                    Active
                                </option>
                                <option value="INACTIVE">
                                    Inactive
                                </option>
                            </select>
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            Account Access
                        </h3>
                        <p className="text-xs text-slate-500">
                            Control login credentials and system permissions.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Work Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            required
                            defaultValue={
                                initialData?.email ||
                                initialData?.user?.email ||
                                ""
                            }
                            placeholder="name@ppdo.gov.ph"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            {isEditMode
                                ? "Change Password"
                                : "Temporary Password"}
                        </label>
                        <div className="relative">
                            <input
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                name="password"
                                required={!isEditMode}
                                placeholder={
                                    isEditMode
                                        ? "Leave blank to keep current password"
                                        : "At least 8 characters"
                                }
                                minLength={8}
                                className="pr-11"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        (value) =>
                                            !value
                                    )
                                }
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            System Role
                        </label>
                        <select
                            name="role"
                            defaultValue={
                                initialData?.user?.role ||
                                "EMPLOYEE"
                            }
                        >
                            <option value="EMPLOYEE">
                                Encoder / Office User
                            </option>
                            <option value="DEPARTMENT_HEAD">
                                Department Head / Approval Body
                            </option>
                            <option value="ADMIN">
                                PPDO / Administrator
                            </option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    Administrator accounts can access system management features, including Users, Settings, Office Performance, and Automatic Monitoring Summary.
                </div>
            </section>

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                        onCancel
                            ? onCancel()
                            : navigate(-1)
                    }
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
                    {isEditMode
                        ? "Save Changes"
                        : "Create User"}
                </button>
            </div>
        </form>
    );
};

const Field = ({
    label,
    name,
    type = "text",
    required,
    defaultValue,
    placeholder,
}) => (
    <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
            {label}
        </label>
        <input
            type={type}
            name={name}
            required={required}
            defaultValue={defaultValue || ""}
            placeholder={placeholder}
        />
    </div>
);

export default EmployeeForm;
