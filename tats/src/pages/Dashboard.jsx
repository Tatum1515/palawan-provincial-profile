import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertCircle,
    BarChart3,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Clock3,
    FileText,
    Filter,
    Printer,
    RefreshCw,
    RotateCcw,
    ShieldCheck,
    TrendingUp,
    Users,
    Wallet,
    XCircle,
    Eye,
    Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import UserDashboard from "./UserDashboard.jsx";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const YEARS = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index);

const DOCUMENT_TYPES = [
    { value: "", label: "All Monitoring Sources" },
    { value: "PHYSICAL_FINANCIAL", label: "Physical & Financial Accomplishment" },
    { value: "ANNUAL_REPORT", label: "Annual Report" },
    { value: "CITIZENS_CHARTER", label: "Citizen's Charter" },
    { value: "CSM_REPORT", label: "Client Satisfaction Measurement" },
];

const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "PENDING", label: "Needs Action / Pending" },
    { value: "APPROVED", label: "Approved / Validated" },
    { value: "RETURNED", label: "Returned / Denied" },
];

const OFFICES_BY_SECTOR = {
    "General Services Sector": ["Office of the Governor", "Provincial Information Office", "Provincial Jail Management Office", "Provincial Assessor's Office", "Provincial Administrator's Office", "Provincial Legal Office", "Bids and Awards Committee Office", "Provincial General Services Office", "Provincial Human Resource Management Office", "Provincial Budget Office", "Provincial Treasurer's Office", "Provincial Accountant's Office", "Provincial Planning and Development Office", "Provincial Internal Audit Services Office"],
    "Economic and Environmental Sector": ["Provincial Environment and Natural Resources Office", "Provincial Veterinary Office", "Provincial Tourism Promotions and Development Office", "Provincial Agriculturist Office", "Provincial Economic Enterprise Development Office", "Provincial Cooperative Development Office", "Provincial Community-Based Gender and Development Office", "Provincial Employment Services Office"],
    "Social and Health Services Sector": ["Provincial Health Office", "Aborlan Medicare Hospital", "Narra Municipal Hospital", "Southern Palawan Provincial Hospital", "Quezon Medicare Hospital", "Roxas Medicare Hospital", "Northern Palawan Provincial Hospital", "Francisco F. Ponce De Leon Memorial Hospital", "Coron District Hospital", "Cuyo District Hospital", "Dr. Jose Rizal District Hospital", "Bataraza District Hospital", "El Nido Community Hospital", "San Vicente District Hospital", "Araceli-Dumaran District Hospital", "Balabac District Hospital", "Sofronio Española District Hospital", "Provincial Social Welfare and Development Office", "Provincial Disaster Risk Reduction Management Office", "Community Affairs Division Office", "Sports Division Office"],
    "Legislative Services Sector": ["Vice Governor's Office", "Secretary to the Sangguniang Panlalawigan Office", "Office of the Sangguniang Panlalawigan", "Office of Board Member Juan Antonio Alvarez", "Office of Board Member Roseller S. Pineda", "Office of Board Member Nieves C. Rosento", "Office of Board Member Winston Arzaga", "Office of Board Member Ma. Angela V. Sabando", "Office of Board Member Al-Nashier M. Ibba", "Office of Board Member Ryan D. Maminta", "Office of Board Member Marivic H. Roxas", "Office of Board Member Ariston D. Arzaga", "Office of Board Member Rafael V. Ortega Jr.", "Office of Board Member Ferdinand P. Zaballa", "Office of Board Member Al-Shariff W. Ibba", "Office of Board Member SK Federation Luzviminda L. Bautista", "Office of Board Member Arnel Abrina"],
    "Infrastructure Services Sector": ["Provincial Engineer's Office", "Provincial Equipment and Pool Office"],
};
const SECTORS = Object.keys(OFFICES_BY_SECTOR);

const statusMeta = {
    PENDING: { label: "Pending", tone: "amber", icon: Clock3 },
    SUBMITTED: { label: "Submitted", tone: "blue", icon: FileText },
    UNDER_REVIEW: { label: "Under Review", tone: "violet", icon: ShieldCheck },
    RESUBMITTED: { label: "Resubmitted", tone: "blue", icon: RefreshCw },
    APPROVED_BY_HEAD: { label: "For PPDO Review", tone: "indigo", icon: ShieldCheck },
    FOR_PPDO_REVIEW: { label: "For PPDO Review", tone: "indigo", icon: ShieldCheck },
    APPROVED: { label: "Approved", tone: "emerald", icon: CheckCircle2 },
    VALIDATED: { label: "Validated", tone: "emerald", icon: CheckCircle2 },
    COMPLETED: { label: "Completed", tone: "emerald", icon: CheckCircle2 },
    DENIED: { label: "Denied", tone: "rose", icon: XCircle },
    RETURNED: { label: "Returned", tone: "rose", icon: RotateCcw },
    RECEIVED: { label: "Received", tone: "emerald", icon: CheckCircle2 },
    ENDED: { label: "Ended / Returned", tone: "rose", icon: XCircle },
};

const toneClasses = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
};

const quarterLabel = (quarter) =>
    ({ Q1: "Jan – Mar", Q2: "Apr – Jun", Q3: "Jul – Sep", Q4: "Oct – Dec" }[quarter] || "");

const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
};

const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
};

const number = (value, digits = 0) => Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
});

const pesos = (value) => `₱${number(value, 2)}`;

const safePercent = (value) => `${number(value, 1)}%`;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));

export default function Dashboard() {
    const { user } = useAuth();
    if (String(user?.role || "").toUpperCase() !== "ADMIN") return <UserDashboard />;
    return <AdminDashboard />;
}

function AdminDashboard() {
    const navigate = useNavigate();
    const now = useMemo(() => {
        const date = new Date();
        return { year: date.getFullYear(), quarter: `Q${Math.ceil((date.getMonth() + 1) / 3)}` };
    }, []);

    const [year, setYear] = useState(now.year);
    const [quarter, setQuarter] = useState(now.quarter);
    const [office, setOffice] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [status, setStatus] = useState("");
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async ({ silent = false } = {}) => {
        try {
            silent ? setRefreshing(true) : setLoading(true);
            setError("");
            const { data } = await api.get("/dashboard", {
                params: { year, quarter, office, documentType, status },
            });
            if (!data?.success) throw new Error(data?.error || "Dashboard data could not be loaded.");
            setDashboard(data);
        } catch (err) {
            console.error("ADMIN DASHBOARD:", err);
            setError(err?.response?.data?.error || err?.message || "Unable to load dashboard.");
        } finally {
            silent ? setRefreshing(false) : setLoading(false);
        }
    }, [year, quarter, office, documentType, status]);

    useEffect(() => {
        // Intentional API synchronization: the effect loads external data into local state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadDashboard();
    }, [loadDashboard]);

    const clearFilters = () => {
        setOffice("");
        setDocumentType("");
        setStatus("");
    };

    const hasFilters = Boolean(office || documentType || status);
    const stats = dashboard?.stats || {};
    const documents = dashboard?.documents || {};
    const physical = dashboard?.physicalReports || {};
    const performance = dashboard?.performance || {};
    const financial = dashboard?.financialOverview || {};
    const workflow = dashboard?.workflowCounts || {};
    const leaderboard = useMemo(() => dashboard?.officeLeaderboard || [], [dashboard?.officeLeaderboard]);
    const quarterMatrix = useMemo(() => dashboard?.quarterMatrix || [], [dashboard?.quarterMatrix]);
    const actionCenter = dashboard?.actionCenter || {};
    const complianceAlerts = useMemo(() => {
        const details = dashboard?.complianceOverview?.officeDetails || [];
        const priority = { OVERDUE: 0, RETURNED: 1, PARTIAL: 2, DUE_SOON: 3, IN_REVIEW: 4, SUBMITTED: 5, NOT_YET_DUE: 6, VALIDATED: 7, NO_SCHEDULE: 8 };
        return details
            .map((officeRow) => {
                const item = officeRow.quarters?.[quarter];
                if (!item) return null;
                const state = item.status === "VALIDATED" ? "VALIDATED" : item.status === "RETURNED" ? "RETURNED" : item.status === "PARTIAL" ? "PARTIAL" : item.status === "IN_REVIEW" ? "IN_REVIEW" : item.deadlineState || "NO_SCHEDULE";
                return { office: officeRow.office, sector: officeRow.sector, quarter, ...item, priority: priority[state] ?? 9, alertState: state };
            })
            .filter(Boolean)
            .filter((item) => ["OVERDUE", "RETURNED", "PARTIAL", "DUE_SOON", "IN_REVIEW", "NO_SCHEDULE"].includes(item.alertState))
            .sort((a, b) => a.priority - b.priority || a.office.localeCompare(b.office))
            .slice(0, 8);
    }, [dashboard?.complianceOverview?.officeDetails, quarter]);
    const [coverageSearch, setCoverageSearch] = useState("");
    const [selectedSector, setSelectedSector] = useState("");


    const sectorOverview = useMemo(() => {
        const healthMap = new Map((dashboard?.officeHealth || []).map((row) => [row.office, row]));
        const leaderboardMap = new Map((leaderboard || []).map((row) => [row.office, row]));
        const coverageMap = new Map((quarterMatrix || []).map((row) => [row.office, row]));
        const complianceMap = new Map((dashboard?.complianceOverview?.officeDetails || []).map((row) => [row.office, row]));

        return SECTORS.map((sector) => {
            const offices = OFFICES_BY_SECTOR[sector] || [];
            const officeRows = offices.map((officeName) => ({
                office: officeName,
                sector,
                ...(healthMap.get(officeName) || {}),
                ...(leaderboardMap.get(officeName) || {}),
                coverage: coverageMap.get(officeName) || {},
                compliance: complianceMap.get(officeName) || {},
                currentCompliance: complianceMap.get(officeName)?.quarters?.[quarter] || null,
            }));
            const reporting = officeRows.filter((row) => row.reportExists || row.reportCount > 0 || QUARTERS.some((q) => Number(row.coverage?.[q]?.count || 0) > 0)).length;
            const validated = officeRows.filter((row) => ["VALIDATED", "APPROVED", "COMPLETED"].includes(row.status)).length;
            const forAction = officeRows.filter((row) => ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "PENDING", "APPROVED_BY_HEAD", "FOR_PPDO_REVIEW"].includes(row.status)).length;
            const returned = officeRows.filter((row) => ["RETURNED", "DENIED"].includes(row.status)).length;
            const target = officeRows.reduce((sum, row) => sum + Number(row.target || 0), 0);
            const actual = officeRows.reduce((sum, row) => sum + Number(row.actual || 0), 0);
            const allocation = officeRows.reduce((sum, row) => sum + Number(row.allocation || 0), 0);
            const obligations = officeRows.reduce((sum, row) => sum + Number(row.obligations || 0), 0);
            const coaRows = officeRows.filter((row) => row.coa != null && row.reportCount > 0);
            const coa = coaRows.length ? coaRows.reduce((sum, row) => sum + Number(row.coa || 0), 0) / coaRows.length : 0;
            const quarters = Object.fromEntries(QUARTERS.map((q) => {
                const values = officeRows.map((row) => row.coverage?.[q] || {});
                const reportingQ = values.filter((value) => Number(value.count || 0) > 0).length;
                const approvedQ = values.filter((value) => value.approved).length;
                const reviewQ = values.filter((value) => value.pending || value.headApproved).length;
                const returnedQ = values.filter((value) => value.returned).length;
                return [q, { reporting: reportingQ, approved: approvedQ, review: reviewQ, returned: returnedQ }];
            }));
            return {
                sector,
                offices: offices.length,
                officeRows,
                reporting,
                validated,
                forAction,
                returned,
                target,
                actual,
                variance: actual - target,
                accomplishment: target > 0 ? (actual / target) * 100 : 0,
                allocation,
                obligations,
                financialVariance: allocation - obligations,
                absorptiveCapacity: allocation > 0 ? (obligations / allocation) * 100 : 0,
                coa,
                completion: offices.length ? (reporting / offices.length) * 100 : 0,
                quarters,
            };
        });
    }, [dashboard?.officeHealth, leaderboard, quarterMatrix, dashboard?.complianceOverview?.officeDetails]);

    const complianceOverview = dashboard?.complianceOverview || { sectors: [], provincial: {} };
    const complianceSectors = useMemo(() => {
        const rows = Array.isArray(complianceOverview.sectors) ? complianceOverview.sectors : [];
        const query = coverageSearch.trim().toLowerCase();
        return rows.filter((row) => !query || String(row.sector || "").toLowerCase().includes(query));
    }, [complianceOverview.sectors, coverageSearch]);
    const complianceSummary = complianceOverview.provincial || {};

    const activeSector = sectorOverview.find((item) => item.sector === selectedSector) || null;

    const selectedPeriodText = `${quarter} ${year} · ${quarterLabel(quarter)}`;

    const printDashboard = () => {
        const popup = window.open("", "_blank", "width=1200,height=850");
        if (!popup) return;
        const officeRows = leaderboard.map((row) => `
            <tr><td>${escapeHtml(row.office)}</td><td>${row.reportCount}</td><td>${number(row.target)}</td><td>${number(row.actual)}</td><td>${number(row.variance)}</td><td>${safePercent(row.accomplishment)}</td><td>${pesos(row.allocation)}</td><td>${pesos(row.obligations)}</td><td>${safePercent(row.absorptiveCapacity)}</td><td>${safePercent(row.coa)}</td></tr>`).join("");
        popup.document.write(`
            <html><head><title>PPDO Admin Monitoring Dashboard</title>
            <style>@page{size:legal landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#111827;font-size:9px}h1,h2{text-align:center;margin:0}h1{font-size:18px}h2{font-size:11px;font-weight:normal;margin-top:4px}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:14px 0}.card{border:1px solid #cbd5e1;padding:8px}.label{font-size:8px;color:#64748b}.value{font-weight:700;font-size:15px;margin-top:2px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:4px}th{background:#f1f5f9;text-align:center}.section{margin-top:14px;font-size:12px;font-weight:700}</style></head>
            <body><h1>PROVINCIAL PLANNING AND DEVELOPMENT OFFICE</h1><h2>ADMIN MONITORING DASHBOARD — ${escapeHtml(selectedPeriodText)}</h2>
            <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
            <div class="grid"><div class="card"><div class="label">Total Submissions</div><div class="value">${stats.totalSubmissions || 0}</div></div><div class="card"><div class="label">Pending Action</div><div class="value">${stats.pendingReviews || 0}</div></div><div class="card"><div class="label">Approved / Validated</div><div class="value">${stats.approvedItems || 0}</div></div><div class="card"><div class="label">Returned / Denied</div><div class="value">${stats.returnedItems || 0}</div></div><div class="card"><div class="label">Offices Reporting</div><div class="value">${stats.officesReporting || 0}/${dashboard?.totalDepartments || 0}</div></div><div class="card"><div class="label">Active Users</div><div class="value">${dashboard?.totalEmployees || 0}</div></div></div>
            <div class="section">Physical & Financial Overview</div>
            <table><tr><th>Target Output</th><th>Actual Output</th><th>Physical Variance</th><th>Allocation Released</th><th>Actual Obligations</th><th>Financial Variance</th><th>Absorptive Capacity</th></tr><tr><td>${number(financial.target)}</td><td>${number(financial.actual)}</td><td>${number(financial.variance)}</td><td>${pesos(financial.allocation)}</td><td>${pesos(financial.obligations)}</td><td>${pesos(financial.financialVariance)}</td><td>${safePercent(financial.absorptiveCapacity)}</td></tr></table>
            <div class="section">Office Performance</div><table><tr><th>Office</th><th>Reports</th><th>Target</th><th>Actual</th><th>Variance</th><th>% Accomp.</th><th>Allocation</th><th>Obligations</th><th>Absorptive</th><th>COA</th></tr>${officeRows || '<tr><td colspan="10">No LBAC 5 office data.</td></tr>'}</table>
            </body></html>`);
        popup.document.close();
        popup.onload = () => popup.print();
    };

    if (loading) return <DashboardLoading />;

    return (
        <div className="animate-fade-in space-y-5 pb-10">
            <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-bold tracking-[0.14em] text-indigo-700">PPDO MONITORING DIVISION</p>
                        <h1 className="page-title mt-1">Administration Monitoring Dashboard</h1>
                        <p className="page-subtitle">One live view of offices, submissions, physical output, financial use, approvals, and reporting activity.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => loadDashboard({ silent: true })} className="btn-secondary inline-flex items-center gap-2">
                            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button type="button" onClick={printDashboard} className="btn-secondary inline-flex items-center gap-2">
                            <Printer size={16} /> Print Dashboard
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <FilterSelect value={year} onChange={setYear} ariaLabel="Year" options={YEARS.map((item) => ({ value: item, label: String(item) }))} />
                    <FilterSelect value={quarter} onChange={setQuarter} ariaLabel="Quarter" options={QUARTERS.map((item) => ({ value: item, label: `${item} — ${quarterLabel(item)}` }))} />
                    <FilterSelect value={office} onChange={setOffice} ariaLabel="Office" options={[{ value: "", label: "All Offices" }, ...((dashboard?.options?.offices || []).map((item) => ({ value: item, label: item })))]} />
                    <FilterSelect value={documentType} onChange={setDocumentType} ariaLabel="Monitoring source" options={DOCUMENT_TYPES} />
                    <FilterSelect value={status} onChange={setStatus} ariaLabel="Status" options={STATUS_OPTIONS} />
                </div>
            </header>

            {hasFilters && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-800">
                    <Filter size={14} /><span className="font-semibold">Filtered:</span>
                    {office && <FilterChip label={office} />}
                    {documentType && <FilterChip label={DOCUMENT_TYPES.find((item) => item.value === documentType)?.label || documentType} />}
                    {status && <FilterChip label={STATUS_OPTIONS.find((item) => item.value === status)?.label || status} />}
                    <button type="button" onClick={clearFilters} className="ml-auto font-semibold text-indigo-700 hover:underline">Clear filters</button>
                </div>
            )}

            {error && (
                <div className="card flex items-start gap-3 border-rose-200 bg-rose-50 p-4">
                    <AlertCircle className="mt-0.5 text-rose-600" size={18} />
                    <div><p className="font-semibold text-rose-900">Dashboard unavailable</p><p className="mt-1 text-sm text-rose-700">{error}</p></div>
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <StatCard label="Total Submissions" value={stats.totalSubmissions} description="All monitoring sources" icon={FileText} iconClass="bg-indigo-50 text-indigo-600" />
                <StatCard label="Pending Action" value={stats.pendingReviews} description="Needs PPDO attention" icon={Clock3} iconClass="bg-amber-50 text-amber-600" />
                <StatCard label="Approved / Validated" value={stats.approvedItems} description="Accepted records" icon={CheckCircle2} iconClass="bg-emerald-50 text-emerald-600" />
                <StatCard label="Returned / Denied" value={stats.returnedItems} description="Needs correction" icon={RotateCcw} iconClass="bg-rose-50 text-rose-600" />
                <StatCard label="Offices Reporting" value={`${stats.officesReporting || 0}/${dashboard?.totalDepartments || 0}`} description="For selected period" icon={Building2} iconClass="bg-violet-50 text-violet-600" />
                <StatCard label="Active Users" value={dashboard?.totalEmployees || 0} description="Active accounts" icon={Users} iconClass="bg-sky-50 text-sky-600" />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr_1fr]">
                <div className="card p-5">
                    <SectionTitle icon={BarChart3} title="Monitoring Sources" subtitle={`Records inside ${selectedPeriodText}.`} />
                    <div className="mt-5 space-y-3">
                        <SourceRow label="Document Submissions" total={documents.all} pending={documents.pending} approved={documents.approved} returned={documents.returned} />
                        <SourceRow label="LBAC Form 3 — Physical" total={physical.lbac3} pending={physical.pending} approved={physical.approved} returned={physical.denied} />
                        <SourceRow label="LBAC Form 5 — Evaluation" total={physical.lbac5} pending={physical.pending} approved={physical.approved} returned={physical.denied} />
                        <SourceRow label="Office Performance" total={performance.all} pending={performance.pending} approved={performance.approved} returned={performance.denied} />
                    </div>
                </div>

                <div className="card p-5">
                    <SectionTitle icon={ShieldCheck} title="Workflow Control" subtitle="Where the records currently are." />
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <WorkflowMetric label="Pending / In Review" value={workflow.pending} tone="amber" />
                        <WorkflowMetric label="For PPDO Review" value={workflow.forPPDOReview} tone="indigo" />
                        <WorkflowMetric label="Approved by Head" value={workflow.forHeadApproval} tone="violet" />
                        <WorkflowMetric label="Approved / Validated" value={workflow.approved} tone="emerald" />
                    </div>
                    <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Correction queue</p>
                        <p className="mt-1 text-2xl font-bold text-rose-900">{workflow.returned || 0}</p>
                        <p className="text-xs text-rose-700">Returned / denied records</p>
                    </div>
                </div>

                <div className="card p-5">
                    <SectionTitle icon={Wallet} title="Physical & Financial Pulse" subtitle="Saved LBAC 5 data for the selected scope." />
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <MetricBox label="Target Output" value={number(financial.target)} />
                        <MetricBox label="Actual Output" value={number(financial.actual)} />
                        <MetricBox label="Physical Variance" value={number(financial.variance)} tone={financial.variance < 0 ? "rose" : "emerald"} />
                        <MetricBox label="COA Average" value={safePercent((leaderboard.reduce((sum, row) => sum + Number(row.coa || 0), 0) / Math.max(leaderboard.length, 1)))} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Allocation Released</span><span className="font-semibold">{pesos(financial.allocation)}</span></div>
                        <div className="mt-2 flex items-center justify-between text-sm"><span className="text-slate-500">Actual Obligations</span><span className="font-semibold">{pesos(financial.obligations)}</span></div>
                        <div className="mt-2 flex items-center justify-between text-sm"><span className="text-slate-500">Financial Variance</span><span className={`font-semibold ${financial.financialVariance < 0 ? "text-rose-600" : "text-emerald-600"}`}>{pesos(financial.financialVariance)}</span></div>
                        <div className="mt-2 flex items-center justify-between text-sm"><span className="text-slate-500">Absorptive Capacity</span><span className="font-semibold">{safePercent(financial.absorptiveCapacity)}</span></div>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                <div className="card p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Provincial Monitoring Overview</p><h2 className="mt-1 text-xl font-bold text-slate-900">{selectedPeriodText}</h2><p className="mt-1 text-xs text-slate-500">One view of how the selected quarter is progressing across all offices.</p></div>
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-right"><p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Office coverage</p><p className="mt-1 text-xl font-bold text-indigo-900">{dashboard?.provincialOverview?.reporting || 0}/{dashboard?.provincialOverview?.totalOffices || dashboard?.totalDepartments || 0}</p></div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <MetricBox label="Validated" value={dashboard?.provincialOverview?.validated || 0} tone="emerald" />
                        <MetricBox label="For Action" value={(dashboard?.provincialOverview?.forReview || 0)} tone="amber" />
                        <MetricBox label="Returned" value={dashboard?.provincialOverview?.returned || 0} tone="rose" />
                        <MetricBox label="Not Started" value={dashboard?.provincialOverview?.notStarted || 0} />
                        <MetricBox label="Target Output" value={number(financial.target)} />
                        <MetricBox label="Actual Output" value={number(financial.actual)} />
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                            {QUARTERS.map((q) => { const active = q === quarter; const present = (dashboard?.quarterMatrix || []).filter((row) => Number(row?.[q]?.count || 0) > 0).length; return <span key={q} className={`rounded-full border px-3 py-1.5 ${active ? "border-indigo-300 bg-indigo-100 text-indigo-800" : "border-slate-200 bg-white text-slate-500"}`}>{q} · {present}/{dashboard?.totalDepartments || 0} reporting</span>; })}
                        </div>
                    </div>
                </div>

                <div className="card overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Sector Action Snapshot</h2><p className="mt-1 text-xs text-slate-500">See which sectors need attention without opening the office register.</p></div><Building2 className="text-indigo-600" size={19} /></div></div>
                    <div className="divide-y divide-slate-100">
                        {sectorOverview.map((row) => <SectorActionRow key={row.sector} row={row} onView={() => { setSelectedSector(row.sector); requestAnimationFrame(() => document.getElementById("sector-office-drilldown")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} />)}
                        {!sectorOverview.length ? <EmptyState text="No sector data for the selected period." /> : null}
                    </div>
                </div>
            </section>

            <section className="card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Building2 size={19} /></div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Provincial Overview</p>
                                <h2 className="mt-1 text-xl font-bold text-slate-900">Sector Monitoring Overview</h2>
                                <p className="mt-1 max-w-2xl text-xs text-slate-500">A compact view of the province by sector. Open a sector only when you need the individual offices.</p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Current period</p>
                            <p className="mt-1 font-bold text-slate-900">{selectedPeriodText}</p>
                        </div>
                    </div>
                </div>
                <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">
                    {sectorOverview.map((sector) => {
                        const active = selectedSector === sector.sector;
                        return <button key={sector.sector} type="button" onClick={() => { setSelectedSector(active ? "" : sector.sector); requestAnimationFrame(() => document.getElementById("sector-office-drilldown")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className={`rounded-2xl border p-4 text-left transition ${active ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"}`}>
                            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold leading-snug text-slate-900">{sector.sector}</p><p className="mt-1 text-[11px] text-slate-500">{sector.offices} offices</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-indigo-700">{Math.round(sector.completion)}%</span></div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(sector.completion, 100)}%` }} /></div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><p className="text-slate-400">Reporting</p><p className="font-bold text-slate-800">{sector.reporting}</p></div><div><p className="text-slate-400">Validated</p><p className="font-bold text-emerald-700">{sector.validated}</p></div><div><p className="text-slate-400">Action</p><p className="font-bold text-amber-700">{sector.forAction}</p></div></div>
                        </button>;
                    })}
                </div>
                <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full min-w-[1080px] text-sm">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 text-left">Sector</th><th className="px-4 py-3 text-center">Offices</th><th className="px-4 py-3 text-center">Reporting</th><th className="px-4 py-3 text-right">Target</th><th className="px-4 py-3 text-right">Actual</th><th className="px-4 py-3 text-right">Variance</th><th className="px-4 py-3 text-right">Physical %</th><th className="px-4 py-3 text-right">Financial %</th><th className="px-4 py-3 text-right">COA</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {sectorOverview.map((row) => <SectorOverviewRow key={row.sector} row={row} active={selectedSector === row.sector} onView={() => setSelectedSector(row.sector)} />)}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Reporting Compliance</p>
                            <h2 className="mt-1 text-xl font-bold text-slate-900">Sector Compliance — LBAC 3 + LBAC 5</h2>
                            <p className="mt-1 max-w-3xl text-xs text-slate-500">One compact province-wide view. An office is complete for a quarter only when its LBAC Form 3 and paired LBAC Form 5 are both present. Expand a sector to inspect offices.</p>
                        </div>
                        <label className="flex min-w-[230px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"><Search size={15} className="text-slate-400" /><input value={coverageSearch} onChange={(e) => setCoverageSearch(e.target.value)} placeholder="Find a sector..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></label>
                    </div>
                </div>
                <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-6">
                    <CoverageSummary label="Provincial Compliance" value={`${number(complianceSummary.compliancePct, 1)}%`} tone="blue" />
                    <CoverageSummary label="Complete Quarter Checks" value={`${complianceSummary.complete || 0}/${complianceSummary.expected || 0}`} tone="emerald" />
                    <CoverageSummary label="Overdue" value={complianceSummary.deadlineSummary?.OVERDUE || 0} tone="rose" />
                    <CoverageSummary label="Due Soon" value={complianceSummary.deadlineSummary?.DUE_SOON || 0} tone="amber" />
                    <CoverageSummary label="Not Yet Due" value={complianceSummary.deadlineSummary?.NOT_YET_DUE || 0} tone="blue" />
                    <CoverageSummary label="Validated" value={complianceSummary.deadlineSummary?.VALIDATED || 0} tone="emerald" />
                </div>
                <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3 text-[10px] font-semibold text-slate-500">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">Validated</span>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">In Review</span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">Due Soon</span>
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">Overdue</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-500">Not Yet Due</span>
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-700">Partial / Returned</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px] text-sm">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 text-left">Sector</th>{QUARTERS.map((q) => <th key={q} className="px-4 py-3 text-center"><div>{q}</div><span className="font-normal normal-case text-slate-400">{quarterLabel(q)}</span></th>)}<th className="px-4 py-3 text-center">Overall</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {complianceSectors.map((row) => <ComplianceSectorRow key={row.sector} row={row} active={selectedSector === row.sector} onSelect={() => setSelectedSector(row.sector)} />)}
                            {!complianceSectors.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No sector compliance data matches your search.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <section id="sector-office-drilldown" className="card overflow-hidden scroll-mt-6">
                <div className="border-b border-slate-100 px-5 py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Drilldown</p><h2 className="mt-1 text-xl font-bold text-slate-900">{activeSector ? activeSector.sector : "Select a sector"}</h2><p className="mt-1 text-xs text-slate-500">{activeSector ? `Showing ${activeSector.offices} offices in this sector. Detailed records stay hidden until needed.` : "Select a sector above to inspect its offices."}</p></div>
                        {activeSector ? <button type="button" onClick={() => setSelectedSector("")} className="btn-secondary">Close</button> : null}
                    </div>
                </div>
                {activeSector ? <div className="divide-y divide-slate-100">
                    {activeSector.officeRows.filter((row) => !coverageSearch.trim() || row.office.toLowerCase().includes(coverageSearch.trim().toLowerCase())).map((row) => <SectorOfficeRow key={row.office} row={row} onView={() => navigate(`/physical-reports?office=${encodeURIComponent(row.office)}`)} />)}
                </div> : <div className="px-5 py-10 text-center text-sm text-slate-400">Choose one of the sector cards or click <span className="font-semibold text-indigo-600">View offices</span> in the sector table.</div>}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <div className="card p-5">
                    <SectionTitle icon={CalendarDays} title="Action Center" subtitle="Tasks, activities, and quarter dates that need attention." />
                    <div className="mt-5 space-y-4">
                        <ComplianceAlertGroup alerts={complianceAlerts} onOpen={(officeName) => navigate(`/physical-reports?office=${encodeURIComponent(officeName)}&quarter=${encodeURIComponent(quarter)}&year=${encodeURIComponent(year)}`)} />
                        <ActionGroup title="Upcoming Tasks" icon={Clock3} items={(actionCenter.upcomingTasks || []).map((item) => ({ title: item.title, meta: `${item.office} · ${item.quarter || "General"} · due ${formatDate(item.dueDate)}` }))} />
                        <ActionGroup title="Calendar Activities" icon={CalendarDays} items={(actionCenter.upcomingActivities || []).map((item) => ({ title: item.title, meta: `${formatDateTime(item.startAt)}${item.location ? ` · ${item.location}` : ""}` }))} />
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quarter Schedule</p><div className="mt-2 grid grid-cols-2 gap-2">{(actionCenter.quarterSchedule || []).map((item) => <div key={item.quarter} className="rounded-xl bg-white p-3 shadow-sm"><p className="font-semibold text-slate-800">{item.quarter}</p><p className="mt-1 text-[11px] text-slate-500">Open: {formatDate(item.openAt)}</p><p className="text-[11px] text-slate-500">Close: {formatDate(item.closeAt)}</p></div>)}{!(actionCenter.quarterSchedule || []).length && <p className="col-span-2 text-xs text-slate-400">No quarter schedule configured yet.</p>}</div></div>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
                <div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Sector Reporting Pulse</h2><p className="mt-1 text-xs text-slate-500">Compact reporting and performance view by sector.</p></div><TrendingUp className="text-indigo-600" size={19} /></div><div className="divide-y divide-slate-100">{sectorOverview.map((row) => <SectorPulseRow key={row.sector} row={row} onView={() => setSelectedSector(row.sector)} />)}</div></div>
                <div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Recent Monitoring Activity</h2><p className="mt-1 text-xs text-slate-500">Latest changes across the monitored system.</p></div><Activity className="text-indigo-600" size={19} /></div><div className="divide-y divide-slate-100">{(dashboard?.recentActivity || []).length ? dashboard.recentActivity.map((item) => <RecentRow key={`${item.type}-${item.id}`} item={item} />) : <EmptyState text="No recent activity for the selected scope." />}</div></div>
            </section>
        </div>
    );
}

function DashboardLoading() {
    return <div className="space-y-5 pb-8 animate-fade-in"><div className="h-40 animate-pulse rounded-3xl bg-slate-100" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className="card h-28 animate-pulse bg-slate-100" />)}</div><div className="grid gap-5 xl:grid-cols-3"><div className="card h-80 animate-pulse bg-slate-100" /><div className="card h-80 animate-pulse bg-slate-100" /><div className="card h-80 animate-pulse bg-slate-100" /></div></div>;
}

function StatCard({ label, value, description, icon: Icon, iconClass }) {
    return <div className="card p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value ?? 0}</p></div><div className={`rounded-xl p-2.5 ${iconClass}`}><Icon size={18} /></div></div><p className="mt-3 text-xs text-slate-400">{description}</p></div>;
}

function SectionTitle({ icon: Icon, title, subtitle }) {
    return <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><Icon size={19} className="shrink-0 text-indigo-600" /></div>;
}

function FilterSelect({ value, onChange, options, ariaLabel }) {
    return <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm"><ChevronDown size={15} className="shrink-0 text-slate-400" /><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none">{options.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</select></label>;
}

function FilterChip({ label }) { return <span className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 font-medium">{label}</span>; }

function SourceRow({ label, total, pending, approved, returned }) {
    const totalNumber = Number(total || 0);
    const pendingNumber = Number(pending || 0);
    const approvedNumber = Number(approved || 0);
    const returnedNumber = Number(returned || 0);
    return <div className="rounded-2xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-800">{label}</span><span className="text-lg font-bold text-slate-950">{totalNumber}</span></div><div className="mt-2 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Pending {pendingNumber}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Approved {approvedNumber}</span><span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">Returned {returnedNumber}</span></div></div>;
}

function WorkflowMetric({ label, value, tone }) {
    return <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}><p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p><p className="mt-1 text-2xl font-bold">{value || 0}</p></div>;
}

function MetricBox({ label, value, tone = "slate" }) {
    const classes = tone === "rose" ? "border-rose-100 bg-rose-50 text-rose-900" : tone === "emerald" ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-900";
    return <div className={`rounded-2xl border p-3 ${classes}`}><p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>;
}

function CoverageSummary({ label, value, tone }) {
    const toneMap = { emerald: "border-emerald-100 bg-emerald-50 text-emerald-700", blue: "border-blue-100 bg-blue-50 text-blue-700", amber: "border-amber-100 bg-amber-50 text-amber-700", rose: "border-rose-100 bg-rose-50 text-rose-700" };
    return <div className={`rounded-xl border px-3 py-2.5 ${toneMap[tone]}`}><p className="text-[10px] font-bold uppercase tracking-wide opacity-75">{label}</p><p className="mt-0.5 text-xl font-bold">{value}</p></div>;
}



function sectorStatus(row) {
    if (row.validated >= row.reporting && row.reporting > 0) return ["Validated", "border-emerald-200 bg-emerald-50 text-emerald-700"];
    if (row.forAction > 0) return ["Needs Action", "border-amber-200 bg-amber-50 text-amber-700"];
    if (row.returned > 0) return ["Returned", "border-rose-200 bg-rose-50 text-rose-700"];
    if (row.reporting > 0) return ["In Progress", "border-indigo-200 bg-indigo-50 text-indigo-700"];
    return ["Not Started", "border-slate-200 bg-slate-100 text-slate-600"];
}

function SectorOverviewRow({ row, active, onView }) {
    const [label, classes] = sectorStatus(row);
    return <tr className={`group ${active ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
        <td className="px-5 py-4"><p className="font-bold text-slate-900">{row.sector}</p><p className="mt-0.5 text-[11px] text-slate-500">{row.validated} validated · {row.forAction} for action · {row.returned} returned</p></td>
        <td className="px-4 py-4 text-center font-semibold">{row.offices}</td>
        <td className="px-4 py-4 text-center"><span className="font-semibold">{row.reporting}</span><span className="text-slate-400"> / {row.offices}</span></td>
        <td className="px-4 py-4 text-right">{row.target ? number(row.target) : "—"}</td>
        <td className="px-4 py-4 text-right">{row.actual ? number(row.actual) : "—"}</td>
        <td className={`px-4 py-4 text-right font-semibold ${row.variance < 0 ? "text-rose-600" : "text-emerald-600"}`}>{row.target || row.actual ? number(row.variance) : "—"}</td>
        <td className="px-4 py-4 text-right font-semibold">{row.target ? safePercent(row.accomplishment) : "—"}</td>
        <td className="px-4 py-4 text-right">{row.allocation ? safePercent(row.absorptiveCapacity) : "—"}</td>
        <td className="px-4 py-4 text-right">{row.reporting ? safePercent(row.coa) : "—"}</td>
        <td className="px-5 py-4 text-right"><div className="flex items-center justify-end gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${classes}`}>{label}</span><button type="button" onClick={onView} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><Eye size={14} /> View offices</button></div></td>
    </tr>;
}

function ComplianceSectorRow({ row, active, onSelect }) {
    const overallClass = row.compliancePct >= 90 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.compliancePct >= 70 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700";
    return <tr className={`group ${active ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
        <td className="px-5 py-4"><button type="button" onClick={onSelect} className="text-left"><p className="font-bold text-slate-900">{row.sector}</p><p className="mt-0.5 text-[11px] text-slate-500">{row.offices} offices · {row.complete} complete · {row.partial} partial · {row.missing} missing</p></button></td>
        {QUARTERS.map((quarter) => <td key={quarter} className="px-3 py-3 text-center"><ComplianceQuarterCell value={row.quarters?.[quarter]} /></td>)}
        <td className="px-4 py-4 text-center"><span className={`inline-flex min-w-[76px] flex-col rounded-xl border px-2.5 py-2 ${overallClass}`}><strong>{number(row.compliancePct, 1)}%</strong><span className="mt-0.5 text-[10px] font-normal">quarter checks</span></span></td>
        <td className="px-5 py-4 text-right"><button type="button" onClick={onSelect} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"><Eye size={14} /> View offices</button></td>
    </tr>;
}

function ComplianceQuarterCell({ value }) {
    const item = value || {};
    if (!item.total) return <span className="inline-flex min-w-[132px] flex-col items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-semibold text-slate-400"><span>—</span><span className="mt-0.5 font-normal">No offices</span></span>;

    const deadline = item.deadlineState;
    const deadlineText = deadline === "OVERDUE"
        ? `Overdue${Math.abs(Number(item.daysRemaining || 0)) ? ` · ${Math.abs(Number(item.daysRemaining))}d` : ""}`
        : deadline === "DUE_SOON"
            ? `Due Soon${Number.isFinite(Number(item.daysRemaining)) ? ` · ${Math.max(Number(item.daysRemaining), 0)}d` : ""}`
            : deadline === "NOT_YET_DUE"
                ? `Not Yet Due${Number.isFinite(Number(item.daysRemaining)) ? ` · ${Math.max(Number(item.daysRemaining), 0)}d` : ""}`
                : deadline === "OPEN"
                    ? `Open${Number.isFinite(Number(item.daysRemaining)) ? ` · ${Math.max(Number(item.daysRemaining), 0)}d` : ""}`
                    : "No Schedule";

    const tone = item.status === "VALIDATED"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : item.status === "IN_REVIEW"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : item.status === "RETURNED"
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : item.status === "PARTIAL"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : deadline === "OVERDUE"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : deadline === "DUE_SOON"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : deadline === "NOT_YET_DUE"
                                ? "border-slate-200 bg-slate-50 text-slate-500"
                                : "border-indigo-200 bg-indigo-50 text-indigo-700";

    const statusLabel = item.status === "VALIDATED"
        ? "Validated"
        : item.status === "IN_REVIEW"
            ? "In Review"
            : item.status === "RETURNED"
                ? "Returned"
                : item.status === "PARTIAL"
                    ? "Partial"
                    : item.status === "SUBMITTED"
                        ? "Submitted"
                        : "Missing";

    return <span title={item.dueDate ? `Due ${formatDate(item.dueDate)}${item.scheduleTitle ? ` · ${item.scheduleTitle}` : ""}` : "No submission schedule configured"} className={`inline-flex min-w-[132px] flex-col items-center rounded-xl border px-2.5 py-2 text-[10px] font-semibold ${tone}`}>
        <span>{statusLabel}</span>
        <span className="mt-0.5 font-normal">{item.status === "VALIDATED" ? `${item.validated}/${item.groups} pair(s)` : item.status === "PARTIAL" ? `${item.completeGroups}/${item.groups} complete` : deadlineText}</span>
        {item.dueDate && item.status !== "VALIDATED" ? <span className="mt-0.5 text-[9px] font-normal opacity-75">Due {formatDate(item.dueDate)}</span> : null}
    </span>;
}


function SectorOfficeRow({ row, onView }) {
    const status = row.status || (row.reportCount ? "REPORTING" : "NOT_STARTED");
    const [label, classes] = statusMapForOffice(status);
    const currentCompliance = row.currentCompliance || null;
    const quarterCells = QUARTERS.map((quarter) => ({ quarter, ...(row.compliance?.quarters?.[quarter] || {}) }));
    const compactState = (item) => {
        if (!item || !item.status) return ["Missing", "border-slate-200 bg-slate-50 text-slate-500"];
        if (item.status === "VALIDATED") return ["Validated", "border-emerald-200 bg-emerald-50 text-emerald-700"];
        if (item.status === "RETURNED") return ["Returned", "border-orange-200 bg-orange-50 text-orange-700"];
        if (item.status === "PARTIAL") return ["Partial", "border-amber-200 bg-amber-50 text-amber-700"];
        if (item.status === "IN_REVIEW") return ["In Review", "border-blue-200 bg-blue-50 text-blue-700"];
        if (item.status === "SUBMITTED") return ["Submitted", "border-indigo-200 bg-indigo-50 text-indigo-700"];
        if (item.deadlineState === "OVERDUE") return ["Overdue", "border-rose-200 bg-rose-50 text-rose-700"];
        if (item.deadlineState === "DUE_SOON") return ["Due Soon", "border-amber-200 bg-amber-50 text-amber-700"];
        if (item.deadlineState === "NOT_YET_DUE") return ["Not Yet Due", "border-slate-200 bg-slate-50 text-slate-500"];
        if (item.deadlineState === "OPEN") return ["Open", "border-indigo-200 bg-indigo-50 text-indigo-700"];
        return ["Missing", "border-slate-200 bg-slate-50 text-slate-500"];
    };
    return <div className="px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 xl:max-w-[38%]">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{row.office}</p><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${classes}`}>{label}</span></div>
                <p className="mt-1 text-xs text-slate-500">Target {row.target ? number(row.target) : "—"} · Actual {row.actual ? number(row.actual) : "—"} · Variance {row.target || row.actual ? number(row.variance) : "—"}</p>
                <p className="mt-1 text-[11px] text-slate-400">Current quarter: {row.reportCount ? `${safePercent(row.accomplishment)} physical` : "No finalized LBAC 5 result"}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 xl:min-w-[520px]">
                {quarterCells.map((item) => {
                    const [state, stateClasses] = compactState(item);
                    return <div key={item.quarter} className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.quarter}</p>
                        <span className={`mt-1 inline-flex max-w-full rounded-full border px-2 py-1 text-[9px] font-bold ${stateClasses}`} title={item.dueDate ? `Due ${formatDate(item.dueDate)}` : state}>{state}</span>
                        <p className="mt-1 text-[9px] text-slate-400">{item.lbac3 || 0} LBAC3 · {item.lbac5 || 0} LBAC5</p>
                        {item.dueDate && !["VALIDATED", "SUBMITTED", "IN_REVIEW"].includes(item.status) ? <p className="text-[9px] text-slate-400">Due {formatDate(item.dueDate)}</p> : null}
                    </div>;
                })}
            </div>
            <button type="button" onClick={onView} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><Eye size={14} /> Open</button>
        </div>
        {currentCompliance ? <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-[10px] sm:grid-cols-4">
            <div><span className="text-slate-400">Pair groups</span><p className="font-bold text-slate-700">{currentCompliance.groups || 0}</p></div>
            <div><span className="text-slate-400">Complete pairs</span><p className="font-bold text-emerald-700">{currentCompliance.completeGroups || 0}</p></div>
            <div><span className="text-slate-400">COA</span><p className="font-bold text-slate-700">{row.reporting ? safePercent(row.coa) : "—"}</p></div>
            <div><span className="text-slate-400">Financial variance</span><p className="font-bold text-slate-700">{row.allocation || row.obligations ? number(row.financialVariance) : "—"}</p></div>
        </div> : null}
    </div>;
}

function statusMapForOffice(status) {
    const map = { VALIDATED: ["Validated", "border-emerald-200 bg-emerald-50 text-emerald-700"], APPROVED: ["Approved", "border-emerald-200 bg-emerald-50 text-emerald-700"], COMPLETED: ["Completed", "border-emerald-200 bg-emerald-50 text-emerald-700"], SUBMITTED: ["Submitted", "border-blue-200 bg-blue-50 text-blue-700"], UNDER_REVIEW: ["Under Review", "border-violet-200 bg-violet-50 text-violet-700"], RESUBMITTED: ["Resubmitted", "border-blue-200 bg-blue-50 text-blue-700"], RETURNED: ["Returned", "border-rose-200 bg-rose-50 text-rose-700"], DENIED: ["Denied", "border-rose-200 bg-rose-50 text-rose-700"], APPROVED_BY_HEAD: ["For PPDO", "border-indigo-200 bg-indigo-50 text-indigo-700"], FOR_PPDO_REVIEW: ["For PPDO", "border-indigo-200 bg-indigo-50 text-indigo-700"], REPORTING: ["Reporting", "border-indigo-200 bg-indigo-50 text-indigo-700"], NOT_STARTED: ["Not Started", "border-slate-200 bg-slate-100 text-slate-500"] };
    return map[status] || map.NOT_STARTED;
}



function ComplianceAlertGroup({ alerts, onOpen }) {
    const meta = {
        OVERDUE: ["Overdue", "border-rose-200 bg-rose-50 text-rose-700"],
        RETURNED: ["Returned", "border-orange-200 bg-orange-50 text-orange-700"],
        PARTIAL: ["Partial", "border-amber-200 bg-amber-50 text-amber-700"],
        DUE_SOON: ["Due Soon", "border-amber-200 bg-amber-50 text-amber-700"],
        IN_REVIEW: ["In Review", "border-blue-200 bg-blue-50 text-blue-700"],
        NO_SCHEDULE: ["No Schedule", "border-slate-200 bg-slate-50 text-slate-600"],
    };
    return <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><AlertCircle size={14} />Compliance Alerts</div>
        {alerts.length ? <div className="space-y-2">
            {alerts.map((item) => {
                const [label, classes] = meta[item.alertState] || meta.NO_SCHEDULE;
                const detail = item.alertState === "OVERDUE"
                    ? `Overdue${Number.isFinite(Number(item.daysRemaining)) ? ` by ${Math.abs(Number(item.daysRemaining))} day(s)` : ""}`
                    : item.alertState === "DUE_SOON"
                        ? `Due in ${Math.max(Number(item.daysRemaining || 0), 0)} day(s)`
                        : item.alertState === "PARTIAL"
                            ? `${item.completeGroups || 0}/${item.groups || 0} report pair(s) complete`
                            : item.alertState === "RETURNED"
                                ? "Returned for correction"
                                : item.alertState === "IN_REVIEW"
                                    ? "Awaiting review"
                                    : "No submission schedule configured";
                return <div key={`${item.office}-${item.quarter}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.office}</p><p className="mt-1 text-[11px] text-slate-500">{item.sector} · {item.quarter} · {detail}{item.dueDate ? ` · due ${formatDate(item.dueDate)}` : ""}</p></div>
                    <div className="flex shrink-0 items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${classes}`}>{label}</span><button type="button" onClick={() => onOpen(item.office)} className="rounded-lg border border-indigo-200 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50">Open</button></div>
                </div>;
            })}
        </div> : <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">No compliance alerts for {quarter}.</div>}
    </div>;
}

function ActionGroup({ title, icon: Icon, items }) {
    return <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Icon size={14} />{title}</div>{items.length ? <div className="space-y-2">{items.slice(0, 4).map((item, index) => <div key={`${title}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-[11px] text-slate-500">{item.meta}</p></div>)}</div> : <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">Nothing scheduled in the next 30 days.</div>}</div>;
}

function SectorActionRow({ row, onView }) {
    const [label, classes] = sectorStatus(row);
    const priority = row.forAction + row.returned;
    return <button type="button" onClick={onView} className="w-full px-5 py-4 text-left transition hover:bg-slate-50">
        <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{row.sector}</p><p className="mt-1 text-[11px] text-slate-500">{row.reporting}/{row.offices} reporting · {row.validated} validated</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${classes}`}>{label}</span></div>
        <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(row.completion, 100)}%` }} /></div><span className="w-10 text-right text-xs font-bold text-indigo-700">{Math.round(row.completion)}%</span></div>
        <div className="mt-2 flex gap-4 text-[10px] text-slate-500"><span>Action <strong className="text-amber-700">{priority}</strong></span><span>Target <strong className="text-slate-700">{row.target ? number(row.target) : "—"}</strong></span><span>Actual <strong className="text-slate-700">{row.actual ? number(row.actual) : "—"}</strong></span></div>
    </button>;
}

function SectorPulseRow({ row, onView }) {
    const performance = row.target > 0 ? row.accomplishment : 0;
    const status = sectorStatus(row);
    return <button type="button" onClick={onView} className="w-full px-5 py-4 text-left transition hover:bg-slate-50">
        <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{row.sector}</p><p className="mt-1 text-[11px] text-slate-500">{row.offices} offices · {row.reporting} reporting · {row.validated} validated</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${status[1]}`}>{status[0]}</span></div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]"><div><p className="text-slate-400">Physical</p><p className="mt-0.5 font-bold text-slate-800">{row.target ? safePercent(performance) : "—"}</p></div><div><p className="text-slate-400">Financial</p><p className="mt-0.5 font-bold text-slate-800">{row.allocation ? safePercent(row.absorptiveCapacity) : "—"}</p></div><div><p className="text-slate-400">COA</p><p className="mt-0.5 font-bold text-slate-800">{row.reporting ? safePercent(row.coa) : "—"}</p></div></div>
    </button>;
}

function RecentRow({ item }) {
    const meta = statusMeta[item.status] || statusMeta.PENDING;
    const Icon = meta.icon;
    return <div className="flex items-center justify-between gap-4 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className={`rounded-lg border p-2 ${toneClasses[meta.tone]}`}><Icon size={15} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{item.office} · {item.category}</p></div></div><div className="shrink-0 text-right"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses[meta.tone]}`}>{meta.label}</span><p className="mt-1 text-[11px] text-slate-400">{formatDate(item.createdAt)}</p></div></div>;
}

function EmptyState({ text }) { return <div className="px-5 py-10 text-center text-sm text-slate-400">{text}</div>; }
