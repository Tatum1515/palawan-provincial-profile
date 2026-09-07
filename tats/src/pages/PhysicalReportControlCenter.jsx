import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, FileWarning, RefreshCw, Save, Search, ShieldCheck, Users, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_LABEL = { Q1: "1st Quarter", Q2: "2nd Quarter", Q3: "3rd Quarter", Q4: "4th Quarter" };
const yearNow = new Date().getFullYear();

const localInput = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const stateMeta = {
    OPEN: { label: "Open", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    UPCOMING: { label: "Upcoming", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    CLOSED: { label: "Closed", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    DISABLED: { label: "Disabled", cls: "bg-slate-100 text-slate-600 border-slate-200" },
    NOT_CONFIGURED: { label: "Not configured", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function PhysicalReportControlCenter() {
    const [year, setYear] = useState(yearNow);
    const [schedules, setSchedules] = useState([]);
    const [compliance, setCompliance] = useState([]);
    const [quality, setQuality] = useState({ issues: [], count: 0 });
    const [audit, setAudit] = useState([]);
    const [validationQueue, setValidationQueue] = useState([]);
    const [validatingId, setValidatingId] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingQuarter, setSavingQuarter] = useState("");
    const [error, setError] = useState("");
    const [complianceSearch, setComplianceSearch] = useState("");
    const [expandedSectors, setExpandedSectors] = useState(() => new Set());

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [scheduleRes, complianceRes, qualityRes, auditRes, validationRes] = await Promise.all([
                api.get("/physical-report-admin/schedules", { params: { year } }),
                api.get("/physical-report-admin/compliance", { params: { year } }),
                api.get("/physical-report-admin/quality", { params: { year } }),
                api.get("/physical-report-admin/audit", { params: { year, limit: 100 } }),
                api.get("/physical-report-admin/validation-queue", { params: { year } }),
            ]);
            setSchedules(Array.isArray(scheduleRes.data?.schedules) ? scheduleRes.data.schedules : []);
            setCompliance(Array.isArray(complianceRes.data?.data) ? complianceRes.data.data : []);
            setQuality({
                count: Number(qualityRes.data?.count || 0),
                issues: Array.isArray(qualityRes.data?.issues) ? qualityRes.data.issues : [],
            });
            setAudit(Array.isArray(auditRes.data?.data) ? auditRes.data.data : []);
            setValidationQueue(Array.isArray(validationRes.data?.data) ? validationRes.data.data : []);
        } catch (requestError) {
            setError(requestError?.response?.data?.error || "Unable to load Physical Report control data.");
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => {
        // Intentional API synchronization: the effect loads external data into local state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    const updateSchedule = (quarter, field, value) => {
        setSchedules((items) => items.map((item) => item.quarter === quarter ? { ...item, [field]: value } : item));
    };

    const saveSchedule = async (schedule) => {
        if (!schedule.openAt || !schedule.closeAt) {
            toast.error(`${schedule.quarter}: open and close date/time are required.`);
            return;
        }
        if (new Date(schedule.closeAt) <= new Date(schedule.openAt)) {
            toast.error(`${schedule.quarter}: close date/time must be later than open date/time.`);
            return;
        }
        setSavingQuarter(schedule.quarter);
        try {
            await api.put(`/physical-report-admin/schedules/${year}/${schedule.quarter}`, {
                openAt: fromLocalInput(schedule.openAt),
                closeAt: fromLocalInput(schedule.closeAt),
                enabled: schedule.enabled !== false,
                notes: schedule.notes || "",
            });
            toast.success(`${schedule.quarter} ${year} input window saved.`);
            await load();
        } catch (requestError) {
            toast.error(requestError?.response?.data?.error || `Unable to save ${schedule.quarter}.`);
        } finally {
            setSavingQuarter("");
        }
    };

    const validateReport = async (item) => {
        if (!window.confirm(`Validate ${item.reportTitle} — ${item.office} — ${item.quarter} ${item.year}? This will freeze the approved report pair.`)) return;
        setValidatingId(item.id);
        try {
            await api.patch(`/physical-reports/${item.id}/validate`);
            toast.success(`${item.reportTitle} ${item.quarter} validated and frozen.`);
            await load();
        } catch (requestError) {
            toast.error(requestError?.response?.data?.error || "Unable to validate report.");
        } finally {
            setValidatingId("");
        }
    };

    const summary = useMemo(() => ({
        complete: compliance.filter((row) => row.overall === "COMPLETE").length,
        attention: compliance.filter((row) => row.overall === "NEEDS_ACTION").length,
        openWindows: schedules.filter((row) => row.state === "OPEN").length,
        qualityErrors: quality.issues.filter((item) => item.severity === "ERROR").length,
        validation: validationQueue.length,
    }), [compliance, quality.issues, schedules, validationQueue.length]);

    const sectorCompliance = useMemo(() => {
        const query = complianceSearch.trim().toLowerCase();
        const filtered = compliance.filter((row) => !query || `${row.office} ${row.sector}`.toLowerCase().includes(query));
        const groups = new Map();
        filtered.forEach((row) => {
            const sector = row.sector || "Unassigned Sector";
            if (!groups.has(sector)) groups.set(sector, []);
            groups.get(sector).push(row);
        });
        return Array.from(groups.entries()).map(([sector, offices]) => {
            const quarterStats = Object.fromEntries(QUARTERS.map((q) => {
                const rows = offices.map((office) => office.quarters?.[q]).filter(Boolean);
                const complete = rows.filter((item) => item.LBAC3?.exists && item.LBAC5?.exists && ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(item.LBAC3.status) && ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(item.LBAC5.status)).length;
                const active = rows.filter((item) => item.LBAC3?.exists || item.LBAC5?.exists).length;
                return [q, { complete, active, total: offices.length }];
            }));
            const complete = offices.filter((row) => row.overall === "COMPLETE").length;
            const attention = offices.filter((row) => row.overall === "NEEDS_ACTION").length;
            return { sector, offices, quarterStats, complete, attention, completion: offices.length ? Math.round((complete / offices.length) * 100) : 0 };
        }).sort((a, b) => a.sector.localeCompare(b.sector));
    }, [compliance, complianceSearch]);

    const toggleSector = (sector) => setExpandedSectors((current) => {
        const next = new Set(current);
        if (next.has(sector)) next.delete(sector); else next.add(sector);
        return next;
    });

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">PPDO Monitoring Division</p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">Physical Report Control Center</h1>
                    <p className="mt-2 max-w-4xl text-sm text-slate-500">Configure quarter input windows, monitor office compliance, inspect data quality, and review the audit trail from one administrative workspace.</p>
                </div>
                <div className="flex gap-2">
                    <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value) || yearNow)} className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold shadow-sm" />
                    <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><RefreshCw size={16} /> Refresh</button>
                </div>
            </div>

            {error && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertTriangle size={18} className="mt-0.5" /><div><p className="font-semibold">Control Center could not load</p><p>{error}</p></div></div>}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={CalendarClock} label="Open input windows" value={summary.openWindows} tone="indigo" />
                <MetricCard icon={CheckCircle2} label="Complete offices" value={summary.complete} tone="emerald" />
                <MetricCard icon={AlertTriangle} label="Offices needing action" value={summary.attention} tone="amber" />
                <MetricCard icon={FileWarning} label="Quality issues" value={quality.count} tone="rose" sub={summary.qualityErrors ? `${summary.qualityErrors} error(s)` : "No blocking errors"} />
                <MetricCard icon={ClipboardCheck} label="For validation" value={summary.validation} tone="indigo" sub="Approval Head approved" />
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5"><div className="flex items-center gap-3"><CalendarClock className="text-indigo-600" size={21} /><div><h2 className="font-bold text-slate-900">Quarterly User Input Windows</h2><p className="text-sm text-slate-500">These dates are controlled by Admin and are the only dates when Office Users can enter quarterly Actual Output.</p></div></div></div>
                <div className="grid gap-4 p-5 xl:grid-cols-2">
                    {schedules.map((schedule) => {
                        const meta = stateMeta[schedule.state] || stateMeta.NOT_CONFIGURED;
                        return <article key={schedule.quarter} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{QUARTER_LABEL[schedule.quarter]}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{schedule.quarter} {year}</h3></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${meta.cls}`}>{meta.label}</span></div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Open date & time</span><input type="datetime-local" value={localInput(schedule.openAt)} onChange={(e) => updateSchedule(schedule.quarter, "openAt", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Close date & time</span><input type="datetime-local" value={localInput(schedule.closeAt)} onChange={(e) => updateSchedule(schedule.quarter, "closeAt", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label></div>
                            <div className="mt-3"><label className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={schedule.enabled !== false} onChange={(e) => updateSchedule(schedule.quarter, "enabled", e.target.checked)} className="h-4 w-4" /> Office input enabled for this window</label></div>
                            <div className="mt-3"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Admin note</span><textarea rows="2" value={schedule.notes || ""} onChange={(e) => updateSchedule(schedule.quarter, "notes", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Optional instruction to office users" /></label></div>
                            <div className="mt-4 flex justify-end"><button type="button" disabled={savingQuarter === schedule.quarter} onClick={() => saveSchedule(schedule)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Save size={16} />{savingQuarter === schedule.quarter ? "Saving..." : "Save Window"}</button></div>
                        </article>;
                    })}
                    {!schedules.length && !loading && <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 xl:col-span-2">No quarter schedule records yet. Configure the four windows above to enable office input.</p>}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5"><div className="flex items-center gap-3"><ClipboardCheck className="text-indigo-600" size={21} /><div><h2 className="font-bold text-slate-900">Admin Validation Queue</h2><p className="text-sm text-slate-500">These reports were approved by the Approval Head and are waiting for PPDO/Admin validation. Validation freezes the quarter.</p></div></div></div>
                <div className="overflow-x-auto">
                    <table className="min-w-[1050px] w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 text-left">Office</th><th className="px-4 py-3 text-left">Report</th><th className="px-4 py-3 text-center">Quarter</th><th className="px-4 py-3 text-left">Approval Head</th><th className="px-4 py-3 text-center">PPA Rows</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                        <tbody>
                            {validationQueue.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3"><p className="font-semibold text-slate-800">{item.office}</p><p className="text-xs text-slate-400">{item.sector}</p></td><td className="px-4 py-3"><p className="font-semibold text-slate-800">{item.reportTitle}</p><p className="text-xs text-slate-400">{item.year} · {item.reportGroupId ? "Paired LBAC 3/5" : "Legacy report"}</p></td><td className="px-4 py-3 text-center font-bold text-slate-700">{item.quarter}</td><td className="px-4 py-3 text-slate-600">{item.approvalHead}</td><td className="px-4 py-3 text-center text-slate-600">{item.ppaCount}</td><td className="px-4 py-3 text-center"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.status.replaceAll("_", " ")}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => validateReport(item)} disabled={validatingId === item.id} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"><CheckCircle2 size={15} />{validatingId === item.id ? "Validating..." : "Validate & Freeze"}</button></td></tr>)}
                            {!validationQueue.length && !loading && <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">No approved Physical Reports are waiting for validation.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <ComplianceSection year={year} compliance={compliance} loading={loading} />

            <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-indigo-600" size={21} /><div><h2 className="font-bold text-slate-900">Data Quality Center</h2><p className="text-sm text-slate-500">Catch missing fields, broken LBAC 3 → LBAC 5 links, and invalid weights before they reach the final summary.</p></div></div></div>
                    <div className="max-h-[460px] overflow-y-auto p-4 space-y-2">{quality.issues.length ? quality.issues.map((issue, index) => <div key={`${issue.office}-${issue.quarter}-${index}`} className={`rounded-2xl border p-3 ${issue.severity === "ERROR" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-start gap-3"><div className={`mt-0.5 rounded-full p-1.5 ${issue.severity === "ERROR" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>{issue.severity === "ERROR" ? <XCircle size={15} /> : <AlertTriangle size={15} />}</div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{issue.office} · {issue.quarter} · {issue.form}</p><p className="mt-1 text-sm font-semibold text-slate-800">{issue.message}</p></div></div></div>) : <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-center text-sm font-semibold text-emerald-700"><CheckCircle2 className="mx-auto mb-2" size={22} />No data quality issues detected.</div>}</div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5"><div className="flex items-center gap-3"><ClipboardCheck className="text-indigo-600" size={21} /><div><h2 className="font-bold text-slate-900">Audit Trail</h2><p className="text-sm text-slate-500">Who changed what, when, and for which office or quarter.</p></div></div></div>
                    <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">{audit.map((item) => <div key={item.id} className="px-5 py-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-800">{item.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{item.userName || "System"} · {item.office || item.quarter || "Physical Reports"}</p></div><p className="text-[11px] text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</p></div></div>)}{!audit.length && !loading && <div className="p-8 text-center text-sm text-slate-500">No audit events yet.</div>}</div>
                </section>
            </div>
        </div>
    );
}

function ComplianceSection({ year, compliance, loading }) {
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState(() => new Set());
    const groups = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = compliance.filter((row) => !query || `${row.office} ${row.sector}`.toLowerCase().includes(query));
        const map = new Map();
        filtered.forEach((row) => {
            const sector = row.sector || "Unassigned Sector";
            if (!map.has(sector)) map.set(sector, []);
            map.get(sector).push(row);
        });
        return Array.from(map.entries()).map(([sector, offices]) => {
            const quarterStats = Object.fromEntries(QUARTERS.map((q) => {
                const complete = offices.filter((office) => {
                    const item = office.quarters?.[q];
                    return item?.LBAC3?.exists && item?.LBAC5?.exists &&
                        ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(item.LBAC3.status) &&
                        ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(item.LBAC5.status);
                }).length;
                return [q, { complete, total: offices.length }];
            }));
            const complete = offices.filter((row) => row.overall === "COMPLETE").length;
            const attention = offices.filter((row) => row.overall === "NEEDS_ACTION").length;
            return { sector, offices, quarterStats, complete, attention, completion: offices.length ? Math.round((complete / offices.length) * 100) : 0 };
        }).sort((a, b) => a.sector.localeCompare(b.sector));
    }, [compliance, search]);
    const toggle = (sector) => setExpanded((current) => {
        const next = new Set(current);
        if (next.has(sector)) next.delete(sector); else next.add(sector);
        return next;
    });
    return <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3"><Users className="text-indigo-600" size={21} /><div><h2 className="font-bold text-slate-900">Office Compliance — {year}</h2><p className="text-sm text-slate-500">Sector overview first. Expand a sector only when you need the individual offices.</p></div></div>
            <div className="relative w-full lg:w-72"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} className="field-input pl-9" placeholder="Search sector or office..." /></div>
        </div>
        <div className="overflow-x-auto p-4"><table className="min-w-[1050px] w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-10 px-3 py-3"></th><th className="px-4 py-3 text-left">Sector</th>{QUARTERS.map((q) => <th key={q} className="px-4 py-3 text-center">{q}</th>)}<th className="px-4 py-3 text-center">Overall</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody>
                {groups.map((group) => {
                    const isExpanded = expanded.has(group.sector);
                    return <Fragment key={group.sector}>
                        <tr className="border-t border-slate-100 hover:bg-slate-50/70">
                            <td className="px-3 py-4 text-center"><button type="button" onClick={() => toggle(group.sector)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-indigo-600">{isExpanded ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}</button></td>
                            <td className="px-4 py-4"><p className="font-bold text-slate-900">{group.sector}</p><p className="mt-0.5 text-xs text-slate-500">{group.offices.length} office{group.offices.length === 1 ? "" : "s"} · {group.complete} complete · {group.attention} need attention</p></td>
                            {QUARTERS.map((q) => { const stat = group.quarterStats[q]; const pct = stat.total ? Math.round((stat.complete / stat.total) * 100) : 0; return <td key={q} className="px-4 py-4"><div className="mx-auto max-w-28"><div className="flex items-center justify-between text-xs font-semibold"><span>{stat.complete}/{stat.total}</span><span className="text-slate-400">{pct}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div></div></td>; })}
                            <td className="px-4 py-4 text-center"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${group.completion === 100 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : group.attention ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{group.completion}% complete</span></td>
                            <td className="px-4 py-4 text-right"><button type="button" onClick={() => toggle(group.sector)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">{isExpanded ? "Hide Offices" : "View Offices"}</button></td>
                        </tr>
                        {isExpanded && group.offices.map((row) => <tr key={`${group.sector}-${row.office}`} className="border-t border-slate-100 bg-slate-50/40"><td></td><td className="px-4 py-3 pl-8"><p className="font-semibold text-slate-800">{row.office}</p><p className="text-xs text-slate-400">{row.sector}</p></td>{QUARTERS.map((q) => <td key={q} className="px-3 py-3"><QuarterStatusCell quarter={row.quarters?.[q]} /></td>)}<td className="px-4 py-3 text-center"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${row.overall === "COMPLETE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.overall === "NEEDS_ACTION" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{row.overall.replaceAll("_", " ")}</span></td><td className="px-4 py-3"></td></tr>)}
                    </Fragment>;
                })}
                {!groups.length && !loading && <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">No sector compliance data.</td></tr>}
            </tbody>
        </table></div>
    </section>;
}

function MetricCard({ icon: Icon, label, value, tone, sub }) {
    const toneClass = { indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600" }[tone] || "bg-slate-100 text-slate-600";
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>{sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}</div><div className={`rounded-xl p-2.5 ${toneClass}`}><Icon size={19} /></div></div></div>;
}

function QuarterStatusCell({ quarter }) {
    if (!quarter) return <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center text-[10px] text-slate-400">No data</div>;
    const complete = quarter.LBAC3?.exists && quarter.LBAC5?.exists && ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(quarter.LBAC3.status) && ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(quarter.LBAC5.status);
    const missing = !quarter.LBAC3?.exists || !quarter.LBAC5?.exists;
    return <div className={`rounded-xl border p-2 ${complete ? "border-emerald-200 bg-emerald-50" : missing ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}><p className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">{complete ? "Complete" : missing ? "Missing" : "For Action"}</p><p className="mt-1 text-center text-[9px] text-slate-500">3: {quarter.LBAC3?.status || "—"}</p><p className="text-center text-[9px] text-slate-500">5: {quarter.LBAC5?.status || "—"}</p></div>;
}
