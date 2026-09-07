import QuarterSchedule from "../models/QuarterSchedule.js";

export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export const getSchedule = async (year, quarter) => {
    if (!year || !QUARTERS.includes(quarter)) return null;
    return QuarterSchedule.findOne({ year: Number(year), quarter }).lean();
};

export const isWindowOpen = (schedule, now = new Date()) => {
    if (!schedule || !schedule.enabled) return false;
    const openAt = new Date(schedule.openAt);
    const closeAt = new Date(schedule.closeAt);
    if (Number.isNaN(openAt.getTime()) || Number.isNaN(closeAt.getTime())) return false;
    return now >= openAt && now <= closeAt;
};

export const scheduleState = (schedule, now = new Date()) => {
    if (!schedule || !schedule.enabled) return "NOT_CONFIGURED";
    const openAt = new Date(schedule.openAt);
    const closeAt = new Date(schedule.closeAt);
    if (Number.isNaN(openAt.getTime()) || Number.isNaN(closeAt.getTime())) return "INVALID";
    if (now < openAt) return "UPCOMING";
    if (now > closeAt) return "CLOSED";
    return "OPEN";
};


export const quarterWindowAllowsWrite = (schedule, now = new Date()) =>
    isWindowOpen(schedule, now);
