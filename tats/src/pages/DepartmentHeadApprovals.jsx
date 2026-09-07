import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, FileText, RefreshCw, ShieldCheck, X, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const STATUS_STYLES = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
    RESUBMITTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
    UNDER_REVIEW: "bg-violet-50 text-violet-700 border-violet-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    APPROVED_BY_HEAD: "bg-emerald-50 text-emerald-700 border-emerald-200",
    APPROVED_BY_ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
    VALIDATED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    RETURNED: "bg-rose-50 text-rose-700 border-rose-200",
    DENIED: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusLabel = (status) => String(status || "PENDING").replaceAll("_", " ");
const num = (value) => {
    if (value === "" || value === null || value === undefined) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

export default function DepartmentHeadApprovals() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("ACTION");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [selectedLoading, setSelectedLoading] = useState(false);
    const [returnDialog, setReturnDialog] = useState({ open: false, report: null, remarks: "" });
    const [approvalDialog, setApprovalDialog] = useState({
        open: false,
        report: null,
        officeHead: "",
        localPlanningCoordinator: "",
        officeHeadFile: null,
        coordinatorFile: null,
    });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const { data } = await api.get("/physical-reports", {
                params: {
                    year,
                    ...(filter === "ACTION" ? { actionQueue: "true" } : {}),
                    ...(filter === "RESUBMITTED" ? { status: "RESUBMITTED" } : {}),
                    ...(filter === "REVIEWING" ? { status: "UNDER_REVIEW" } : {}),
                    ...(search.trim() ? { search: search.trim() } : {}),
                },
            });
            setReports(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            const message = err?.response?.data?.error || "Unable to load your office submissions.";
            setReports([]);
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [year, filter, search]);

    useEffect(() => {
        // Intentional API synchronization: the effect loads external data into local state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    const stats = useMemo(() => ({
        total: reports.length,
        waiting: reports.filter((r) => ["PENDING", "SUBMITTED", "RESUBMITTED", "UNDER_REVIEW"].includes(r.status)).length,
        approved: reports.filter((r) => ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(r.status)).length,
        returned: reports.filter((r) => ["RETURNED", "DENIED"].includes(r.status)).length,
    }), [reports]);

    const openReport = async (report) => {
        try {
            setSelectedLoading(true);
            const { data } = await api.get(`/physical-reports/${report.id || report._id}`);
            setSelected(data?.data || report);
        } catch (err) {
            toast.error(err?.response?.data?.error || "Unable to open the Physical Report.");
        } finally {
            setSelectedLoading(false);
        }
    };

    const startReview = async (report) => {
        try {
            await api.patch(`/physical-reports/${report.id || report._id}/review`);
            toast.success("Submission marked Under Review.");
            await load();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Unable to start review.");
        }
    };

    const approve = async () => {
        const report = approvalDialog.report;
        if (!report) return;
        if (!approvalDialog.officeHead.trim() || !approvalDialog.localPlanningCoordinator.trim()) {
            toast.error("Enter both required names before approving.");
            return;
        }
        if (!approvalDialog.officeHeadFile || !approvalDialog.coordinatorFile) {
            toast.error("Both e-signature files are required for Department Head approval.");
            return;
        }

        const formData = new FormData();
        formData.append("officeHead", approvalDialog.officeHead.trim());
        formData.append("localPlanningCoordinator", approvalDialog.localPlanningCoordinator.trim());
        formData.append("signatureOfficeHead", approvalDialog.officeHeadFile);
        formData.append("signatureCoordinator", approvalDialog.coordinatorFile);

        try {
            setSaving(true);
            await api.patch(`/physical-reports/${report.id || report._id}/approve`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Physical Report approved and sent to PPDO/Admin.");
            setApprovalDialog({ open: false, report: null, officeHead: "", localPlanningCoordinator: "", officeHeadFile: null, coordinatorFile: null });
            setSelected(null);
            await load();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Unable to approve the Physical Report.");
        } finally {
            setSaving(false);
        }
    };

    const returnReport = async () => {
        const report = returnDialog.report;
        const remarks = returnDialog.remarks.trim();
        if (!report) return;
        if (!remarks) return toast.error("Correction remarks are required.");
        try {
            setSaving(true);
            await api.patch(`/physical-reports/${report.id || report._id}/deny`, { remarks });
            toast.success("Report returned to the encoder for correction.");
            setReturnDialog({ open: false, report: null, remarks: "" });
            setSelected(null);
            await load();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Unable to return the report.");
        } finally {
            setSaving(false);
        }
    };

    const rows = reports.map((report) => {
        const status = String(report.status || "PENDING").toUpperCase();
        const canReview = ["SUBMITTED", "RESUBMITTED", "PENDING"].includes(status);
        const canApprove = canReview || status === "UNDER_REVIEW";
        return { report, status, canReview, canApprove };
    });

    const visibleRows = rows.filter(({ status }) => {
        if (filter === "ACTION") return ["SUBMITTED", "RESUBMITTED", "PENDING"].includes(status);
        if (filter === "RESUBMITTED") return status === "RESUBMITTED";
        if (filter === "REVIEWING") return status === "UNDER_REVIEW";
        if (filter === "APPROVED") return ["APPROVED", "APPROVED_BY_HEAD"].includes(status);
        if (filter === "RETURNED") return ["RETURNED", "DENIED"].includes(status);
        return true;
    });

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Approval Body</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">For Approval / Submissions</h1>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">Review the same Physical Reports submitted by your office encoder. No re-encoding is required.</p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
                        {[0,1,2,3,4].map((offset) => {
                            const value = new Date().getFullYear() - offset;
                            return <option key={value} value={value}>{value}</option>;
                        })}
                    </select>
                    <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            </div>

            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><b>Unable to load submissions.</b><div className="mt-1">{error}</div></div>}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {["Total Submissions", "For Approval", "Approved", "Returned"].map((label, index) => {
                    const values = [stats.total, stats.waiting, stats.approved, stats.returned];
                    return <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-900">{values[index]}</p></div>;
                })}
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div><h2 className="font-bold text-slate-900">Office Physical Reports — {year}</h2><p className="mt-1 text-xs text-slate-500">Review only the submissions assigned to your office. Actions are enforced by the server.</p></div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search report, PPA, or quarter…" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
                                <option value="ACTION">Needs Action</option>
                                <option value="RESUBMITTED">Resubmitted</option>
                                <option value="REVIEWING">Under Review</option>
                                <option value="APPROVED">Approved</option>
                                <option value="RETURNED">Returned</option>
                                <option value="ALL">All</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-[1000px] w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                            <tr><th className="px-4 py-3">Form</th><th className="px-4 py-3">Quarter</th><th className="px-4 py-3">Major Final Output</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && <tr><td colSpan="6" className="px-6 py-14 text-center text-slate-500"><RefreshCw className="mx-auto mb-2 animate-spin" size={20} />Loading submissions…</td></tr>}
                            {!loading && !visibleRows.length && <tr><td colSpan="6" className="px-6 py-14 text-center"><FileText className="mx-auto text-slate-300" size={28} /><p className="mt-2 font-semibold text-slate-600">No submissions found for your office.</p><p className="mt-1 text-xs text-slate-400">Once an encoder submits a Physical Report, it will appear here automatically.</p></td></tr>}
                            {!loading && visibleRows.map(({ report, status, canReview, canApprove }) => (
                                <tr key={report.id || report._id} className="hover:bg-slate-50">
                                    <td className="px-4 py-4 font-semibold">{report.formType || "LBAC3"}</td>
                                    <td className="px-4 py-4">{report.quarter} {report.year}</td>
                                    <td className="max-w-[320px] px-4 py-4"><div className="truncate font-semibold text-slate-800">{report.majorFinalOutput || "Untitled Physical Report"}</div><div className="mt-1 text-xs text-slate-400">{report.office || "Assigned Office"}</div></td>
                                    <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{statusLabel(status)}</span></td>
                                    <td className="px-4 py-4 text-xs text-slate-500">{report.submittedAt ? new Date(report.submittedAt).toLocaleString() : "—"}</td>
                                    <td className="px-4 py-4"><div className="flex flex-wrap gap-1">
                                        <button type="button" title="View submission" onClick={() => openReport(report)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Eye size={17} /></button>
                                        {canReview && <button type="button" title="Start review" onClick={() => startReview(report)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"><ShieldCheck size={17} /></button>}
                                        {canApprove && <button type="button" title="Approve" onClick={() => setApprovalDialog({ open: true, report, officeHead: "", localPlanningCoordinator: "", officeHeadFile: null, coordinatorFile: null })} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><Check size={17} /></button>}
                                        {canApprove && <button type="button" title="Return" onClick={() => setReturnDialog({ open: true, report, remarks: "" })} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><RotateCcw size={17} /></button>}
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4"><div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-slate-900">Physical Report Details</h2><p className="text-xs text-slate-500">{selected.office} · {selected.formType} · {selected.quarter} {selected.year}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><div className="max-h-[75vh] overflow-auto p-5"><div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs text-slate-400">PPA Code</p><p className="font-semibold">{selected.majorPpaCode || "—"}</p></div><div><p className="text-xs text-slate-400">Major Final Output</p><p className="font-semibold">{selected.majorFinalOutput || "—"}</p></div><div><p className="text-xs text-slate-400">Status</p><p className="font-semibold">{statusLabel(selected.status)}</p></div></div><div className="mt-5 overflow-x-auto"><table className="min-w-[1000px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2">PPA / Activity</th><th className="px-3 py-2">Indicator</th><th className="px-3 py-2">Target Total</th><th className="px-3 py-2">Actual Total</th><th className="px-3 py-2">Variance</th></tr></thead><tbody className="divide-y divide-slate-100">{(selected.rows || []).filter((r) => String(r.rowType || "ITEM").toUpperCase() !== "SERVICE").map((r, i) => <tr key={i}><td className="px-3 py-2">{r.ppaName || r.majorFinalOutput || "—"}</td><td className="px-3 py-2">{r.performanceIndicator || "—"}</td><td className="px-3 py-2">{num(r.targetOutput?.total).toLocaleString()}</td><td className="px-3 py-2">{num(r.actualPerformance?.total).toLocaleString()}</td><td className="px-3 py-2">{num(r.variance).toLocaleString()}</td></tr>)}</tbody></table></div></div></div></div>}
            {selectedLoading && <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/25"><div className="rounded-xl bg-white px-5 py-4 shadow-xl">Loading submission…</div></div>}

            {returnDialog.open && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/45 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold">Return for Correction</h2><p className="text-xs text-slate-500">Explain exactly what the encoder must fix.</p></div><div className="p-5"><textarea rows="6" value={returnDialog.remarks} onChange={(e) => setReturnDialog((v) => ({ ...v, remarks: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Correction remarks…" /></div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => setReturnDialog({ open: false, report: null, remarks: "" })} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button type="button" disabled={saving} onClick={returnReport} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white">Return</button></div></div></div>}

            {approvalDialog.open && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/45 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold">Approve Physical Report</h2><p className="text-xs text-slate-500">The approval step uses the same submission record; no duplicate encoding.</p></div><div className="grid gap-4 p-5 md:grid-cols-2"><label className="block"><span className="mb-1 block text-sm font-semibold">Office / Department Head</span><input value={approvalDialog.officeHead} onChange={(e) => setApprovalDialog((v) => ({ ...v, officeHead: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="block"><span className="mb-1 block text-sm font-semibold">Local Planning Coordinator</span><input value={approvalDialog.localPlanningCoordinator} onChange={(e) => setApprovalDialog((v) => ({ ...v, localPlanningCoordinator: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="block"><span className="mb-1 block text-sm font-semibold">Head e-signature</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setApprovalDialog((v) => ({ ...v, officeHeadFile: e.target.files?.[0] || null }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block"><span className="mb-1 block text-sm font-semibold">Coordinator e-signature</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setApprovalDialog((v) => ({ ...v, coordinatorFile: e.target.files?.[0] || null }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label></div><div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => setApprovalDialog((v) => ({ ...v, open: false }))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button type="button" disabled={saving} onClick={approve} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"><Check size={17} /> {saving ? "Approving…" : "Approve & Freeze"}</button></div></div></div>}
        </div>
    );
}
