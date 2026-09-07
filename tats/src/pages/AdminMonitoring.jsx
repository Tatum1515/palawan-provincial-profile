import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BarChart3,
    CalendarClock,
    CheckCircle2,
    Clock3,
    AlertCircle,
    ListFilter,
    ClipboardList,
    Edit3,
    FileText,
    Printer,
    RefreshCw,
    Search,
    Trash2,
    Users,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { OFFICES_BY_SECTOR } from "../assets/assets.jsx";
import NotificationBell from "../components/NotificationBell.jsx";

const documentStatus = {
    PENDING: "Pending Review",
    RECEIVED: "Approved",
    ENDED: "Rejected",
    SENT: "Awaiting Response",
    FULFILLED: "Response Submitted",
};

const reviewStatus = {
    PENDING: "Pending Review",
    APPROVED: "Approved",
    DENIED: "Denied",
};

const matchesStatus = (itemStatus, selectedStatus) => {
    if (selectedStatus === "ALL") return true;
    if (selectedStatus === "APPROVED") return ["APPROVED", "RECEIVED"].includes(itemStatus);
    if (selectedStatus === "DENIED") return ["DENIED", "ENDED"].includes(itemStatus);
    return itemStatus === selectedStatus;
};

const formatDate = (value, time = false) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(date);
};

const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>'"]/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    })[char]);

const printHtml = (title, subtitle, headers, rows) => {
    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) {
        toast.error("Please allow popups to print the report.");
        return;
    }

    const body = rows
        .map(
            (row) =>
                `<tr>${row
                    .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                    .join("")}</tr>`
        )
        .join("");

    popup.document.write(`
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(title)}</title>
            <style>
                @page { size: legal landscape; margin: 10mm; }
                body { font-family: Arial, sans-serif; color: #111827; font-size: 10px; }
                h1 { margin: 0; text-align: center; font-size: 18px; }
                h2 { margin: 4px 0 16px; text-align: center; font-size: 13px; font-weight: normal; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
                th { background: #f1f5f9; text-align: left; }
                .meta { margin-bottom: 10px; color: #475569; }
                .footer { margin-top: 22px; font-size: 9px; color: #64748b; }
            </style>
        </head>
        <body>
            <h1>${escapeHtml(title)}</h1>
            <h2>${escapeHtml(subtitle)}</h2>
            <div class="meta">Generated: ${escapeHtml(formatDate(new Date(), true))}</div>
            <table>
                <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
                <tbody>${body || `<tr><td colspan="${headers.length}">No records found.</td></tr>`}</tbody>
            </table>
            <div class="footer">PPDO Monitoring System — Admin Monitoring Report</div>
            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `);
    popup.document.close();
};

export default function AdminMonitoring() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [performance, setPerformance] = useState([]);
    const [physicalReports, setPhysicalReports] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("ALL");
    const [search, setSearch] = useState("");
    const [office, setOffice] = useState("");
    const [status, setStatus] = useState("ALL");
    const [year, setYear] = useState("");
    const [tasks, setTasks] = useState([]);
    const [taskSaving, setTaskSaving] = useState(false);
    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        office: "ALL",
        formType: "LBAC3",
        documentType: "",
        reportTitle: "",
        reportGroupId: "",
        year: new Date().getFullYear(),
        quarter: `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
        startDate: "",
        dueDate: "",
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const results = await Promise.allSettled([
                api.get("/documents"),
                api.get("/officePerformance"),
                api.get("/physical-reports"),
                api.get("/employees"),
                api.get("/submission-tasks", { params: { year: Number(year) || new Date().getFullYear() } }),
            ]);

            const [documentResult, performanceResult, physicalResult, employeeResult, taskResult] = results;

            const failures = [];

            if (documentResult.status === "fulfilled") {
                setDocuments(Array.isArray(documentResult.value?.data?.data) ? documentResult.value.data.data : []);
            } else failures.push("documents");

            if (performanceResult.status === "fulfilled") {
                setPerformance(Array.isArray(performanceResult.value?.data?.data) ? performanceResult.value.data.data : []);
            } else failures.push("performance");

            if (physicalResult.status === "fulfilled") {
                setPhysicalReports(Array.isArray(physicalResult.value?.data?.data) ? physicalResult.value.data.data : []);
            } else failures.push("physical reports");

            if (employeeResult.status === "fulfilled") {
                setEmployees(Array.isArray(employeeResult.value?.data) ? employeeResult.value.data : []);
            } else failures.push("users");

            if (taskResult.status === "fulfilled") {
                setTasks(Array.isArray(taskResult.value?.data?.data) ? taskResult.value.data.data : []);
            } else failures.push("submission tasks");

            if (failures.length === 4) {
                throw new Error("Unable to load Admin monitoring data.");
            }

            if (failures.length) {
                setError(`Some monitoring data could not be loaded: ${failures.join(", ")}.`);
            }
        } catch (err) {
            console.error("ADMIN MONITORING:", err);
            setError(err.response?.data?.error || err.message || "Unable to load monitoring data.");
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => {
        // Data-fetching effect intentionally updates local UI state from an external API.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    const allDocuments = useMemo(() => documents.filter((item) => {
        const text = `${item.name || ""} ${item.folder || ""} ${item.office || ""} ${item.uploadedBy?.email || ""}`.toLowerCase();
        return (!search || text.includes(search.toLowerCase())) &&
            (!office || item.office === office) &&
            (matchesStatus(item.status, status)) &&
            (!year || String(item.year || "") === String(year));
    }), [documents, office, search, status, year]);

    const allPerformance = useMemo(() => performance.filter((item) => {
        const text = `${item.ppa || ""} ${item.office || ""} ${item.fundSource || ""} ${item.submittedBy?.email || ""}`.toLowerCase();
        return (!search || text.includes(search.toLowerCase())) &&
            (!office || item.office === office) &&
            (matchesStatus(item.status, status)) &&
            (!year || String(item.year || "") === String(year));
    }), [performance, office, search, status, year]);

    const allPhysical = useMemo(() => physicalReports.filter((item) => {
        const text = `${item.formType || "LBAC3"} ${item.office || ""} ${item.sector || ""} ${(item.rows || []).map((row) => `${row.ppaCode || ""} ${row.majorFinalOutput || ""} ${row.performanceIndicator || ""}`).join(" ")} ${(item.evaluationRows || []).map((row) => `${row.ppaCode || ""} ${row.majorFinalOutput || ""}`).join(" ")}`.toLowerCase();
        return (!search || text.includes(search.toLowerCase())) &&
            (!office || item.office === office) &&
            (matchesStatus(item.status, status)) &&
            (!year || String(item.year || "") === String(year));
    }), [physicalReports, office, search, status, year]);

    const filteredEmployees = useMemo(() => employees.filter((item) => {
        const text = `${item.firstName || ""} ${item.lastName || ""} ${item.email || ""} ${item.department || ""} ${item.position || ""}`.toLowerCase();
        return (!search || text.includes(search.toLowerCase())) && (!office || item.department === office);
    }), [employees, office, search]);

    const stats = useMemo(() => ({
        users: employees.filter((item) => item.employmentStatus === "ACTIVE").length,
        documentsPending: documents.filter((item) => item.status === "PENDING").length,
        performancePending: performance.filter((item) => item.status === "PENDING").length,
        physicalPending: physicalReports.filter((item) => item.status === "PENDING").length,
    }), [documents, employees, performance, physicalReports]);

    const taskStats = useMemo(() => {
        const now = new Date();
        const active = tasks.filter((task) => !task.submitted && task.state !== "COMPLETED");
        const submitted = tasks.filter((task) => task.submitted);
        const overdue = active.filter((task) => task.dueDate && new Date(task.dueDate) < now);
        const dueSoon = active.filter((task) => {
            if (!task.dueDate) return false;
            const days = (new Date(task.dueDate) - now) / 86400000;
            return days >= 0 && days <= 7;
        });
        return { total: tasks.length, active: active.length, submitted: submitted.length, overdue: overdue.length, dueSoon: dueSoon.length };
    }, [tasks]);

    const createTask = async () => {
        if (!taskForm.title.trim()) {
            return toast.error("Task/document title is required.");
        }
        if (!taskForm.startDate || !taskForm.dueDate) {
            return toast.error("Start date and due date are required.");
        }

        try {
            setTaskSaving(true);
            await api.post("/submission-tasks", taskForm);
            toast.success("Submission task scheduled.");
            setTaskForm({
                title: "",
                description: "",
                office: "ALL",
                formType: "LBAC3",
                documentType: "",
                reportTitle: "",
                reportGroupId: "",
                year: Number(year) || new Date().getFullYear(),
                quarter: "",
                startDate: "",
                dueDate: "",
            });
            await loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Unable to schedule task.");
        } finally {
            setTaskSaving(false);
        }
    };

    const removeTask = async (id) => {
        if (!window.confirm("Remove this scheduled task?")) return;
        try {
            await api.delete(`/submission-tasks/${id}`);
            toast.success("Scheduled task removed.");
            await loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Unable to remove task.");
        }
    };

    const printCurrent = () => {
        if (tab === "DOCUMENTS") {
            printHtml("Document Submission Monitoring", "All filtered office document submissions", ["Document", "Office", "Category", "Year", "Submitted", "Status", "Remarks"], allDocuments.map((item) => [item.name, item.office || "—", item.folder || "General", item.year || "—", formatDate(item.createdAt, true), documentStatus[item.status] || item.status, item.remark || "—"]));
            return;
        }

        if (tab === "PERFORMANCE") {
            printHtml("Office Performance Monitoring", "All filtered office performance submissions", ["PPA / Program", "Office", "Quarter", "Year", "Physical", "Financial", "Rating", "Status", "Submitted By"], allPerformance.map((item) => [item.ppa, item.office, item.quarter, item.year, item.physicalPerformance, item.financialPerformance, Number(item.totalRating || 0).toFixed(2), reviewStatus[item.status] || item.status, item.submittedBy?.email || "Admin"]));
            return;
        }

        if (tab === "PHYSICAL") {
            printHtml("Physical Report Monitoring", "All filtered LBAC 3 and LBAC 5 submissions", ["Form", "Office", "Sector", "Period", "PPA Rows", "Physical", "Financial", "Overall", "Status"], allPhysical.map((item) => {
                const rows = item.formType === "LBAC5" ? (item.evaluationRows || []) : (item.rows || []);
                const physical = item.formType === "LBAC5" ? Number(item.lbac5Totals?.physicalWeightedScore || 0).toFixed(2) : "—";
                const financial = item.formType === "LBAC5" ? Number(item.lbac5Totals?.financialWeightedScore || 0).toFixed(2) : "—";
                const overall = item.formType === "LBAC5" ? Number(item.lbac5Totals?.totalWeightedScore || 0).toFixed(2) : "—";
                return [item.formType || "LBAC3", item.office, item.sector, item.formType === "LBAC5" ? `${item.quarter} ${item.year}` : item.year, rows.length, physical, financial, overall, reviewStatus[item.status] || item.status];
            }));
            return;
        }

        if (tab === "USERS") {
            printHtml("PPDO User Directory", "Filtered system users and office assignments", ["Name", "Email", "Office", "Position", "Role", "Status", "Last Login"], filteredEmployees.map((item) => [`${item.firstName || ""} ${item.lastName || ""}`.trim(), item.email, item.department, item.position, item.user?.role || "EMPLOYEE", item.employmentStatus, formatDate(item.user?.lastLoginAt, true)]));
            return;
        }

        printHtml("PPDO Monitoring Summary", "Combined monitoring data from documents, performance, physical reports, and users", ["Module", "Office / User", "Record", "Year", "Status", "Date"], [
            ...allDocuments.map((item) => ["Documents", item.office || "—", item.name, item.year || "—", documentStatus[item.status] || item.status, formatDate(item.createdAt, true)]),
            ...allPerformance.map((item) => ["Office Performance", item.office, item.ppa, item.year, reviewStatus[item.status] || item.status, formatDate(item.createdAt, true)]),
            ...allPhysical.map((item) => ["Physical Report", item.office, `${item.rows?.length || 0} PPA rows`, item.year, reviewStatus[item.status] || item.status, formatDate(item.createdAt, true)]),
        ]);
    };

    const tabs = [
        ["ALL", "All Monitoring"],
        ["DOCUMENTS", "Documents"],
        ["PERFORMANCE", "Office Performance"],
        ["PHYSICAL", "Physical Reports"],
        ["USERS", "Users"],
    ];

    return (
        <div className="animate-fade-in space-y-6 pb-8">
            <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-bold tracking-[0.14em] text-indigo-700">ADMIN CONTROL CENTER</p>
                    <h1 className="page-title">Office Monitoring</h1>
                    <p className="page-subtitle">Review the data submitted by offices and jump directly to the module where you can edit, validate, approve, or print it.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <NotificationBell year={Number(year) || new Date().getFullYear()} />
                    <button type="button" onClick={loadData} className="btn-secondary inline-flex items-center gap-2"><RefreshCw size={16}/>Refresh</button>
                    <button type="button" onClick={printCurrent} className="btn-primary inline-flex items-center gap-2"><Printer size={16}/>Print</button>
                </div>
            </header>

            {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Active Users" value={stats.users} icon={Users} />
                <SummaryCard label="Documents Pending" value={stats.documentsPending} icon={FileText} tone="amber" />
                <SummaryCard label="Performance Pending" value={stats.performancePending} icon={BarChart3} tone="violet" />
                <SummaryCard label="Physical Reports Pending" value={stats.physicalPending} icon={ClipboardList} tone="rose" />
            </section>

            <section className="card overflow-hidden">
                <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-white p-5 lg:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><CalendarClock size={20} /></div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900">Submission Schedule</h2>
                                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700">Admin control</span>
                                </div>
                                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Create one clear submission task for an office or all offices. The schedule appears automatically on the assigned users' Task Board.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                            <MiniStat label="Tasks" value={taskStats.total} />
                            <MiniStat label="Active" value={taskStats.active} tone="indigo" />
                            <MiniStat label="Due soon" value={taskStats.dueSoon} tone="amber" />
                            <MiniStat label="Overdue" value={taskStats.overdue} tone="rose" />
                            <MiniStat label="Submitted" value={taskStats.submitted} tone="emerald" />
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.75fr)] lg:p-6">
                    <div>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-slate-900">Create submission task</h3>
                                <p className="mt-0.5 text-xs text-slate-500">Required fields are marked with <span className="text-rose-500">*</span>.</p>
                            </div>
                            <span className="hidden rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">{taskForm.office === "ALL" ? "All offices" : "One office"}</span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <FieldGroup label="Task / Document title" required className="sm:col-span-2 xl:col-span-2">
                                <input className="field-input" placeholder="e.g. Quarterly Physical Report" value={taskForm.title} onChange={(e)=>setTaskForm((current)=>({...current,title:e.target.value}))} />
                            </FieldGroup>
                            <FieldGroup label="Year" required>
                                <input className="field-input" type="number" min="2000" max="2100" value={taskForm.year} onChange={(e)=>setTaskForm((current)=>({...current,year:Number(e.target.value)}))} />
                            </FieldGroup>
                            <FieldGroup label="Assign to office" required>
                                <select className="field-input" value={taskForm.office} onChange={(e)=>setTaskForm((current)=>({...current,office:e.target.value}))}>
                                    <option value="ALL">All Offices</option>
                                    {Object.entries(OFFICES_BY_SECTOR).map(([sector, offices]) => <optgroup key={sector} label={sector}>{offices.map((item)=><option key={item} value={item}>{item}</option>)}</optgroup>)}
                                </select>
                            </FieldGroup>
                            <FieldGroup label="Form / Report type" required>
                                <select className="field-input" value={taskForm.formType} onChange={(e)=>setTaskForm((current)=>({...current,formType:e.target.value,quarter:["LBAC3","LBAC5"].includes(e.target.value) ? (current.quarter || `Q${Math.floor(new Date().getMonth() / 3) + 1}`) : current.quarter}))}>
                                    <option value="LBAC3">LBAC Form No. 3</option>
                                    <option value="LBAC5">LBAC Form No. 5</option>
                                    <option value="DOCUMENT">Other Document</option>
                                    <option value="GENERAL">General Task</option>
                                </select>
                            </FieldGroup>
                            <FieldGroup label="Quarter">
                                <select className="field-input" value={taskForm.quarter} onChange={(e)=>setTaskForm((current)=>({...current,quarter:e.target.value}))}>
                                    <option value="">No Quarter</option>
                                    <option value="Q1">Q1 — Jan to Mar</option>
                                    <option value="Q2">Q2 — Apr to Jun</option>
                                    <option value="Q3">Q3 — Jul to Sep</option>
                                    <option value="Q4">Q4 — Oct to Dec</option>
                                </select>
                            </FieldGroup>
                            <FieldGroup label="Report title">
                                <input className="field-input" placeholder="Optional report title" value={taskForm.reportTitle} onChange={(e)=>setTaskForm((current)=>({...current,reportTitle:e.target.value}))} />
                            </FieldGroup>
                            <FieldGroup label="Submission start" required>
                                <input className="field-input" type="date" value={taskForm.startDate} onChange={(e)=>setTaskForm((current)=>({...current,startDate:e.target.value}))} />
                            </FieldGroup>
                            <FieldGroup label="Due date" required>
                                <input className="field-input" type="date" value={taskForm.dueDate} onChange={(e)=>setTaskForm((current)=>({...current,dueDate:e.target.value}))} />
                            </FieldGroup>
                            <FieldGroup label="Instructions / description" className="sm:col-span-2 xl:col-span-3">
                                <textarea className="field-input min-h-24 resize-y" maxLength={500} placeholder="Add instructions, guidelines, or remarks for the assigned office..." value={taskForm.description} onChange={(e)=>setTaskForm((current)=>({...current,description:e.target.value}))} />
                                <p className="mt-1 text-right text-[11px] text-slate-400">{taskForm.description.length}/500</p>
                            </FieldGroup>
                            <div className="flex items-end sm:justify-end">
                                <button type="button" onClick={createTask} disabled={taskSaving} className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto">
                                    <CalendarClock size={16}/>{taskSaving ? "Scheduling..." : "Schedule Task"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <aside className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-2 text-slate-900">
                            <ListFilter size={17} className="text-indigo-600" />
                            <h3 className="font-semibold">How the schedule works</h3>
                        </div>
                        <div className="mt-4 space-y-3">
                            <GuideStep number="01" title="Set the scope" text="Choose one office or assign the task to all offices." />
                            <GuideStep number="02" title="Set the period" text="Choose the quarter, submission start, and due date." />
                            <GuideStep number="03" title="Users receive the task" text="The task becomes visible on the assigned user's Task Board." />
                            <GuideStep number="04" title="Monitor the deadline" text="Active, due-soon, overdue, and submitted states are tracked here." />
                        </div>
                    </aside>
                </div>

                <div className="border-t border-slate-100 bg-white p-5 lg:p-6">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">Scheduled Tasks</h3>
                            <p className="mt-0.5 text-xs text-slate-500">Manage submission schedules for {Number(year) || new Date().getFullYear()}.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Status value="ACTIVE" />
                            <Status value="UPCOMING" />
                            <Status value="OVERDUE" />
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-[980px] w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Task</th><th className="px-4 py-3">Office</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Quarter</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">State</th><th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tasks.map((task)=><tr key={task.id} className="hover:bg-slate-50/70">
                                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{task.title}</p><p className="mt-0.5 text-xs text-slate-500">{task.reportTitle || "All reports"}</p></td>
                                    <td className="px-4 py-3 text-slate-600">{task.office}</td>
                                    <td className="px-4 py-3"><span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{task.formType}</span></td>
                                    <td className="px-4 py-3 text-slate-600">{task.quarter || "—"}</td>
                                    <td className="px-4 py-3 text-slate-600">{formatDate(task.startDate)}</td>
                                    <td className="px-4 py-3 text-slate-600">{formatDate(task.dueDate)}</td>
                                    <td className="px-4 py-3"><TaskState task={task}/></td>
                                    <td className="px-4 py-3 text-right"><button type="button" onClick={()=>removeTask(task.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50" title="Remove task"><Trash2 size={14}/>Remove</button></td>
                                </tr>)}
                                {tasks.length === 0 && <tr><td colSpan="8" className="px-6 py-10 text-center"><div className="mx-auto flex max-w-sm flex-col items-center"><div className="rounded-2xl bg-slate-100 p-3 text-slate-400"><CalendarClock size={22}/></div><p className="mt-3 font-semibold text-slate-700">No scheduled tasks yet</p><p className="mt-1 text-xs leading-5 text-slate-500">Create a submission schedule above and it will appear here for monitoring.</p></div></td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
                    <div className="relative min-w-0 flex-1">
                        <Search size={17} className="absolute left-3 top-3 text-slate-400" />
                        <input className="field-input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search office, user, document, PPA..." />
                    </div>
                    <select className="field-input lg:w-72" value={office} onChange={(event) => setOffice(event.target.value)}>
                        <option value="">All Offices</option>
                        {Object.entries(OFFICES_BY_SECTOR).map(([sector, offices]) => (
                            <optgroup key={sector} label={sector}>
                                {offices.map((item) => <option key={item} value={item}>{item}</option>)}
                            </optgroup>
                        ))}
                    </select>
                    <select className="field-input lg:w-48" value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="RECEIVED">Approved / Received</option>
                        <option value="ENDED">Rejected / Denied</option>
                        <option value="APPROVED">Approved Performance</option>
                        <option value="DENIED">Denied Performance</option>
                    </select>
                    <input className="field-input lg:w-28" type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} placeholder="Year" />
                </div>

                <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2">
                    {tabs.map(([value, label]) => (
                        <button key={value} type="button" onClick={() => setTab(value)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${tab === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="p-12 text-center text-sm text-slate-500">Loading monitoring data...</div>
                ) : tab === "DOCUMENTS" ? (
                    <DocumentsTable rows={allDocuments} onManage={() => navigate("/documents")} />
                ) : tab === "PERFORMANCE" ? (
                    <PerformanceTable rows={allPerformance} onManage={() => navigate("/performance")} />
                ) : tab === "PHYSICAL" ? (
                    <PhysicalTable rows={allPhysical} onManage={() => navigate("/physical-report")} />
                ) : tab === "USERS" ? (
                    <UsersTable rows={filteredEmployees} onManage={() => navigate("/employees")} />
                ) : (
                    <CombinedTable documents={allDocuments} performance={allPerformance} physicalReports={allPhysical} onManage={(module) => navigate(module)} />
                )}
            </section>
        </div>
    );
}

function FieldGroup({ label, required = false, className = "", children }) {
    return <label className={`block ${className}`}><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>{children}</label>;
}

function MiniStat({ label, value, tone = "slate" }) {
    const tones = {
        slate: "border-slate-200 bg-white text-slate-900",
        indigo: "border-indigo-100 bg-indigo-50/70 text-indigo-700",
        amber: "border-amber-100 bg-amber-50/70 text-amber-700",
        rose: "border-rose-100 bg-rose-50/70 text-rose-700",
        emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    };
    return <div className={`min-w-[72px] rounded-xl border px-3 py-2 ${tones[tone]}`}><p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p><p className="mt-0.5 text-base font-bold">{value}</p></div>;
}

function GuideStep({ number, title, text }) {
    return <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-indigo-600 shadow-sm ring-1 ring-slate-200">{number}</span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p></div></div>;
}

function TaskState({ task }) {
    if (task.submitted) return <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13}/>Submitted</span>;
    if (task.dueDate && new Date(task.dueDate) < new Date()) return <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"><AlertCircle size={13}/>Overdue</span>;
    if (task.dueDate && (new Date(task.dueDate) - new Date()) / 86400000 <= 7) return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><Clock3 size={13}/>Due soon</span>;
    return <Status value={task.state || "ACTIVE"}/>;
}

function SummaryCard({ label, value, icon: Icon, tone = "indigo" }) {
    const classes = {
        indigo: "bg-indigo-50 text-indigo-600",
        amber: "bg-amber-50 text-amber-600",
        violet: "bg-violet-50 text-violet-600",
        rose: "bg-rose-50 text-rose-600",
    };
    return <div className="card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value.toLocaleString()}</p></div><div className={`rounded-xl p-3 ${classes[tone]}`}><Icon size={20}/></div></div></div>;
}

function TableShell({ children, empty }) {
    return <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-sm">{children}</table>{empty && <div className="p-12 text-center text-sm text-slate-500">No records match the current filters.</div>}</div>;
}

function DocumentsTable({ rows, onManage }) {
    return <TableShell empty={!rows.length}><thead><tr className="border-b border-slate-100 bg-slate-50 text-left"><th className="px-4 py-3">Document</th><th className="px-4 py-3">Office</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Year</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Remarks</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-4 py-4 font-semibold text-slate-900">{item.name}</td><td className="px-4 py-4">{item.office || "—"}</td><td className="px-4 py-4">{item.folder || "General"}</td><td className="px-4 py-4">{item.year || "—"}</td><td className="px-4 py-4 text-xs text-slate-500">{formatDate(item.createdAt, true)}</td><td className="px-4 py-4"><Status value={documentStatus[item.status] || item.status}/></td><td className="max-w-xs px-4 py-4 text-xs text-slate-500">{item.remark || "—"}</td><td className="px-4 py-4"><button type="button" onClick={onManage} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" title="Open document management"><Edit3 size={17}/></button></td></tr>)}</tbody></TableShell>;
}

function PerformanceTable({ rows, onManage }) {
    return <TableShell empty={!rows.length}><thead><tr className="border-b border-slate-100 bg-slate-50 text-left"><th className="px-4 py-3">PPA / Program</th><th className="px-4 py-3">Office</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Physical</th><th className="px-4 py-3">Financial</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Submitted By</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-4 py-4 font-semibold">{item.ppa}</td><td className="px-4 py-4">{item.office}</td><td className="px-4 py-4">{item.quarter} {item.year}</td><td className="px-4 py-4">{item.physicalPerformance}</td><td className="px-4 py-4">{item.financialPerformance}</td><td className="px-4 py-4 font-bold">{Number(item.totalRating || 0).toFixed(2)}</td><td className="px-4 py-4 text-xs text-slate-500">{item.submittedBy?.email || "Admin"}</td><td className="px-4 py-4"><Status value={reviewStatus[item.status] || item.status}/></td><td className="px-4 py-4"><button type="button" onClick={onManage} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" title="Open performance management"><Edit3 size={17}/></button></td></tr>)}</tbody></TableShell>;
}

function PhysicalTable({ rows, onManage }) {
    return <TableShell empty={!rows.length}><thead><tr className="border-b border-slate-100 bg-slate-50 text-left"><th className="px-4 py-3">Form</th><th className="px-4 py-3">Office</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">PPA Rows</th><th className="px-4 py-3">Physical</th><th className="px-4 py-3">Financial</th><th className="px-4 py-3">Overall</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{rows.map((item) => { const isLbac5 = item.formType === "LBAC5"; const target = (item.rows || []).reduce((sum, row) => sum + Number(row.targetOutput?.total || 0), 0); const actual = (item.rows || []).reduce((sum, row) => sum + Number(row.actualPerformance?.total || 0), 0); const variance = actual - target; return <tr key={item.id} className="border-b border-slate-100"><td className="px-4 py-4"><span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{item.formType || "LBAC3"}</span></td><td className="px-4 py-4 font-semibold">{item.office}</td><td className="px-4 py-4">{isLbac5 ? `${item.quarter} ${item.year}` : item.year}</td><td className="px-4 py-4">{isLbac5 ? item.evaluationRows?.length || 0 : item.rows?.length || 0}</td><td className="px-4 py-4">{isLbac5 ? Number(item.lbac5Totals?.physicalWeightedScore || 0).toFixed(2) : actual.toFixed(2)}</td><td className="px-4 py-4">{isLbac5 ? Number(item.lbac5Totals?.financialWeightedScore || 0).toFixed(2) : "—"}</td><td className="px-4 py-4 font-bold">{isLbac5 ? Number(item.lbac5Totals?.totalWeightedScore || 0).toFixed(2) : variance.toFixed(2)}</td><td className="px-4 py-4"><Status value={reviewStatus[item.status] || item.status}/></td><td className="px-4 py-4"><button type="button" onClick={onManage} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" title="Open physical report management"><Edit3 size={17}/></button></td></tr>; })}</tbody></TableShell>;
}

function UsersTable({ rows, onManage }) {
    return <TableShell empty={!rows.length}><thead><tr className="border-b border-slate-100 bg-slate-50 text-left"><th className="px-4 py-3">User</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Office</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last Login</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-4 py-4 font-semibold">{`${item.firstName || ""} ${item.lastName || ""}`.trim() || "—"}</td><td className="px-4 py-4 text-xs">{item.email}</td><td className="px-4 py-4">{item.department}</td><td className="px-4 py-4">{item.position}</td><td className="px-4 py-4">{item.user?.role || "EMPLOYEE"}</td><td className="px-4 py-4"><Status value={item.employmentStatus}/></td><td className="px-4 py-4 text-xs text-slate-500">{formatDate(item.user?.lastLoginAt, true)}</td><td className="px-4 py-4"><button type="button" onClick={onManage} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" title="Edit user"><Edit3 size={17}/></button></td></tr>)}</tbody></TableShell>;
}

function CombinedTable({ documents, performance, physicalReports, onManage }) {
    const rows = [
        ...documents.map((item) => ({ module: "Documents", office: item.office || "—", record: item.name, year: item.year || "—", status: documentStatus[item.status] || item.status, date: item.createdAt, route: "/documents" })),
        ...performance.map((item) => ({ module: "Office Performance", office: item.office, record: item.ppa, year: item.year, status: reviewStatus[item.status] || item.status, date: item.createdAt, route: "/performance" })),
        ...physicalReports.map((item) => ({ module: "Physical Report", office: item.office, record: `${item.formType || "LBAC3"} — ${item.formType === "LBAC5" ? item.evaluationRows?.length || 0 : item.rows?.length || 0} PPA rows`, year: item.year, status: reviewStatus[item.status] || item.status, date: item.createdAt, route: "/physical-report" })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 100);

    return <TableShell empty={!rows.length}><thead><tr className="border-b border-slate-100 bg-slate-50 text-left"><th className="px-4 py-3">Module</th><th className="px-4 py-3">Office</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Year</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{rows.map((item, index) => <tr key={`${item.module}-${item.record}-${index}`} className="border-b border-slate-100"><td className="px-4 py-4 font-semibold">{item.module}</td><td className="px-4 py-4">{item.office}</td><td className="px-4 py-4">{item.record}</td><td className="px-4 py-4">{item.year}</td><td className="px-4 py-4"><Status value={item.status}/></td><td className="px-4 py-4 text-xs text-slate-500">{formatDate(item.date, true)}</td><td className="px-4 py-4"><button type="button" onClick={() => onManage(item.route)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" title="Open module"><Edit3 size={17}/></button></td></tr>)}</tbody></TableShell>;
}

function Status({ value }) {
    const text = String(value || "—");
    const lower = text.toLowerCase();
    const className = lower.includes("approved") || lower.includes("active") || lower.includes("received") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : lower.includes("overdue") || lower.includes("returned") || lower.includes("denied") || lower.includes("rejected") || lower.includes("inactive") ? "bg-rose-50 text-rose-700 border-rose-200" : lower.includes("due_soon") || lower.includes("pending") || lower.includes("upcoming") ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200";
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{text}</span>;
}
