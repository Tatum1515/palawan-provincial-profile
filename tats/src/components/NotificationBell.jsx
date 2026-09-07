import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Clock3, RotateCcw, X } from "lucide-react";
import api from "../api/axios.js";

const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(d);
};

export default function NotificationBell({ year = new Date().getFullYear() }) {
    const [open, setOpen] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [physicalReports, setPhysicalReports] = useState([]);

    useEffect(() => {
        let active = true;
        const load = () => {
            Promise.all([
                api.get("/submission-tasks", { params: { year } }).catch(() => ({ data: { data: [] } })),
                api.get("/physical-report-admin/schedules", { params: { year } }).catch(() => ({ data: { schedules: [] } })),
                api.get("/physical-reports", { params: { year } }).catch(() => ({ data: { data: [] } })),
            ]).then(([taskResponse, scheduleResponse, reportResponse]) => {
                if (!active) return;
                setTasks(Array.isArray(taskResponse.data?.data) ? taskResponse.data.data : []);
                setSchedules(Array.isArray(scheduleResponse.data?.schedules) ? scheduleResponse.data.schedules : []);
                setPhysicalReports(Array.isArray(reportResponse.data?.data) ? reportResponse.data.data : []);
            });
        };
        load();
        const timer = window.setInterval(load, 60 * 1000);
        return () => { active = false; window.clearInterval(timer); };
    }, [year]);

    const notifications = useMemo(() => {
        const result = [];
        for (const task of tasks) {
            if (task.submitted) {
                if (["RETURNED", "DENIED"].includes(task.linkedSubmission?.status)) {
                    result.push({ id: `${task.id}-returned`, type: "RETURNED", title: `${task.title} was returned`, text: task.quarter ? `${task.quarter} needs correction.` : "Needs correction.", task });
                } else if (["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(task.linkedSubmission?.status)) {
                    result.push({ id: `${task.id}-approved`, type: "APPROVED", title: `${task.title} was approved`, text: task.quarter ? `${task.quarter} is complete.` : "Submission approved.", task });
                }
                continue;
            }
            if (task.state === "OVERDUE") {
                result.push({ id: `${task.id}-overdue`, type: "OVERDUE", title: `${task.title} is overdue`, text: `Due ${formatDate(task.dueDate)}.`, task });
            } else if (task.state === "DUE_SOON") {
                result.push({ id: `${task.id}-soon`, type: "DUE_SOON", title: `${task.title} is due soon`, text: `${Math.max(0, task.daysRemaining)} day${task.daysRemaining === 1 ? "" : "s"} remaining.`, task });
            } else if (task.state === "UPCOMING") {
                result.push({ id: `${task.id}-upcoming`, type: "UPCOMING", title: `${task.title} opens soon`, text: `Starts ${formatDate(task.startDate)}.`, task });
            }
        }
        for (const schedule of schedules) {
            if (!schedule?.openAt || !schedule?.closeAt || schedule.enabled === false) continue;
            const open = new Date(schedule.openAt);
            const close = new Date(schedule.closeAt);
            const now = new Date();
            if (Number.isNaN(open.getTime()) || Number.isNaN(close.getTime())) continue;
            if (now >= open && now <= close) result.push({ id: `window-${schedule.quarter}`, type: "DUE_SOON", title: `${schedule.quarter} Physical Report input is OPEN`, text: `Office users may enter Actual Output until ${formatDate(schedule.closeAt)}.`, task: null });
            else if (now < open && open - now <= 3 * 86400000) result.push({ id: `window-upcoming-${schedule.quarter}`, type: "UPCOMING", title: `${schedule.quarter} Physical Report window opens soon`, text: `Opens ${formatDate(schedule.openAt)}.`, task: null });
        }
        for (const report of physicalReports) {
            if (["RETURNED", "DENIED"].includes(report?.status)) result.push({ id: `physical-returned-${report.id}`, type: "RETURNED", title: `${report.formType} was returned`, text: `${report.office || "Your office"} · ${report.quarter || "Quarter"} needs correction.`, task: null });
        }
        return result.slice(0, 12);
    }, [tasks, schedules, physicalReports]);

    const unread = notifications.length;

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen((value) => !value)} className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50" title="Notifications">
                <Bell size={18} />
                {unread > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </button>

            {open && (
                <>
                    <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close notifications" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <div><p className="font-semibold text-slate-900">Notifications</p><p className="text-xs text-slate-500">Deadlines and submission updates</p></div>
                            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-5 py-10 text-center text-sm text-slate-500">No new notifications.</div>
                            ) : notifications.map((item) => (
                                <div key={item.id} className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
                                    <div className={`mt-0.5 rounded-full p-2 ${item.type === "OVERDUE" || item.type === "RETURNED" ? "bg-rose-50 text-rose-600" : item.type === "APPROVED" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                        {item.type === "APPROVED" ? <CheckCircle2 size={16} /> : item.type === "RETURNED" ? <RotateCcw size={16} /> : <Clock3 size={16} />}
                                    </div>
                                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{item.text}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
