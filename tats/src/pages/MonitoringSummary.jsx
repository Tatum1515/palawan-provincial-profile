import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, ChevronDown, ChevronRight, FileText, RefreshCw, Search, WalletCards } from "lucide-react";
import api from "../api/axios.js";

const currentQuarter = () => `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
const money = (value) => Number(value || 0).toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 });
const number = (value) => Number(value || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 });

export default function MonitoringSummary() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [quarter, setQuarter] = useState(currentQuarter());
    const [sectorFilter, setSectorFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [expandedSectors, setExpandedSectors] = useState(() => new Set());

    const loadSummary = useCallback(async () => {
        try {
            setLoading(true); setError("");
            const { data } = await api.get("/monitoringSummary", { params: { year, quarter } });
            if (!data?.success) throw new Error(data?.error || "Failed to load summary.");
            setSummary(data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || "Failed to load summary.");
        } finally { setLoading(false); }
    }, [year, quarter]);

    useEffect(() => {
        // Intentional API synchronization: the effect loads external data into local state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadSummary();
    }, [loadSummary]);

    const physical = summary?.physicalReports || {};
    const sectors = useMemo(() => {
        const query = search.trim().toLowerCase();
        const groups = new Map();
        (summary?.offices || []).filter((office) => {
            const matchesSector = sectorFilter === "ALL" || (office.sector || "Unassigned Sector") === sectorFilter;
            const haystack = `${office.office || ""} ${office.sector || ""}`.toLowerCase();
            return matchesSector && (!query || haystack.includes(query));
        }).forEach((office) => {
            const sector = office.sector || "Unassigned Sector";
            if (!groups.has(sector)) groups.set(sector, []);
            groups.get(sector).push(office);
        });
        return Array.from(groups.entries()).map(([sector, offices]) => {
            const reported = offices.filter((office) => office.reported);
            const target = reported.reduce((sum, office) => sum + Number(office.target || 0), 0);
            const actual = reported.reduce((sum, office) => sum + Number(office.actual || 0), 0);
            const variance = actual - target;
            const physicalPct = target ? (actual / target) * 100 : 0;
            const financialValues = reported.map((office) => Number(office.averageFinancial || 0)).filter((value) => value > 0);
            const coaValues = reported.map((office) => Number(office.averageCoa || 0)).filter((value) => value > 0);
            const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
            const complete = reported.length;
            return {
                sector,
                offices,
                reported: complete,
                total: offices.length,
                target,
                actual,
                variance,
                physicalPct,
                financialPct: average(financialValues),
                coa: average(coaValues),
                completion: offices.length ? (complete / offices.length) * 100 : 0,
            };
        }).sort((a, b) => a.sector.localeCompare(b.sector));
    }, [summary?.offices, search, sectorFilter]);

    const sectorOptions = useMemo(() => Array.from(new Set((summary?.offices || []).map((office) => office.sector).filter(Boolean))).sort(), [summary?.offices]);
    const toggleSector = (sector) => setExpandedSectors((current) => {
        const next = new Set(current);
        if (next.has(sector)) next.delete(sector); else next.add(sector);
        return next;
    });

    if (loading) return <div className="p-6"><div className="h-8 w-80 animate-pulse rounded bg-slate-200"/><div className="mt-5 grid gap-4 md:grid-cols-4">{[1,2,3,4].map((x)=><div key={x} className="h-28 animate-pulse rounded-2xl bg-slate-100"/>)}</div></div>;
    if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="font-semibold text-rose-800">Unable to load Physical Report summary</p><p className="mt-1 text-sm text-rose-700">{error}</p><button onClick={loadSummary} className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;

    return <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-bold tracking-[0.14em] text-indigo-600">PPDO MONITORING DIVISION</p><h1 className="page-title">Physical Report Summary</h1><p className="page-subtitle">Province-wide overview first. Expand a sector only when you need the individual office details.</p></div>
            <button onClick={loadSummary} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"><RefreshCw size={16}/>Refresh</button>
        </div>

        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input className="field-input w-32" type="number" value={year} onChange={(e)=>setYear(e.target.value)} />
            <select className="field-input w-44" value={quarter} onChange={(e)=>setQuarter(e.target.value)}><option value="Q1">1st Quarter</option><option value="Q2">2nd Quarter</option><option value="Q3">3rd Quarter</option><option value="Q4">4th Quarter</option></select>
            <select className="field-input w-56" value={sectorFilter} onChange={(e)=>setSectorFilter(e.target.value)}><option value="ALL">All Sectors</option>{sectorOptions.map((sector)=><option key={sector} value={sector}>{sector}</option>)}</select>
            <div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input className="field-input pl-9" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search sector or office..."/></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Offices Reported" value={`${summary?.officesReported || 0}/${summary?.totalOffices || 0}`} icon={CheckCircle2}/>
            <Card title="PPA / Activity Items" value={physical.totalPPAs || summary?.totalPPAs || 0} icon={FileText}/>
            <Card title="Physical Accomplishment" value={`${number(physical.averageLbac3Accomplishment || summary?.averagePhysical)}%`} icon={BarChart3}/>
            <Card title="Average COA" value={`${number(physical.averageCoa)}%`} icon={WalletCards}/>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
            <Card title="LBAC 5 Physical Score" value={number(physical.averageLbac5Physical)} />
            <Card title="LBAC 5 Financial Score" value={number(physical.averageLbac5Financial)} />
            <Card title="Total Allotment" value={money(physical.totalAllotment)} />
            <Card title="Actual Obligations" value={money(physical.totalObligations)} />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-bold text-slate-900">Office Summary — {summary?.period?.quarter} {summary?.period?.year}</h2><p className="mt-1 text-sm text-slate-500">Sector overview first. Office records are available by expanding a sector.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{sectors.length} sector{sectors.length === 1 ? "" : "s"}</span></div></div>
            <div className="overflow-x-auto p-4">
                <table className="min-w-[1120px] w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-10 px-3 py-3"/><th className="px-4 py-3 text-left">Sector</th><th className="px-4 py-3 text-center">Reporting</th><th className="px-4 py-3 text-right">Target</th><th className="px-4 py-3 text-right">Actual</th><th className="px-4 py-3 text-right">Variance</th><th className="px-4 py-3 text-right">Physical %</th><th className="px-4 py-3 text-right">Financial %</th><th className="px-4 py-3 text-right">COA</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                    <tbody>
                        {sectors.map((group) => { const expanded = expandedSectors.has(group.sector); return <SectorRows key={group.sector} group={group} expanded={expanded} onToggle={() => toggleSector(group.sector)} />; })}
                        {!sectors.length && <tr><td colSpan="10" className="px-4 py-12 text-center text-slate-500">No matching sector or office data.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    </div>;
}

function SectorRows({ group, expanded, onToggle }) {
    return <>
        <tr className="border-t border-slate-100 hover:bg-slate-50/70">
            <td className="px-3 py-4 text-center"><button type="button" onClick={onToggle} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-indigo-600">{expanded ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}</button></td>
            <td className="px-4 py-4"><p className="font-bold text-slate-900">{group.sector}</p><p className="mt-0.5 text-xs text-slate-500">{group.total} offices · {group.reported} reported</p></td>
            <td className="px-4 py-4 text-center"><div className="mx-auto max-w-24"><div className="flex justify-between text-xs font-semibold"><span>{group.reported}/{group.total}</span><span>{Math.round(group.completion)}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${Math.min(group.completion,100)}%`}}/></div></div></td>
            <td className="px-4 py-4 text-right font-semibold">{group.reported ? number(group.target) : "—"}</td><td className="px-4 py-4 text-right font-semibold">{group.reported ? number(group.actual) : "—"}</td>
            <td className={`px-4 py-4 text-right font-semibold ${group.variance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{group.reported ? number(group.variance) : "—"}</td>
            <td className="px-4 py-4 text-right">{group.reported ? `${number(group.physicalPct)}%` : "—"}</td><td className="px-4 py-4 text-right">{group.reported ? `${number(group.financialPct)}%` : "—"}</td><td className="px-4 py-4 text-right">{group.reported ? `${number(group.coa)}%` : "—"}</td>
            <td className="px-4 py-4 text-right"><button type="button" onClick={onToggle} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">{expanded ? "Hide Offices" : "View Offices"}</button></td>
        </tr>
        {expanded && group.offices.map((office, index) => <tr key={`${group.sector}-${office.office}-${index}`} className="border-t border-slate-100 bg-slate-50/40"><td/><td className="px-4 py-3 pl-10"><p className="font-semibold text-slate-800">{office.office}</p><p className="text-xs text-slate-400">{office.sector}</p></td><td className="px-4 py-3 text-center text-xs text-slate-500">{office.reported ? "Reported" : "No report"}</td><td className="px-4 py-3 text-right">{office.reported ? number(office.target) : "—"}</td><td className="px-4 py-3 text-right">{office.reported ? number(office.actual) : "—"}</td><td className={`px-4 py-3 text-right ${office.variance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{office.reported ? number(office.variance) : "—"}</td><td className="px-4 py-3 text-right">{office.reported ? `${number(office.averagePhysical)}%` : "—"}</td><td className="px-4 py-3 text-right">{office.reported ? `${number(office.averageFinancial)}%` : "—"}</td><td className="px-4 py-3 text-right">{office.reported ? `${number(office.averageCoa)}%` : "—"}</td><td className="px-4 py-3 text-right"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${office.reported ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{office.reported ? "Reported" : "No approved report"}</span></td></tr>)}
    </>;
}

function Card({ title, value, icon: Icon }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{title}</p>{Icon && <Icon size={18} className="text-indigo-500"/>}</div><p className="mt-2 text-2xl font-bold text-slate-900">{value ?? 0}</p></div>; }
