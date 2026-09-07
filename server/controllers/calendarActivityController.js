import CalendarActivity from "../models/CalendarActivity.js";
import SubmissionTask from "../models/SubmissionTask.js";
import QuarterSchedule from "../models/QuarterSchedule.js";

const VALID_CATEGORIES = new Set([
    "MEETING",
    "DEADLINE",
    "TRAINING",
    "OFFICIAL_ACTIVITY",
    "HOLIDAY",
    "OTHER",
]);

const normalizeText = (value, max = 250) =>
    String(value ?? "")
        .trim()
        .slice(0, max);

const parseDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const canManage = (req) => req.session?.role === "ADMIN";

const serializeActivity = (activity) => ({
    id: activity._id.toString(),
    title: activity.title,
    description: activity.description || "",
    startAt: activity.startAt,
    endAt: activity.endAt,
    allDay: Boolean(activity.allDay),
    category: activity.category,
    location: activity.location || "",
    visibility: activity.visibility || "ALL_USERS",
    createdBy: activity.createdBy && typeof activity.createdBy === "object"
        ? {
            id: activity.createdBy._id?.toString?.() || "",
            name: `${activity.createdBy.firstName || ""} ${activity.createdBy.lastName || ""}`.trim(),
            email: activity.createdBy.email || "",
        }
        : { id: String(activity.createdBy || ""), name: "", email: "" },
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
});

const validatePayload = (body) => {
    const title = normalizeText(body?.title, 160);
    const startAt = parseDate(body?.startAt);
    const endAt = parseDate(body?.endAt);
    const category = VALID_CATEGORIES.has(body?.category)
        ? body.category
        : "OTHER";

    if (!title) return { error: "Activity title is required." };
    if (!startAt) return { error: "A valid start date and time is required." };
    if (!endAt) return { error: "A valid end date and time is required." };
    if (endAt < startAt) return { error: "End date/time cannot be earlier than the start date/time." };

    return {
        value: {
            title,
            description: normalizeText(body?.description, 2000),
            startAt,
            endAt,
            allDay: Boolean(body?.allDay),
            category,
            location: normalizeText(body?.location, 250),
            visibility: "ALL_USERS",
        },
    };
};

export const listActivities = async (req, res) => {
    try {
        const start = req.query.start ? parseDate(req.query.start) : null;
        const end = req.query.end ? parseDate(req.query.end) : null;

        const filter = { visibility: "ALL_USERS" };
        if (start && end) {
            filter.startAt = { $lt: end };
            filter.endAt = { $gt: start };
        }

        const taskFilter = { active: true };
        if (start && end) {
            taskFilter.startDate = { $lt: end };
            taskFilter.dueDate = { $gt: start };
        }

        // Calendar data is intentionally resilient: a broken task or quarter
        // schedule record must never blank the entire shared calendar.
        const results = await Promise.allSettled([
            CalendarActivity.find(filter)
                .populate("createdBy", "firstName lastName email")
                .sort({ startAt: 1, endAt: 1, title: 1 })
                .lean(),
            SubmissionTask.find(taskFilter)
                .sort({ startDate: 1, dueDate: 1, title: 1 })
                .lean(),
            (() => {
                const scheduleFilter = { enabled: true };
                if (start && end) {
                    scheduleFilter.openAt = { $lt: end };
                    scheduleFilter.closeAt = { $gt: start };
                }
                return QuarterSchedule.find(scheduleFilter).sort({ openAt: 1 }).lean();
            })(),
        ]);

        const activities = results[0].status === "fulfilled" ? results[0].value : [];
        const tasks = results[1].status === "fulfilled" ? results[1].value : [];
        const schedules = results[2].status === "fulfilled" ? results[2].value : [];
        const warnings = [];
        if (results[0].status === "rejected") warnings.push("Calendar activities could not be loaded.");
        if (results[1].status === "rejected") warnings.push("Submission tasks could not be loaded into the calendar.");
        if (results[2].status === "rejected") warnings.push("Quarter input windows could not be loaded into the calendar.");

        const activityItems = activities.map(serializeActivity);
        const taskItems = tasks.map((task) => ({
            id: `task:${task._id.toString()}`,
            sourceId: task._id.toString(),
            sourceType: "TASK",
            readOnly: true,
            title: `Task: ${task.title}`,
            description: task.description || "",
            startAt: task.startDate,
            endAt: task.dueDate,
            allDay: true,
            category: "TASK",
            location: task.office && task.office !== "ALL" ? task.office : "All Offices",
            visibility: "ALL_USERS",
            office: task.office || "ALL",
            formType: task.formType || "GENERAL",
            quarter: task.quarter || "",
            year: task.year,
            taskState: task.active ? "OPEN" : "CLOSED",
            createdBy: { id: task.createdBy?.toString?.() || "", name: "PPDO Admin", email: "" },
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        }));

        const windowItems = schedules.map((schedule) => ({
            id: `quarter-window:${schedule._id.toString()}`,
            sourceId: schedule._id.toString(),
            sourceType: "QUARTER_WINDOW",
            readOnly: true,
            title: `LBAC ${schedule.quarter} Input Window`,
            description: schedule.notes || `Office users may enter quarterly Actual Output during this configured window.`,
            startAt: schedule.openAt,
            endAt: schedule.closeAt,
            allDay: false,
            category: "DEADLINE",
            location: "PPDO Monitoring Division",
            visibility: "ALL_USERS",
            quarter: schedule.quarter,
            year: schedule.year,
            taskState: "OPEN",
            createdBy: { id: "", name: "PPDO Admin", email: "" },
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
        }));

        const combined = [...activityItems, ...taskItems, ...windowItems].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

        return res.json({
            success: true,
            activities: combined,
            warnings,
        });
    } catch (error) {
        console.error("CALENDAR LIST ERROR:", error);
        return res.status(500).json({ success: false, error: "Failed to load calendar activities." });
    }
};

export const createActivity = async (req, res) => {
    try {
        if (req.session?.role !== "ADMIN") {
            return res.status(403).json({ success: false, error: "Only an administrator can add activities to the shared calendar." });
        }
        const parsed = validatePayload(req.body);
        if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });

        const activity = await CalendarActivity.create({
            ...parsed.value,
            createdBy: req.session.id,
        });

        await activity.populate("createdBy", "firstName lastName email");

        return res.status(201).json({
            success: true,
            activity: serializeActivity(activity),
        });
    } catch (error) {
        console.error("CALENDAR CREATE ERROR:", error);
        return res.status(500).json({ success: false, error: "Failed to create calendar activity." });
    }
};

export const updateActivity = async (req, res) => {
    try {
        const activity = await CalendarActivity.findById(req.params.id);
        if (!activity) return res.status(404).json({ success: false, error: "Activity not found." });

        if (!canManage(req)) {
            return res.status(403).json({ success: false, error: "Only an administrator can edit shared calendar activities." });
        }

        const parsed = validatePayload(req.body);
        if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });

        Object.assign(activity, parsed.value, { updatedBy: req.session.id });
        await activity.save();
        await activity.populate("createdBy", "firstName lastName email");

        return res.json({
            success: true,
            activity: serializeActivity(activity),
        });
    } catch (error) {
        console.error("CALENDAR UPDATE ERROR:", error);
        return res.status(500).json({ success: false, error: "Failed to update calendar activity." });
    }
};

export const deleteActivity = async (req, res) => {
    try {
        const activity = await CalendarActivity.findById(req.params.id);
        if (!activity) return res.status(404).json({ success: false, error: "Activity not found." });

        if (!canManage(req)) {
            return res.status(403).json({ success: false, error: "Only an administrator can delete shared calendar activities." });
        }

        await activity.deleteOne();
        return res.json({ success: true, id: req.params.id });
    } catch (error) {
        console.error("CALENDAR DELETE ERROR:", error);
        return res.status(500).json({ success: false, error: "Failed to delete calendar activity." });
    }
};
