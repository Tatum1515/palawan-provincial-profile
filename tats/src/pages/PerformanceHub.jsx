import { useState } from "react";
import { BarChart2, ClipboardList } from "lucide-react";
import MonitoringSummary from "./MonitoringSummary.jsx";
import PhysicalReport from "./PhysicalReport.jsx";

const TABS = [
    { key: "SUMMARY", label: "Office Summary", icon: BarChart2, Component: MonitoringSummary },
    { key: "PHYSICAL", label: "Physical Reports", icon: ClipboardList, Component: PhysicalReport },
];

export default function PerformanceHub() {
    const [tab, setTab] = useState("SUMMARY");
    const Active = TABS.find((item) => item.key === tab)?.Component || MonitoringSummary;
    return <div className="animate-fade-in space-y-6 pb-8">
        <header><p className="text-xs font-bold tracking-[0.14em] text-indigo-700">PPDO PERFORMANCE</p><h1 className="page-title mt-2">Performance & Summary</h1><p className="page-subtitle">Physical data gathering and office reporting in one connected workflow.</p></header>
        <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">{TABS.map((item)=>{const Icon=item.icon; return <button key={item.key} type="button" onClick={()=>setTab(item.key)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab===item.key?"bg-indigo-600 text-white":"text-slate-600 hover:bg-slate-100"}`}><Icon size={16}/>{item.label}</button>;})}</div>
        <Active />
    </div>;
}
