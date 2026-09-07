import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Trash2, Pencil, Users, X, BarChart3, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORY_META = {
    MEETING: { label: "Meeting", badge: "bg-blue-50 text-blue-700 border-blue-200" },
    DEADLINE: { label: "Deadline", badge: "bg-rose-50 text-rose-700 border-rose-200" },
    TRAINING: { label: "Training", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    OFFICIAL_ACTIVITY: { label: "Official Activity", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    HOLIDAY: { label: "Holiday", badge: "bg-violet-50 text-violet-700 border-violet-200" },
    OTHER: { label: "Other", badge: "bg-slate-100 text-slate-700 border-slate-200" },
    TASK: { label: "Assigned Task", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

const emptyForm = {
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    allDay: false,
    category: "OFFICIAL_ACTIVITY",
    location: "",
};

const toInputDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return format(date, "yyyy-MM-dd'T'HH:mm");
};

const fromInputDateTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeActivity = (item) => ({
    ...item,
    startAt: item?.startAt,
    endAt: item?.endAt,
    category: CATEGORY_META[item?.category] ? item.category : "OTHER",
    createdBy: item?.createdBy || { id: "", name: "", email: "" },
    readOnly: Boolean(item?.readOnly || item?.sourceType === "TASK"),
});

function AlertTriangleIcon() { return <span className="mt-0.5 text-rose-600">!</span>; }

export default function Calendar() {
    const { user } = useAuth();
    const [cursorMonth, setCursorMonth] = useState(new Date());
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [selectedDay, setSelectedDay] = useState(new Date());
    const [editingId, setEditingId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [compliance, setCompliance] = useState({ loading: true, tasks: [] });
    const activityRequestId = useRef(0);
    const lastActivityRefreshAt = useRef(0);
    const complianceRequestId = useRef(0);
    const activityAbortController = useRef(null);
    const complianceAbortController = useRef(null);

    // Date helpers return new Date objects. Previously those new objects made
    // loadActivities change on every render, repeatedly recreating the effect
    // below and starting overlapping refresh loops.
    const { calendarStart, calendarEnd, days } = useMemo(() => {
        const monthStart = startOfMonth(cursorMonth);
        const monthEnd = endOfMonth(cursorMonth);
        const start = startOfWeek(monthStart, { weekStartsOn: 1 });
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return { calendarStart: start, calendarEnd: end, days: eachDayOfInterval({ start, end }) };
    }, [cursorMonth]);

    const loadActivities = useCallback(async (options = {}) => {
        const { initial = false } = options;
        const requestId = ++activityRequestId.current;
        activityAbortController.current?.abort();
        const controller = new AbortController();
        activityAbortController.current = controller;
        if (initial) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        setLoadError("");
        try {
            const { data } = await api.get("/calendar-activities", {
                params: {
                    start: calendarStart.toISOString(),
                    end: calendarEnd.toISOString(),
                },
                signal: controller.signal,
            });
            const items = Array.isArray(data?.activities) ? data.activities : Array.isArray(data?.data) ? data.data : [];
            if (requestId === activityRequestId.current) setActivities(items.filter(Boolean).map(normalizeActivity));
        } catch (error) {
            const cancelled = error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";
            if (cancelled || requestId !== activityRequestId.current) return;
            const message = error?.response?.data?.error || "Unable to load the shared calendar.";
            setLoadError(message);
            setActivities([]);
        } finally {
            if (requestId === activityRequestId.current) {
                setLoading(false);
                setRefreshing(false);
                lastActivityRefreshAt.current = Date.now();
                if (activityAbortController.current === controller) activityAbortController.current = null;
            }
        }
    }, [calendarEnd, calendarStart]);

    const loadCompliance = useCallback(async () => {
        const requestId = ++complianceRequestId.current;
        complianceAbortController.current?.abort();
        const controller = new AbortController();
        complianceAbortController.current = controller;
        try {
            const year = new Date().getFullYear();
            const { data } = await api.get("/submission-tasks", { params: { year }, signal: controller.signal });
            const tasks = Array.isArray(data?.data) ? data.data : [];
            if (requestId === complianceRequestId.current) setCompliance({ loading: false, tasks });
        } catch (error) {
            const cancelled = error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";
            if (cancelled || requestId !== complianceRequestId.current) return;
            console.error("CALENDAR COMPLIANCE:", error);
            setCompliance({ loading: false, tasks: [] });
        } finally {
            if (requestId === complianceRequestId.current && complianceAbortController.current === controller) complianceAbortController.current = null;
        }
    }, []);

    useEffect(() => {
        const initialTimer = window.setTimeout(() => {
            void loadActivities({ initial: true });
        }, 0);

        const refresh = () => {
            if (document.visibilityState !== "visible") return;
            if (Date.now() - lastActivityRefreshAt.current < 15000) return;
            void loadActivities();
        };
        const intervalId = window.setInterval(refresh, 60000);
        window.addEventListener("focus", refresh);

        return () => {
            activityRequestId.current += 1;
            activityAbortController.current?.abort();
            window.clearTimeout(initialTimer);
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refresh);
        };
    }, [loadActivities]);

    useEffect(() => {
        const initialTimer = window.setTimeout(() => {
            void loadCompliance();
        }, 0);
        const refresh = () => {
            if (document.visibilityState !== "visible") return;
            void loadCompliance();
        };
        const intervalId = window.setInterval(refresh, 60000);
        return () => {
            complianceRequestId.current += 1;
            complianceAbortController.current?.abort();
            window.clearTimeout(initialTimer);
            window.clearInterval(intervalId);
        };
    }, [loadCompliance]);

    const activitiesByDay = useMemo(() => {
        const map = new Map();
        for (const activity of activities) {
            const start = new Date(activity.startAt);
            const end = new Date(activity.endAt);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) continue;

            // The API returns activities overlapping the visible calendar range.
            // Index each activity into the affected calendar days once instead of
            // filtering the complete activity list for every calendar cell.
            const firstDay = startOfWeek(start, { weekStartsOn: 1 });
            const lastDay = endOfWeek(end, { weekStartsOn: 1 });
            let cursor = firstDay;
            while (cursor <= lastDay) {
                const key = format(cursor, "yyyy-MM-dd");
                const bucket = map.get(key) || [];
                bucket.push(activity);
                map.set(key, bucket);
                cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
            }
        }
        for (const bucket of map.values()) bucket.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        return map;
    }, [activities]);

    const activitiesForDay = useCallback((day) =>
        activitiesByDay.get(format(day, "yyyy-MM-dd")) || [], [activitiesByDay]);

    const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";

    const openCreate = (day = selectedDay) => {
        if (!isAdmin) {
            toast.error("Only the administrator can add shared calendar activities.");
            return;
        }
        const date = format(day, "yyyy-MM-dd");
        setEditingId(null);
        setForm({
            ...emptyForm,
            startAt: `${date}T09:00`,
            endAt: `${date}T10:00`,
        });
        setModalOpen(true);
    };

    const openEdit = (activity) => {
        if (!canManage(activity)) return;
        setEditingId(activity.id);
        setForm({
            title: activity.title || "",
            description: activity.description || "",
            startAt: toInputDateTime(activity.startAt),
            endAt: toInputDateTime(activity.endAt),
            allDay: Boolean(activity.allDay),
            category: activity.category || "OTHER",
            location: activity.location || "",
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);
    };

    const canManage = (activity) => isAdmin && !activity?.readOnly;

    const submit = async (event) => {
        event.preventDefault();
        if (!isAdmin) {
            toast.error("Only the administrator can manage shared calendar activities.");
            return;
        }
        if (!form.title.trim()) return toast.error("Activity title is required.");
        if (!form.startAt || !form.endAt) return toast.error("Start and end date/time are required.");

        const startAt = fromInputDateTime(form.startAt);
        const endAt = fromInputDateTime(form.endAt);
        if (!startAt || !endAt) return toast.error("Please enter valid date/time values.");
        if (new Date(endAt) < new Date(startAt)) return toast.error("End date/time cannot be earlier than the start.");

        setSaving(true);
        try {
            const payload = { ...form, startAt, endAt };
            let savedActivity;
            if (editingId) {
                const { data } = await api.put(`/calendar-activities/${editingId}`, payload);
                savedActivity = data?.activity;
                toast.success("Activity updated.");
            } else {
                const { data } = await api.post("/calendar-activities", payload);
                savedActivity = data?.activity;
                toast.success("Activity added for all users.");
            }
            if (savedActivity) {
                const normalized = normalizeActivity(savedActivity);
                setActivities((current) => editingId
                    ? current.map((item) => item.id === normalized.id ? normalized : item)
                    : [...current, normalized].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)));
            }
            closeModal();
        } catch (error) {
            toast.error(error?.response?.data?.error || "Could not save the activity.");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (activity) => {
        if (!canManage(activity)) return toast.error("Only the administrator can delete shared calendar activities.");
        if (!window.confirm(`Delete “${activity.title}”? This removes it from the shared calendar for everyone.`)) return;

        try {
            await api.delete(`/calendar-activities/${activity.id}`);
            setActivities((current) => current.filter((item) => item.id !== activity.id));
            toast.success("Activity deleted.");
        } catch (error) {
            toast.error(error?.response?.data?.error || "Could not delete the activity.");
        }
    };

    const selectedActivities = activitiesForDay(selectedDay);
    const upcoming = useMemo(() => activities
        .filter((activity) => new Date(activity.endAt) >= new Date())
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
        .slice(0, 6), [activities]);

    const complianceSummary = useMemo(() => {
        const tasks = compliance.tasks || [];
        const total = tasks.length;
        const compliant = tasks.filter((task) => Boolean(task.submitted)).length;
        const returned = tasks.filter((task) => task.state === "RETURNED").length;
        const overdue = tasks.filter((task) => !task.submitted && task.state === "OVERDUE").length;
        const pending = Math.max(total - compliant - overdue, 0);
        const rate = total ? Math.round((compliant / total) * 100) : 0;
        const byQuarter = ["Q1", "Q2", "Q3", "Q4"].map((quarter) => {
            const items = tasks.filter((task) => task.quarter === quarter);
            const done = items.filter((task) => Boolean(task.submitted)).length;
            return { quarter, total: items.length, done, rate: items.length ? Math.round((done / items.length) * 100) : 0 };
        });
        return { total, compliant, pending, overdue, returned, rate, byQuarter };
    }, [compliance.tasks]);

    const complianceChart = useMemo(() => {
        const total = complianceSummary.total || 1;
        const donePct = (complianceSummary.compliant / total) * 100;
        const returnedPct = (complianceSummary.returned / total) * 100;
        const overduePct = (complianceSummary.overdue / total) * 100;
        return `conic-gradient(#4f46e5 0% ${donePct}%, #f59e0b ${donePct}% ${donePct + Math.max(complianceSummary.pending,0) / total * 100}%, #ef4444 ${donePct + Math.max(complianceSummary.pending,0) / total * 100}% ${donePct + Math.max(complianceSummary.pending,0) / total * 100 + overduePct}%, #a855f7 ${donePct + Math.max(complianceSummary.pending,0) / total * 100 + overduePct}% ${donePct + Math.max(complianceSummary.pending,0) / total * 100 + overduePct + returnedPct}%, #e2e8f0 ${donePct + Math.max(complianceSummary.pending,0) / total * 100 + overduePct + returnedPct}% 100%)`;
    }, [complianceSummary]);

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><CalendarDays size={24} /></div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Shared Workspace</p>
                                <h1 className="text-2xl font-bold text-slate-900">Calendar of Activities</h1>
                            </div>
                        </div>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">One shared calendar for PPDO activities. Everything added here is visible to all connected users.</p>
                    </div>
                    {isAdmin ? (
                        <button type="button" onClick={() => openCreate(selectedDay)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">
                            <Plus size={18} /> Add Activity
                        </button>
                    ) : (
                        <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
                            <Users size={17} /> Admin-managed calendar
                        </span>
                    )}
                </div>
            </section>

            {loadError && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertTriangleIcon /><div className="min-w-0 flex-1"><p className="font-semibold">Calendar data could not be loaded</p><p className="mt-0.5">{loadError}</p><button type="button" onClick={() => { loadActivities(); loadCompliance(); }} className="mt-2 font-semibold underline">Try again</button></div></div>}

            {!isAdmin && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                        <div className="flex items-center gap-5">
                            <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: complianceChart }}>
                                <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                                    <span className="text-2xl font-extrabold text-slate-900">{complianceSummary.rate}%</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complied</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2"><BarChart3 size={18} className="text-indigo-600" /><h2 className="text-lg font-bold text-slate-900">Your Compliance Overview</h2></div>
                                <p className="mt-1 text-sm text-slate-500">Automatically updated from your assigned submission tasks. No manual chart updating is required.</p>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">{complianceSummary.compliant} Complied</span>
                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{complianceSummary.pending} Pending</span>
                                    <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{complianceSummary.overdue} Overdue</span>
                                    {complianceSummary.returned > 0 && <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">{complianceSummary.returned} Returned</span>}
                                </div>
                            </div>
                        </div>
                        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                            {complianceSummary.byQuarter.map((item) => (
                                <div key={item.quarter} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{item.quarter}</span><span className="text-xs font-bold text-indigo-600">{item.rate}%</span></div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${item.rate}%` }} /></div>
                                    <p className="mt-2 text-[11px] text-slate-500">{item.done} of {item.total} complied</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setCursorMonth(subMonths(cursorMonth, 1))} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Previous month"><ChevronLeft size={18} /></button>
                            <button type="button" onClick={() => { const now = new Date(); setCursorMonth(now); setSelectedDay(now); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Today</button>
                            <button type="button" onClick={() => setCursorMonth(addMonths(cursorMonth, 1))} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Next month"><ChevronRight size={18} /></button>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">{format(cursorMonth, "MMMM yyyy")}</h2>
                        <div className="text-xs font-semibold text-slate-400">{activities.length} activit{activities.length === 1 ? "y" : "ies"} this view</div>
                    </div>

                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">{day}</div>)}
                    </div>

                    <div className="grid grid-cols-7">
                        {days.map((day) => {
                            const items = activitiesForDay(day);
                            const selected = isSameDay(day, selectedDay);
                            return (
                                <button key={day.toISOString()} type="button" onClick={() => setSelectedDay(day)} className={`min-h-28 border-b border-r border-slate-100 p-2 text-left align-top transition hover:bg-indigo-50/40 ${!isSameMonth(day, cursorMonth) ? "bg-slate-50/60" : "bg-white"} ${selected ? "ring-2 ring-inset ring-indigo-500" : ""}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isToday(day) ? "bg-indigo-600 text-white" : isSameMonth(day, cursorMonth) ? "text-slate-700" : "text-slate-300"}`}>{format(day, "d")}</span>
                                        {items.length > 0 && <span className="text-[10px] font-bold text-indigo-500">{items.length}</span>}
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {items.slice(0, 3).map((activity) => (
                                            <div key={activity.id} onClick={(e) => e.stopPropagation()} className={`truncate rounded-md border px-1.5 py-1 text-[10px] font-semibold ${(CATEGORY_META[activity.category] || CATEGORY_META.OTHER).badge}`} title={activity.title}>{activity.title}</div>
                                        ))}
                                        {items.length > 3 && <p className="px-1 text-[10px] font-semibold text-slate-400">+{items.length - 3} more</p>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {(loading || refreshing) && <div className="border-t border-slate-100 px-5 py-3 text-xs font-semibold text-slate-400">{loading ? "Loading shared calendar…" : "Refreshing shared calendar…"}</div>}
                </section>

                <aside className="space-y-6">
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Selected Day</p>
                                <h3 className="mt-1 text-lg font-bold text-slate-900">{format(selectedDay, "EEEE, MMMM d")}</h3>
                            </div>
                            {isAdmin ? <button type="button" onClick={() => openCreate(selectedDay)} className="rounded-xl bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100" aria-label="Add activity"><Plus size={18} /></button> : <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">Admin managed</span>}
                        </div>
                        <div className="mt-4 space-y-3">
                            {selectedActivities.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">No activities scheduled for this day.</div>}
                            {selectedActivities.map((activity) => {
                                const meta = CATEGORY_META[activity.category] || CATEGORY_META.OTHER;
                                return (
                                    <article key={activity.id} className="rounded-2xl border border-slate-200 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.badge}`}>{meta.label}</span>
                                                <h4 className="mt-2 font-bold text-slate-900">{activity.title}</h4>
                                            </div>
                                            {canManage(activity) && <div className="flex gap-1"><button type="button" onClick={() => openEdit(activity)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit activity"><Pencil size={15} /></button><button type="button" onClick={() => remove(activity)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete activity"><Trash2 size={15} /></button></div>}
                                        </div>
                                        <div className="mt-3 space-y-2 text-xs text-slate-500">
                                            <div className="flex items-center gap-2"><Clock3 size={14} /> {activity.allDay ? "All day" : `${format(new Date(activity.startAt), "h:mm a")} – ${format(new Date(activity.endAt), "h:mm a")}`}</div>
                                            {activity.location && <div className="flex items-center gap-2"><MapPin size={14} /> {activity.location}</div>}
                                            <div className="flex items-center gap-2"><Users size={14} /> Shared with all connected users</div>
                                        </div>
                                        {activity.description && <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-600">{activity.description}</p>}
                                        {activity.sourceType === "TASK" && (
                                            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs">
                                                <div className="flex items-center gap-2 font-semibold text-indigo-800"><CheckCircle2 size={14} /> Compliance is linked to your actual submission.</div>
                                                <p className="mt-1 text-indigo-700">{compliance.tasks.find((task) => task.id === activity.sourceId)?.submitted ? "Complied — your submission has been detected." : "Not yet complied — submit the required item from the appropriate module."}</p>
                                            </div>
                                        )}
                                        <p className="mt-3 text-[11px] text-slate-400">Added by {activity.createdBy?.name || activity.createdBy?.email || "PPDO Admin"}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Upcoming</p>
                        <h3 className="mt-1 text-lg font-bold">Next activities</h3>
                        <div className="mt-4 space-y-3">
                            {upcoming.length === 0 && <p className="text-sm text-slate-400">No upcoming activities in this calendar view.</p>}
                            {upcoming.map((activity) => <button key={activity.id} type="button" onClick={() => { const day = new Date(activity.startAt); setSelectedDay(day); setCursorMonth(day); }} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"><p className="truncate text-sm font-semibold">{activity.title}</p><p className="mt-1 text-xs text-slate-400">{format(new Date(activity.startAt), "MMM d • h:mm a")}</p></button>)}
                        </div>
                    </section>
                </aside>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Administrator Calendar</p><h3 className="text-xl font-bold text-slate-900">{editingId ? "Edit activity" : "Add activity"}</h3></div><button type="button" onClick={closeModal} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={20} /></button></div>
                        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Activity title *</label><input value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} maxLength={160} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" placeholder="e.g. Quarterly Monitoring Meeting" /></div>
                            <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold text-slate-700">Start *</label><input type="datetime-local" value={form.startAt} onChange={(e) => setForm((v) => ({ ...v, startAt: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">End *</label><input type="datetime-local" value={form.endAt} onChange={(e) => setForm((v) => ({ ...v, endAt: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></div></div>
                            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={form.allDay} onChange={(e) => setForm((v) => ({ ...v, allDay: e.target.checked }))} className="h-4 w-4" /><span><span className="block text-sm font-semibold text-slate-700">All-day activity</span><span className="text-xs text-slate-400">Useful for holidays, deadlines, and whole-day office activities.</span></span></label>
                            <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold text-slate-700">Category</label><select value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm">{Object.entries(CATEGORY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">Location</label><input value={form.location} onChange={(e) => setForm((v) => ({ ...v, location: e.target.value }))} maxLength={250} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="e.g. PPDO Conference Room" /></div></div>
                            <div><label className="mb-2 block text-sm font-semibold text-slate-700">Description</label><textarea value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} maxLength={2000} rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Purpose, reminders, requirements, or notes…" /></div>
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeModal} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : editingId ? "Save Changes" : "Add to Shared Calendar"}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
