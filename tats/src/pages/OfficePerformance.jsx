import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Edit3, Plus, Printer, RefreshCw, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import PerformanceFormModal from "../components/PerformanceFormModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const statusClass = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED_BY_HEAD: "bg-blue-50 text-blue-700 border-blue-200",
    VALIDATED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DENIED: "bg-rose-50 text-rose-700 border-rose-200",
};

const printRecord = (record) => {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;
    popup.document.write(`<html><head><title>Performance - ${escapeHtml(record.ppa || "Performance")}</title><style>body{font-family:Arial;padding:30px;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse}td{padding:9px;border:1px solid #ddd}td:first-child{font-weight:bold;width:35%}</style></head><body><h1>PPDO Performance Record</h1><table>${[
        ["PPA / Program", record.ppa], ["Office", record.office], ["Sector", record.sector], ["Fund Source", record.fundSource], ["Quarter", record.quarter], ["Year", record.year], ["Physical", record.physicalPerformance], ["Overall Physical", record.overallPhysical], ["Financial", record.financialPerformance], ["Overall Financial", record.overallFinancial], ["Total Rating", record.totalRating], ["Status", record.status], ["Remarks", record.adminRemarks || record.remarks || "—"],
    ].map(([a, b]) => `<tr><td>${escapeHtml(a)}</td><td>${escapeHtml(b ?? "—")}</td></tr>`).join("")}</table><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const MiniMetric = ({ label, value }) => <div className="rounded-xl border border-white bg-white p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value ?? 0}</p></div>;

export default function OfficePerformance() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const isHead = user?.role === "DEPARTMENT_HEAD";
    const isEncoder = user?.role === "EMPLOYEE";
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");
    const [denyId, setReturnId] = useState(null);
    const [denyRemarks, setReturnRemarks] = useState("");
    const [summary, setSummary] = useState(null);

    const loadRecords = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const { data } = await api.get("/officePerformance");
            if (!data?.success) throw new Error(data?.error || "Failed to load performance.");
            setRecords(Array.isArray(data.data) ? data.data : []);
            try {
                const summaryResponse = await api.get("/officePerformance/summary");
                if (summaryResponse.data?.success) setSummary(summaryResponse.data);
            } catch (summaryError) {
                console.warn("PERFORMANCE SUMMARY LOAD:", summaryError);
            }
        } catch (err) {
            console.error("PERFORMANCE LOAD:", err);
            setError(err.response?.data?.error || "Failed to load performance records.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Intentional API synchronization: the effect loads external data into local state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadRecords();
    }, [loadRecords]);

    const filtered = useMemo(() => records.filter((record) => {
        const haystack = `${record.ppa || ""} ${record.office || ""} ${record.fundSource || ""} ${record.submittedBy?.email || ""}`.toLowerCase();
        return (!search || haystack.includes(search.toLowerCase())) && (status === "ALL" || record.status === status);
    }), [records, search, status]);

    const approve = async (id) => {
        try {
            await api.patch(`/officePerformance/${id}/approve`);
            toast.success("Performance approved.");
            loadRecords();
        } catch (err) { toast.error(err.response?.data?.error || "Failed to approve performance."); }
    };

    const deny = async () => {
        if (!denyRemarks.trim()) return toast.error("Return remarks are required.");
        try {
            await api.patch(`/officePerformance/${denyId}/deny`, { remarks: denyRemarks.trim() });
            toast.success("Performance returned to the Encoder.");
            setReturnId(null); setReturnRemarks(""); loadRecords();
        } catch (err) { toast.error(err.response?.data?.error || "Failed to deny performance."); }
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this performance record? This cannot be undone.")) return;
        try { await api.delete(`/officePerformance/${id}`); toast.success("Performance deleted."); loadRecords(); }
        catch (err) { toast.error(err.response?.data?.error || "Failed to delete performance."); }
    };

    return <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-bold tracking-[0.14em] text-indigo-600">PPDO MONITORING DIVISION</p><h1 className="page-title">Performance Management</h1><p className="page-subtitle">{isHead ? "Review and approve the actual data submitted by your office Encoder." : isEncoder ? "Encode the data once. It goes to your Department Head; Admin does not re-encode it." : "Monitor and validate the same submitted data. No manual re-encoding is required."}</p></div>
            <div className="flex gap-2"><button onClick={loadRecords} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><RefreshCw size={16}/>Refresh</button>{isEncoder && <button onClick={() => { setEditing(null); setModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/>Submit Performance</button>}</div>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {summary?.physicalReport && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-bold tracking-[0.14em] text-indigo-600">OFFICIAL PHYSICAL REPORT SOURCE</p>
                        <h2 className="mt-1 text-lg font-bold text-slate-900">LBAC 5 metrics</h2>
                        <p className="text-sm text-slate-600">These figures come from approved/validated Physical Report records. Office Performance is not used to re-encode them.</p>
                    </div>
                    <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold text-indigo-700">{summary.physicalReport.reportCount || 0} report(s)</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <MiniMetric label="Target" value={summary.physicalReport.target} />
                    <MiniMetric label="Actual" value={summary.physicalReport.actual} />
                    <MiniMetric label="Variance" value={summary.physicalReport.variance} />
                    <MiniMetric label="Accomplishment" value={`${summary.physicalReport.accomplishment}%`} />
                    <MiniMetric label="COA" value={`${summary.physicalReport.averageCoa}%`} />
                </div>
            </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
            {[["PENDING", "Pending"], ["APPROVED_BY_HEAD", "Approved by Head"], ["VALIDATED", "Validated"], ["DENIED", "Returned"]].map(([key, label]) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-900">{records.filter((r) => r.status === key).length}</p></div>)}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="field-input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PPA, office, fund source, user..."/></div><select className="field-input md:w-48" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All Statuses</option><option value="PENDING">Pending</option><option value="APPROVED_BY_HEAD">Approved by Head</option><option value="VALIDATED">Validated</option><option value="DENIED">Returned</option></select></div>
            <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-sm"><thead><tr className="border-b border-slate-100 bg-slate-50 text-left"><th className="px-4 py-3">PPA / Program</th><th className="px-4 py-3">Office</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Physical</th><th className="px-4 py-3">Financial</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-500">Loading performance...</td></tr> : filtered.length === 0 ? <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-500">No performance records found.</td></tr> : filtered.map((record) => <tr key={record.id} className="border-b border-slate-100"><td className="px-4 py-4 font-semibold text-slate-900">{record.ppa || "—"}</td><td className="px-4 py-4">{record.office}</td><td className="px-4 py-4">{record.quarter} {record.year}</td><td className="px-4 py-4">{record.physicalPerformance}</td><td className="px-4 py-4">{record.financialPerformance}</td><td className="px-4 py-4 font-bold">{record.totalRating?.toFixed ? record.totalRating.toFixed(2) : record.totalRating}</td><td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[record.status] || ""}`}>{record.status}</span></td><td className="px-4 py-4 text-xs">{record.source === "USER" ? "Encoder / User" : "System"}</td><td className="px-4 py-4"><div className="flex items-center gap-1">{isHead && record.status === "PENDING" && <><button title="Approve" onClick={() => approve(record.id)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><Check size={17}/></button><button title="Return" onClick={() => setReturnId(record.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><X size={17}/></button></>}{isAdmin && record.status === "APPROVED_BY_HEAD" && <button title="Validate" onClick={() => api.patch(`/officePerformance/${record.id}/validate`).then(() => { toast.success("Validated. No re-encoding required."); loadRecords(); }).catch((err) => toast.error(err.response?.data?.error || "Failed to validate performance."))} className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Validate</button>}{isEncoder && record.status === "DENIED" && <button title="Correct and Resubmit" onClick={() => { setEditing(record); setModalOpen(true); }} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"><Edit3 size={17}/></button>}<button title="Print" onClick={() => printRecord(record)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Printer size={17}/></button>{isAdmin && <button title="Delete" onClick={() => remove(record.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={17}/></button>}</div></td></tr>)}</tbody></table></div>
        </div>

        {isEncoder && <PerformanceFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={() => { toast.success(editing ? "Performance updated and resubmitted." : "Performance submitted to Department Head."); loadRecords(); }} record={editing} userRole={user?.role} />}

        {denyId && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">Return Performance</h2><p className="mt-1 text-sm text-slate-500">Provide remarks so the Encoder knows what to correct.</p><textarea className="field-input mt-4 min-h-32" value={denyRemarks} onChange={(e) => setReturnRemarks(e.target.value)} placeholder="Enter denial remarks..."/><div className="mt-4 flex justify-end gap-2"><button onClick={() => { setReturnId(null); setReturnRemarks(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold">Cancel</button><button onClick={deny} className="rounded-xl bg-rose-600 px-4 py-2.5 font-semibold text-white">Return</button></div></div></div>}
    </div>;
}
