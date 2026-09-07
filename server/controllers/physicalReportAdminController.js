import QuarterSchedule from "../models/QuarterSchedule.js";
import AuditLog from "../models/AuditLog.js";
import PhysicalReport from "../models/PhysicalReport.js";
import { DEPARTMENTS, OFFICES_BY_SECTOR } from "../constants/departments.js";
import { QUARTERS, scheduleState } from "../utils/quarterSchedule.js";

const clean = (value) => String(value ?? "").trim();
const validYear = (value) => Number.isInteger(Number(value)) && Number(value) >= 2000 && Number(value) <= 2100;

const quarterStatus = (reports, office, quarter) => {
    const lbac3 = reports.find((r) => r.office === office && r.quarter === quarter && r.formType === "LBAC3");
    const lbac5 = reports.find((r) => r.office === office && r.quarter === quarter && r.formType === "LBAC5");
    return {
        LBAC3: lbac3 ? { exists: true, status: lbac3.status, id: lbac3._id.toString() } : { exists: false, status: "MISSING" },
        LBAC5: lbac5 ? { exists: true, status: lbac5.status, id: lbac5._id.toString() } : { exists: false, status: "MISSING" },
    };
};

export const listQuarterSchedules = async (req, res) => {
    try {
        // All authenticated users may view the configured quarter windows.
        // Only the PUT endpoint below is administrator-controlled.

        const year = validYear(req.query.year) ? Number(req.query.year) : new Date().getFullYear();
        const schedules = await QuarterSchedule.find({ year }).sort({ quarter: 1 }).lean();
        res.json({
            success: true,
            year,
            schedules: QUARTERS.map((quarter) => {
                const item = schedules.find((s) => s.quarter === quarter);
                return {
                    quarter,
                    id: item?._id?.toString() || null,
                    openAt: item?.openAt || null,
                    closeAt: item?.closeAt || null,
                    enabled: item ? Boolean(item.enabled) : false,
                    notes: item?.notes || "",
                    state: scheduleState(item),
                };
            }),
        });
    } catch (error) {
        console.error("LIST QUARTER SCHEDULES:", error);
        res.status(500).json({ success: false, error: "Unable to load quarter input schedules." });
    }
};

export const upsertQuarterSchedule = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") return res.status(403).json({ success: false, error: "Admin access required." });
        const year = Number(req.params.year);
        const quarter = clean(req.params.quarter).toUpperCase();
        const openAt = new Date(req.body.openAt);
        const closeAt = new Date(req.body.closeAt);
        if (!validYear(year)) return res.status(400).json({ success: false, error: "Invalid year." });
        if (!QUARTERS.includes(quarter)) return res.status(400).json({ success: false, error: "Invalid quarter." });
        if (Number.isNaN(openAt.getTime()) || Number.isNaN(closeAt.getTime())) return res.status(400).json({ success: false, error: "Open and close dates are required." });
        if (closeAt <= openAt) return res.status(400).json({ success: false, error: "Close date/time must be later than open date/time." });

        const schedule = await QuarterSchedule.findOneAndUpdate(
            { year, quarter },
            {
                $set: {
                    openAt,
                    closeAt,
                    enabled: req.body.enabled !== false,
                    notes: clean(req.body.notes).slice(0, 1000),
                    updatedBy: req.session.id,
                },
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );

        await AuditLog.create({
            action: "QUARTER_WINDOW_UPDATED",
            entityType: "QuarterSchedule",
            entityId: schedule._id.toString(),
            year,
            quarter,
            userId: req.session.id,
            userName: "Administrator",
            details: { openAt, closeAt, enabled: schedule.enabled, notes: schedule.notes },
        });

        res.json({ success: true, message: `${quarter} ${year} input window saved.`, schedule });
    } catch (error) {
        console.error("UPSERT QUARTER SCHEDULE:", error);
        res.status(500).json({ success: false, error: "Unable to save quarter input schedule." });
    }
};

export const getOfficeCompliance = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") return res.status(403).json({ success: false, error: "Admin access required." });
        const year = validYear(req.query.year) ? Number(req.query.year) : new Date().getFullYear();
        const officeFilter = DEPARTMENTS.includes(req.query.office) ? req.query.office : null;
        const offices = officeFilter ? [officeFilter] : DEPARTMENTS;
        const [reports, schedules] = await Promise.all([
            PhysicalReport.find({ year, ...(officeFilter ? { office: officeFilter } : {}) }).select("office formType quarter status updatedAt majorPpaCode rows evaluationRows lbac5Totals").lean(),
            QuarterSchedule.find({ year }).lean(),
        ]);
        const data = offices.map((office) => {
            const quarterData = {};
            let completeQuarters = 0;
            let attentionCount = 0;
            for (const q of QUARTERS) {
                const status = quarterStatus(reports, office, q);
                const schedule = schedules.find((s) => s.quarter === q);
                const hasBoth = status.LBAC3.exists && status.LBAC5.exists;
                const approved = ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(status.LBAC3.status) && ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(status.LBAC5.status);
                const state = scheduleState(schedule);
                if (hasBoth) completeQuarters += 1;
                if ((!hasBoth && state === "CLOSED") || (hasBoth && !approved && state === "CLOSED")) attentionCount += 1;
                quarterData[q] = { ...status, schedule: { state, openAt: schedule?.openAt || null, closeAt: schedule?.closeAt || null } };
            }
            const overall = completeQuarters === 4 ? "COMPLETE" : attentionCount > 0 ? "NEEDS_ACTION" : "IN_PROGRESS";
            return { office, sector: Object.entries(OFFICES_BY_SECTOR).find(([, list]) => list.includes(office))?.[0] || "", quarters: quarterData, completeQuarters, attentionCount, overall };
        });
        res.json({ success: true, year, data });
    } catch (error) {
        console.error("OFFICE COMPLIANCE:", error);
        res.status(500).json({ success: false, error: "Unable to load office compliance." });
    }
};

export const getPhysicalDataQuality = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") return res.status(403).json({ success: false, error: "Admin access required." });
        const year = validYear(req.query.year) ? Number(req.query.year) : new Date().getFullYear();
        const office = DEPARTMENTS.includes(req.query.office) ? req.query.office : null;
        const quarter = QUARTERS.includes(req.query.quarter) ? req.query.quarter : null;
        const reports = await PhysicalReport.find({ year, ...(office ? { office } : {}), ...(quarter ? { quarter } : {}) }).select("office formType year quarter status majorPpaCode majorFinalOutput rows evaluationRows lbac5Totals").lean();
        const issues = [];
        const byKey = new Map();
        for (const report of reports) {
            const key = `${report.office}|${report.year}|${report.quarter}`;
            const pair = byKey.get(key) || {};
            pair[report.formType] = report;
            byKey.set(key, pair);
            if (!report.majorPpaCode && report.formType === "LBAC3") issues.push({ severity: "WARNING", office: report.office, quarter: report.quarter, form: report.formType, message: "Main PPA Code is missing." });
            if (!report.majorFinalOutput && report.formType === "LBAC3") issues.push({ severity: "WARNING", office: report.office, quarter: report.quarter, form: report.formType, message: "Main Major Final Output is missing." });
            if (report.formType === "LBAC3") {
                const items = (report.rows || []).filter((r) => String(r.rowType || "ITEM").toUpperCase() === "ITEM");
                items.forEach((row, i) => {
                    if (!row.performanceIndicator) issues.push({ severity: "WARNING", office: report.office, quarter: report.quarter, form: "LBAC3", message: `Performance Indicator missing on PPA row ${i + 1}.` });
                    if (!row.ppaName && !row.majorFinalOutput) issues.push({ severity: "ERROR", office: report.office, quarter: report.quarter, form: "LBAC3", message: `PPA / Activity name missing on row ${i + 1}.` });
                });
            }
            if (report.formType === "LBAC5") {
                const items = (report.evaluationRows || []).filter((r) => String(r.rowType || "ITEM").toUpperCase() === "ITEM");
                const totalWeight = items.reduce((s, r) => s + Number(r.weight || 0), 0);
                if (totalWeight > 100.01) issues.push({ severity: "ERROR", office: report.office, quarter: report.quarter, form: "LBAC5", message: `LBAC 5 item weights total ${totalWeight.toFixed(2)}%.` });
                items.forEach((row, i) => {
                    if (!row.majorFinalOutput) issues.push({ severity: "ERROR", office: report.office, quarter: report.quarter, form: "LBAC5", message: `PPA / Activity description missing on row ${i + 1}.` });
                });
            }
        }
        for (const [key, pair] of byKey) {
            if (pair.LBAC5 && !pair.LBAC3) issues.push({ severity: "ERROR", office: pair.LBAC5.office, quarter: pair.LBAC5.quarter, form: "LINKAGE", message: "LBAC 5 exists without an LBAC 3 source." });
            if (pair.LBAC3 && pair.LBAC5) {
                const sourceItems = (pair.LBAC3.rows || []).filter((r) => String(r.rowType || "ITEM").toUpperCase() === "ITEM");
                const evalItems = (pair.LBAC5.evaluationRows || []).filter((r) => String(r.rowType || "ITEM").toUpperCase() === "ITEM");
                if (sourceItems.length !== evalItems.length) issues.push({ severity: "ERROR", office: pair.LBAC3.office, quarter: pair.LBAC3.quarter, form: "LINKAGE", message: `LBAC 3 has ${sourceItems.length} PPA items while LBAC 5 has ${evalItems.length}.` });
                const quarters = QUARTERS.slice(0, QUARTERS.indexOf(pair.LBAC3.quarter) + 1);
                const sumAcross = (field) => quarters.reduce((sum, q) => sum + Number(field?.[q.toLowerCase()] || 0), 0);
                sourceItems.forEach((source, index) => {
                    const target = sumAcross(source.targetOutput);
                    const actual = sumAcross(source.actualPerformance);
                    const lb5 = evalItems[index];
                    if (!lb5) return;
                    if (Math.abs(target - Number(lb5.targetOutput || 0)) > 0.01 || Math.abs(actual - Number(lb5.actualOutput || 0)) > 0.01) issues.push({ severity: "ERROR", office: pair.LBAC3.office, quarter: pair.LBAC3.quarter, form: "LINKAGE", message: `LBAC 5 cumulative physical value mismatch on PPA row ${index + 1}. Expected Target ${target.toFixed(2)} / Actual ${actual.toFixed(2)} through ${pair.LBAC3.quarter}.` });
                });
            }
        }
        res.json({ success: true, year, count: issues.length, issues: issues.slice(0, 500) });
    } catch (error) {
        console.error("PHYSICAL DATA QUALITY:", error);
        res.status(500).json({ success: false, error: "Unable to inspect Physical Report data quality." });
    }
};


export const getValidationQueue = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") return res.status(403).json({ success: false, error: "Admin access required." });
        const year = validYear(req.query.year) ? Number(req.query.year) : new Date().getFullYear();
        const office = DEPARTMENTS.includes(req.query.office) ? req.query.office : null;
        const reports = await PhysicalReport.find({
            year,
            formType: "LBAC3",
            status: { $in: ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN"] },
            ...(office ? { office } : {}),
        }).select("office sector reportTitle reportGroupId year quarter status updatedAt submittedAt approvedAt approvedByHead approvedByHeadName reviewedBy reviewedByName rows evaluationRows lbac5Totals").sort({ updatedAt: -1 }).lean();

        const queue = reports.map((report) => ({
            id: report._id.toString(),
            office: report.office,
            sector: report.sector || "",
            reportTitle: report.reportTitle || "Untitled Report",
            reportGroupId: report.reportGroupId || null,
            year: report.year,
            quarter: report.quarter,
            status: report.status,
            submittedAt: report.submittedAt || null,
            approvedAt: report.approvedAt || null,
            updatedAt: report.updatedAt || null,
            approvalHead: report.approvedByHeadName || report.reviewedByName || "Approval Head",
            ppaCount: Array.isArray(report.rows) ? report.rows.filter((row) => String(row.rowType || "ITEM").toUpperCase() === "ITEM").length : 0,
        }));

        res.json({ success: true, year, count: queue.length, data: queue });
    } catch (error) {
        console.error("PHYSICAL VALIDATION QUEUE:", error);
        res.status(500).json({ success: false, error: "Unable to load Physical Report validation queue." });
    }
};

export const getPhysicalAuditLogs = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") return res.status(403).json({ success: false, error: "Admin access required." });
        const year = validYear(req.query.year) ? Number(req.query.year) : null;
        const office = DEPARTMENTS.includes(req.query.office) ? req.query.office : null;
        const limit = Math.min(250, Math.max(10, Number(req.query.limit) || 100));
        const filter = { entityType: { $in: ["PhysicalReport", "QuarterSchedule"] } };
        if (year) filter.year = year;
        if (office) filter.office = office;
        const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
        res.json({ success: true, data: logs.map((log) => ({ ...log, id: log._id.toString() })) });
    } catch (error) {
        console.error("PHYSICAL AUDIT LOGS:", error);
        res.status(500).json({ success: false, error: "Unable to load Physical Report audit logs." });
    }
};
