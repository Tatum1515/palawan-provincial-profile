import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    FileText,
    Printer,
    RefreshCw,
    XCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "../components/NotificationBell.jsx";

const statusConfig = {
    PENDING: {
        label: "Pending Review",
        className:
            "bg-amber-50 text-amber-700 border-amber-200",
    },

    RECEIVED: {
        label: "Approved",
        className:
            "bg-emerald-50 text-emerald-700 border-emerald-200",
    },

    APPROVED: {
        label: "Approved",
        className:
            "bg-emerald-50 text-emerald-700 border-emerald-200",
    },

    ENDED: {
        label: "Returned / Denied",
        className:
            "bg-rose-50 text-rose-700 border-rose-200",
    },

    DENIED: {
        label: "Returned / Denied",
        className:
            "bg-rose-50 text-rose-700 border-rose-200",
    },
};

const formatDate = (
    value
) => {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            month: "short",
            day: "numeric",
            year: "numeric",
        }
    ).format(date);
};

const escapeHtml = (
    value
) =>
    String(value ?? "").replace(
        /[&<>'"]/g,
        (char) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;",
            })[char]
    );

const printUserDashboard = (
    dashboard
) => {
    const popup = window.open(
        "",
        "_blank",
        "width=1000,height=800"
    );

    if (!popup) {
        return;
    }

    const employee =
        dashboard?.employee ||
        {};

    const rows = (
        dashboard?.recentActivity ||
        []
    )
        .map(
            (item) => `
                <tr>
                    <td>
                        ${escapeHtml(
                            item.name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.category ||
                            "General"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            formatDate(
                                item.createdAt
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            statusConfig[
                                item.status
                            ]?.label ||
                            item.status ||
                            "Pending"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.remark ||
                            "—"
                        )}
                    </td>
                </tr>
            `
        )
        .join("");

    const stats =
        dashboard?.stats ||
        {};

    const period =
        dashboard?.period ||
        {};

    popup.document.write(`
        <html>

            <head>
                <title>
                    Office User Monitoring Report
                </title>

                <style>

                    @page {
                        size: legal landscape;
                        margin: 10mm;
                    }

                    body {
                        font-family: Arial, sans-serif;
                        color: #111827;
                        font-size: 10px;
                    }

                    h1,
                    h2 {
                        text-align: center;
                    }

                    h1 {
                        font-size: 18px;
                        margin-bottom: 3px;
                    }

                    h2 {
                        font-size: 13px;
                        font-weight: normal;
                        margin-top: 0;
                    }

                    .meta {
                        margin: 18px 0;
                    }

                    .cards {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 8px;
                    }

                    .card {
                        border: 1px solid #cbd5e1;
                        padding: 10px;
                    }

                    .label {
                        color: #64748b;
                        font-size: 9px;
                    }

                    .value {
                        font-size: 18px;
                        font-weight: bold;
                        margin-top: 4px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }

                    th,
                    td {
                        border: 1px solid #cbd5e1;
                        padding: 6px;
                    }

                    th {
                        background: #f1f5f9;
                        text-align: left;
                    }

                </style>
            </head>

            <body>

                <h1>
                    PROVINCIAL PLANNING AND DEVELOPMENT OFFICE
                </h1>

                <h2>
                    Office User Monitoring Report —
                    ${escapeHtml(
                        period.quarter
                    )}
                    ${escapeHtml(
                        period.year
                    )}
                </h2>

                <div class="meta">

                    <strong>
                        Employee:
                    </strong>

                    ${escapeHtml(
                        `${employee.firstName || ""} ${
                            employee.lastName || ""
                        }`.trim() ||
                        "—"
                    )}

                    <br />

                    <strong>
                        Office:
                    </strong>

                    ${escapeHtml(
                        employee.department ||
                        "—"
                    )}

                    <br />

                    <strong>
                        Position:
                    </strong>

                    ${escapeHtml(
                        employee.position ||
                        "—"
                    )}

                    <br />

                    <strong>
                        Generated:
                    </strong>

                    ${escapeHtml(
                        new Date().toLocaleString()
                    )}

                </div>

                <div class="cards">

                    <div class="card">
                        <div class="label">
                            Total Submissions
                        </div>

                        <div class="value">
                            ${
                                stats.totalSubmissions ||
                                0
                            }
                        </div>
                    </div>

                    <div class="card">
                        <div class="label">
                            Pending
                        </div>

                        <div class="value">
                            ${
                                stats.pendingReviews ||
                                0
                            }
                        </div>
                    </div>

                    <div class="card">
                        <div class="label">
                            Approved
                        </div>

                        <div class="value">
                            ${
                                stats.approvedItems ||
                                0
                            }
                        </div>
                    </div>

                    <div class="card">
                        <div class="label">
                            Returned / Denied
                        </div>

                        <div class="value">
                            ${
                                stats.returnedItems ||
                                0
                            }
                        </div>
                    </div>

                </div>

                <h3>
                    Recent Monitoring Activity
                </h3>

                <table>

                    <thead>
                        <tr>
                            <th>
                                Item
                            </th>

                            <th>
                                Source
                            </th>

                            <th>
                                Date
                            </th>

                            <th>
                                Status
                            </th>

                            <th>
                                Remarks
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        ${
                            rows ||
                            `
                                <tr>
                                    <td colspan="5">
                                        No activity.
                                    </td>
                                </tr>
                            `
                        }
                    </tbody>

                </table>

                <script>
                    window.onload = () => {
                        window.print();
                    };
                </script>

            </body>
        </html>
    `);

    popup.document.close();
};

export default function UserDashboard() {
    const { user } =
        useAuth();

    const navigate = useNavigate();

    const [
        dashboard,
        setDashboard,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState("");

    const [
        tasks,
        setTasks,
    ] = useState([]);

    const [
        tasksLoading,
        setTasksLoading,
    ] = useState(true);

    const loadTasks =
        useCallback(
            async () => {
                try {
                    setTasksLoading(true);
                    const { data } =
                        await api.get(
                            "/submission-tasks",
                            {
                                params: {
                                    year:
                                        dashboard?.period?.year ||
                                        new Date().getFullYear(),
                                },
                            }
                        );

                    setTasks(
                        Array.isArray(
                            data?.data
                        )
                            ? data.data
                            : []
                    );
                } catch (err) {
                    console.error(
                        "USER TASKS:",
                        err
                    );
                    setTasks([]);
                } finally {
                    setTasksLoading(false);
                }
            },
            [dashboard]
        );

    const loadDashboard =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    setError("");

                    const {
                        data,
                    } =
                        await api.get(
                            "/dashboard"
                        );

                    setDashboard(
                        data
                    );
                } catch (
                    err
                ) {
                    console.error(
                        "USER DASHBOARD:",
                        err
                    );

                    setError(
                        err.response
                            ?.data?.error ||
                            "Unable to load your dashboard."
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            []
        );

    useEffect(() => {
        // External dashboard synchronization.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadDashboard();
    }, [
        loadDashboard,
    ]);

    useEffect(() => {
        // Intentional API synchronization: the effect loads external data into local state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadTasks();
    }, [loadTasks]);

    const stats =
        useMemo(() => {
            const values =
                dashboard?.stats ||
                {};

            return [
                {
                    label:
                        "Total Submissions",
                    value:
                        values.totalSubmissions ??
                        0,
                    icon: FileText,
                    className:
                        "bg-indigo-50 text-indigo-600",
                },

                {
                    label:
                        "Pending Review",
                    value:
                        values.pendingReviews ??
                        0,
                    icon: Clock3,
                    className:
                        "bg-amber-50 text-amber-600",
                },

                {
                    label:
                        "Approved",
                    value:
                        values.approvedItems ??
                        0,
                    icon: CheckCircle2,
                    className:
                        "bg-emerald-50 text-emerald-600",
                },

                {
                    label:
                        "Returned / Denied",
                    value:
                        values.returnedItems ??
                        0,
                    icon: XCircle,
                    className:
                        "bg-rose-50 text-rose-600",
                },
            ];
        }, [
            dashboard,
        ]);

    if (loading) {
        return (
            <div className="space-y-6 animate-fade-in">

                <div>
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />

                    <div className="mt-3 h-8 w-80 animate-pulse rounded bg-slate-200" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    {[1, 2, 3, 4].map(
                        (
                            item
                        ) => (
                            <div
                                key={
                                    item
                                }
                                className="card h-32 animate-pulse bg-slate-100"
                            />
                        )
                    )}

                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card flex items-start gap-3 border-rose-200 bg-rose-50 p-5">

                <AlertCircle className="mt-0.5 text-rose-600" />

                <div className="flex-1">

                    <h2 className="font-semibold text-rose-900">
                        Dashboard unavailable
                    </h2>

                    <p className="mt-1 text-sm text-rose-700">
                        {error}
                    </p>

                    <button
                        onClick={
                            loadDashboard
                        }
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                        <RefreshCw
                            size={16}
                        />

                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const employee =
        dashboard?.employee ||
        {};

    const recent =
        dashboard?.recentActivity ||
        [];

    return (
        <div className="space-y-6 animate-fade-in pb-8">

            {/* HEADER */}
            <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">

                <div>

                    <p className="text-xs font-bold tracking-[0.14em] text-indigo-700">
                        PPDO MONITORING DIVISION
                    </p>

                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                        Welcome back
                        {
                            employee.firstName
                                ? `, ${employee.firstName}`
                                : ""
                        }
                        !
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Track your submissions and
                        monitoring status for{" "}
                        {
                            dashboard?.period
                                ?.quarter
                        }{" "}
                        {
                            dashboard?.period
                                ?.year
                        }.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <NotificationBell year={dashboard?.period?.year || new Date().getFullYear()} />
                    <button
                    type="button"
                    onClick={() =>
                        printUserDashboard(
                            dashboard
                        )
                    }
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <Printer
                        size={16}
                    />

                    Print Report
                    </button>
                </div>
            </header>

            {/* STATS */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                {stats.map(
                    ({
                        label,
                        value,
                        icon: Icon,
                        className,
                    }) => (
                        <div
                            key={
                                label
                            }
                            className="card p-5"
                        >

                            <div className="flex items-start justify-between gap-3">

                                <div>

                                    <p className="text-xs font-medium text-slate-500">
                                        {
                                            label
                                        }
                                    </p>

                                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                                        {Number(
                                            value
                                        ).toLocaleString()}
                                    </p>
                                </div>

                                <div
                                    className={`rounded-xl p-3 ${className}`}
                                >
                                    <Icon
                                        size={
                                            21
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )
                )}
            </section>

            {/* SCHEDULED SUBMISSION TASKS */}
            <section className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="font-semibold text-slate-900">Tasks / Submission Schedule</h2>
                        <p className="mt-1 text-xs text-slate-500">Dates assigned by PPDO/Admin. Submit the requested form before the due date.</p>
                    </div>
                    <button type="button" onClick={loadTasks} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                {tasksLoading ? (
                    <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
                ) : tasks.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                        No scheduled submission tasks for this period.
                    </div>
                ) : (
                    <div className="mt-4 space-y-2">
                        {tasks.map((task) => {
                            const stateClass = task.state === "OVERDUE"
                                ? "border-red-200 bg-red-50 text-red-800"
                                : task.state === "DUE_SOON"
                                    ? "border-amber-200 bg-amber-50 text-amber-800"
                                    : task.state === "UPCOMING"
                                        ? "border-sky-200 bg-sky-50 text-sky-800"
                                        : task.linkedSubmission?.status === "RETURNED"
                                            ? "border-rose-200 bg-rose-50 text-rose-800"
                                            : task.submitted
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                : "border-blue-200 bg-blue-50 text-blue-800";

                            const openTask = () => {
                                if (task.formType === "LBAC3" || task.formType === "LBAC5") {
                                    navigate(`/physical-report?formType=${task.formType}&year=${task.year}${task.quarter ? `&quarter=${task.quarter}` : ""}`);
                                } else {
                                    navigate("/submissions");
                                }
                            };

                            return (
                                <div key={task.id} className={`rounded-xl border p-4 ${stateClass}`}>
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold">{task.title}</p>
                                                {task.quarter && <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold">{task.quarter}</span>}
                                                {task.formType && task.formType !== "GENERAL" && <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold">{task.formType}</span>}
                                            </div>
                                            {task.description && <p className="mt-1 text-xs opacity-80">{task.description}</p>}
                                            <p className="mt-2 text-xs">Start: {formatDate(task.startDate)} · Due: {formatDate(task.dueDate)}</p>
                                            {!task.submitted && task.state === "DUE_SOON" && <p className="mt-1 text-xs font-bold">🟡 {Math.max(0, task.daysRemaining)} day{task.daysRemaining === 1 ? "" : "s"} remaining</p>}
                                            {!task.submitted && task.state === "OVERDUE" && <p className="mt-1 text-xs font-bold">🔴 Submission is overdue. Please coordinate with PPDO.</p>}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                {task.submitted ? (task.linkedSubmission?.status === "RETURNED" ? "RETURNED" : ["APPROVED","VALIDATED","COMPLETED","APPROVED_BY_HEAD"].includes(task.linkedSubmission?.status) ? "APPROVED" : "SUBMITTED") : task.state}
                                            </span>
                                            {(!task.submitted || task.linkedSubmission?.status === "RETURNED") && task.state !== "CLOSED" && (
                                                <button type="button" onClick={openTask} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                                                    Open Task
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* CONTENT */}
            <section className="grid gap-5 lg:grid-cols-3">

                {/* RECENT */}
                <div className="card p-5 lg:col-span-2">

                    <div className="flex items-center justify-between">

                        <div>

                            <h2 className="font-semibold text-slate-900">
                                Recent Monitoring Activity
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Your latest documents,
                                reports, and performance
                                entries.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 overflow-x-auto">

                        <table className="min-w-full text-sm">

                            <thead>

                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">

                                    <th className="px-3 py-3">
                                        Item
                                    </th>

                                    <th className="px-3 py-3">
                                        Source
                                    </th>

                                    <th className="px-3 py-3">
                                        Submitted
                                    </th>

                                    <th className="px-3 py-3">
                                        Status
                                    </th>

                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">

                                {recent.length ===
                                0 ? (
                                    <tr>
                                        <td
                                            colSpan="4"
                                            className="px-3 py-10 text-center text-slate-500"
                                        >
                                            No monitoring
                                            records for
                                            this period.
                                        </td>
                                    </tr>
                                ) : (
                                    recent.map(
                                        (
                                            item
                                        ) => {
                                            const config =
                                                statusConfig[
                                                    item.status
                                                ] ||
                                                statusConfig.PENDING;

                                            return (
                                                <tr
                                                    key={`${item.type}-${item.id}`}
                                                    className="hover:bg-slate-50"
                                                >
                                                    <td className="px-3 py-3 font-medium text-slate-800">
                                                        {
                                                            item.name
                                                        }
                                                    </td>

                                                    <td className="px-3 py-3 text-slate-500">
                                                        {
                                                            item.category ||
                                                            "General"
                                                        }
                                                    </td>

                                                    <td className="px-3 py-3 text-slate-500">
                                                        {formatDate(
                                                            item.createdAt
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-3">

                                                        <span
                                                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
                                                        >
                                                            {
                                                                config.label
                                                            }
                                                        </span>

                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )
                                )}

                            </tbody>
                        </table>
                    </div>
                </div>

                {/* OFFICE INFO */}
                <div className="card p-5">

                    <h2 className="font-semibold text-slate-900">
                        Office Information
                    </h2>

                    <dl className="mt-5 space-y-4 text-sm">

                        <Info
                            label="Employee"
                            value={`${employee.firstName || ""} ${
                                employee.lastName || ""
                            }`.trim() ||
                                user?.email ||
                                "—"}
                        />

                        <Info
                            label="Office"
                            value={
                                employee.department ||
                                "—"
                            }
                        />

                        <Info
                            label="Position"
                            value={
                                employee.position ||
                                "—"
                            }
                        />

                        <Info
                            label="Status"
                            value={
                                employee.employmentStatus ||
                                "—"
                            }
                        />

                    </dl>
                </div>
            </section>
        </div>
    );
}

function Info({
    label,
    value,
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">

            <dt className="text-slate-500">
                {label}
            </dt>

            <dd className="text-right font-semibold text-slate-800">
                {value}
            </dd>

        </div>
    );
}