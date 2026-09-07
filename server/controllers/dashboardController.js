import Document from "../models/Document.js";
import Employee from "../models/Employee.js";
import OfficePerformance from "../models/OfficePerformance.js";
import PhysicalReport from "../models/PhysicalReport.js";
import { DEPARTMENTS, OFFICES_BY_SECTOR, SECTORS } from "../constants/departments.js";
import CalendarActivity from "../models/CalendarActivity.js";
import SubmissionTask from "../models/SubmissionTask.js";
import QuarterSchedule from "../models/QuarterSchedule.js";

const RECENT_LIMIT = 8;
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export const DASHBOARD_DOCUMENT_TYPES = [
    {
        value: "PHYSICAL_FINANCIAL",
        label: "Physical and Financial Accomplishment Report",
    },
    {
        value: "ANNUAL_REPORT",
        label: "Annual Report",
    },
    {
        value: "CITIZENS_CHARTER",
        label: "Citizen's Charter",
    },
    {
        value: "CSM_REPORT",
        label: "Client Satisfaction Measurement Report",
    },
];

const DOCUMENT_TYPE_ALIASES = {
    PHYSICAL_FINANCIAL: [
        "physical and financial accomplishment report",
        "physical & financial accomplishment report",
        "physical financial accomplishment report",
        "physical accomplishment report",
        "lbac",
        "lbac 3",
        "lbac3",
        "lbac 5",
        "lbac5",
    ],
    ANNUAL_REPORT: ["annual report", "annual_report"],
    CITIZENS_CHARTER: ["citizen's charter", "citizens charter", "citizens_charter"],
    CSM_REPORT: [
        "client satisfaction measurement report",
        "client satisfaction measurement",
        "csm report",
        "csm",
    ],
};

const currentPeriod = () => {
    const month = new Date().getMonth() + 1;
    return {
        year: new Date().getFullYear(),
        quarter: `Q${Math.ceil(month / 3)}`,
    };
};

const safeYear = (value) => {
    const year = Number(value);
    return Number.isInteger(year) && year >= 2000 && year <= 2100
        ? year
        : null;
};

const safeQuarter = (value) =>
    QUARTERS.includes(value) ? value : null;

const normalizeOffice = (value) =>
    String(value || "").trim();

const safeOffice = (value) => {
    if (!value) return null;
    const office = String(value).trim();
    return office && DEPARTMENTS.includes(office) ? office : null;
};

const safeDocumentType = (value) =>
    DASHBOARD_DOCUMENT_TYPES.some((item) => item.value === value)
        ? value
        : null;

const safeStatusBucket = (value) =>
    ["PENDING", "APPROVED", "RETURNED"].includes(value)
        ? value
        : null;

const byPeriod = ({ year, quarter }) => ({
    ...(year ? { year } : {}),
    ...(quarter ? { quarter } : {}),
});

const statusFilter = (model, bucket) => {
    if (!bucket) return {};

    if (model === "document") {
        if (bucket === "PENDING") return { status: { $in: ["PENDING", "SUBMITTED", "UNDER_REVIEW"] } };
        if (bucket === "APPROVED") return { status: { $in: ["RECEIVED", "APPROVED", "VALIDATED", "COMPLETED"] } };
        return { status: { $in: ["ENDED", "DENIED", "RETURNED"] } };
    }

    if (model === "physical") {
        if (bucket === "PENDING") {
            return { status: { $in: ["PENDING", "SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "APPROVED_BY_HEAD", "FOR_PPDO_REVIEW"] } };
        }
        if (bucket === "APPROVED") {
            return { status: { $in: ["APPROVED", "VALIDATED", "COMPLETED"] } };
        }
        return { status: { $in: ["DENIED", "RETURNED"] } };
    }

    if (bucket === "PENDING") return { status: { $in: ["PENDING", "SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "FOR_REVIEW"] } };
    if (bucket === "APPROVED") return { status: { $in: ["APPROVED", "VALIDATED", "COMPLETED"] } };
    return { status: { $in: ["DENIED", "RETURNED"] } };
};

const documentTypeScope = (documentType) => {
    if (!documentType) {
        return {
            document: true,
            physical: true,
        };
    }

    if (documentType === "PHYSICAL_FINANCIAL") {
        return {
            document: false,
            physical: true,
        };
    }

    const aliases = DOCUMENT_TYPE_ALIASES[documentType];

    return {
        document: true,
        physical: false,
        documentMatch: {
            $or: aliases.map((value) => ({
                folder: {
                    $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                    $options: "i",
                },
            })),
        },
    };
};

const documentSummary = (item) => ({
    id: item._id.toString(),
    type: "DOCUMENT",
    name: item.name || "Document Submission",
    office: item.office || "—",
    category: item.folder || "General",
    status: item.status || "PENDING",
    remark: item.remark || "",
    createdAt: item.createdAt,
});

const physicalSummary = (item) => ({
    id: item._id.toString(),
    type: "PHYSICAL_REPORT",
    name: `${item.formType || "Physical Report"} — ${item.office || "Unknown Office"}`,
    office: item.office || "—",
    category: "Physical and Financial Accomplishment Report",
    status: item.status || "PENDING",
    remark: item.adminRemarks || "",
    createdAt: item.createdAt,
});

const performanceSummary = (item) => ({
    id: item._id.toString(),
    type: "OFFICE_PERFORMANCE",
    name: item.ppa || item.program || "Office Performance Submission",
    office: item.office || "—",
    category: "Office Performance",
    status: item.status || "PENDING",
    remark: item.adminRemarks || "",
    createdAt: item.createdAt,
});

const documentStats = async ({
    office = null,
    year,
    quarter,
    documentType = null,
    statusBucket = null,
}) => {
    const scope = documentTypeScope(documentType);

    if (!scope.document) {
        return {
            all: 0,
            pending: 0,
            approved: 0,
            returned: 0,
            recent: [],
        };
    }

    const filter = {
        kind: "SUBMISSION",
        ...byPeriod({ year, quarter }),
        ...(office ? { office } : {}),
        ...(scope.documentMatch || {}),
        ...statusFilter("document", statusBucket),
    };

    const baseFilter = {
        kind: "SUBMISSION",
        ...byPeriod({ year, quarter }),
        ...(office ? { office } : {}),
        ...(scope.documentMatch || {}),
    };

    const [all, pending, approved, returned, recent] =
        await Promise.all([
            Document.countDocuments(filter),
            Document.countDocuments({
                ...baseFilter,
                ...statusFilter("document", "PENDING"),
            }),
            Document.countDocuments({
                ...baseFilter,
                ...statusFilter("document", "APPROVED"),
            }),
            Document.countDocuments({
                ...baseFilter,
                ...statusFilter("document", "RETURNED"),
            }),
            Document.find(filter)
                .select("name office folder status remark createdAt")
                .sort({ createdAt: -1 })
                .limit(RECENT_LIMIT)
                .lean(),
        ]);

    return {
        all,
        pending,
        approved,
        returned,
        recent: recent.map(documentSummary),
    };
};

const physicalStats = async ({
    office = null,
    year,
    quarter,
    documentType = null,
    statusBucket = null,
}) => {
    const scope = documentTypeScope(documentType);

    if (!scope.physical) {
        return {
            all: 0,
            pending: 0,
            approved: 0,
            denied: 0,
            lbac3: 0,
            lbac5: 0,
            recent: [],
        };
    }

    const baseFilter = {
        ...byPeriod({ year, quarter }),
        ...(office ? { office } : {}),
    };

    const filter = {
        ...baseFilter,
        ...statusFilter("physical", statusBucket),
    };

    const [all, pending, approved, denied, lbac3, lbac5, recent] =
        await Promise.all([
            PhysicalReport.countDocuments(filter),
            PhysicalReport.countDocuments({
                ...baseFilter,
                ...statusFilter("physical", "PENDING"),
            }),
            // PhysicalReport uses VALIDATED as its final approved state.
            PhysicalReport.countDocuments({
                ...baseFilter,
                ...statusFilter("physical", "APPROVED"),
            }),
            PhysicalReport.countDocuments({
                ...baseFilter,
                ...statusFilter("physical", "RETURNED"),
            }),
            PhysicalReport.countDocuments({
                ...baseFilter,
                formType: "LBAC3",
            }),
            PhysicalReport.countDocuments({
                ...baseFilter,
                formType: "LBAC5",
            }),
            PhysicalReport.find(filter)
                .select("formType office status adminRemarks createdAt")
                .sort({ createdAt: -1 })
                .limit(RECENT_LIMIT)
                .lean(),
        ]);

    return {
        all,
        pending,
        approved,
        denied,
        lbac3,
        lbac5,
        recent: recent.map(physicalSummary),
    };
};

const officePerformanceStats = async ({
    office = null,
    year,
    quarter,
    statusBucket = null,
}) => {
    const baseFilter = {
        ...byPeriod({ year, quarter }),
        ...(office ? { office } : {}),
    };

    const filter = {
        ...baseFilter,
        ...statusFilter("performance", statusBucket),
    };

    const [
        all,
        pending,
        approved,
        denied,
        recent,
        approvedRecords,
    ] = await Promise.all([
        OfficePerformance.countDocuments(filter),
        OfficePerformance.countDocuments({
            ...baseFilter,
            ...statusFilter("performance", "PENDING"),
        }),
        OfficePerformance.countDocuments({
            ...baseFilter,
            ...statusFilter("performance", "APPROVED"),
        }),
        OfficePerformance.countDocuments({
            ...baseFilter,
            ...statusFilter("performance", "RETURNED"),
        }),
        OfficePerformance.find(filter)
            .select("ppa office status adminRemarks createdAt")
            .sort({ createdAt: -1 })
            .limit(RECENT_LIMIT)
            .lean(),
        OfficePerformance.find({
            ...baseFilter,
            ...statusFilter("performance", "APPROVED"),
        })
            .select("office totalRating")
            .lean(),
    ]);

    const officeRatings = new Map();

    for (const record of approvedRecords) {
        const officeName = normalizeOffice(record.office);
        if (!officeName) continue;

        const ratings = officeRatings.get(officeName) || [];
        ratings.push(Number(record.totalRating || 0));
        officeRatings.set(officeName, ratings);
    }

    const topOffices = [...officeRatings.entries()]
        .map(([officeName, ratings]) => ({
            office: officeName,
            overall: Number(
                (
                    ratings.reduce((sum, value) => sum + value, 0) /
                    ratings.length
                ).toFixed(2)
            ),
        }))
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 5);

    return {
        all,
        pending,
        approved,
        denied,
        averageOverall:
            topOffices.length > 0
                ? Number(
                      (
                          topOffices.reduce(
                              (sum, item) => sum + item.overall,
                              0
                          ) / topOffices.length
                      ).toFixed(2)
                  )
                : 0,
        officesReported: officeRatings.size,
        topOffices,
        recent: recent.map(performanceSummary),
    };
};

const buildOfficeBreakdown = async ({
    year,
    quarter,
    office = null,
    documentType = null,
    statusBucket = null,
}) => {
    const period = byPeriod({ year, quarter });
    const scope = documentTypeScope(documentType);
    const officeMatch = office ? { office } : {};
    const map = new Map();

    const addOffice = (name) => {
        if (!name) return;
        if (!map.has(name)) {
            map.set(name, {
                office: name,
                documents: 0,
                physicalReports: 0,
                performanceReports: 0,
                totalSubmissions: 0,
            });
        }
    };

    if (office) addOffice(office);

    const [documents, physicalReports, performanceReports] =
        await Promise.all([
            scope.document
                ? Document.aggregate([
                      {
                          $match: {
                              kind: "SUBMISSION",
                              ...period,
                              ...officeMatch,
                              ...(scope.documentMatch || {}),
                              ...statusFilter("document", statusBucket),
                              office: {
                                  ...(office
                                      ? { $eq: office }
                                      : { $nin: [null, ""] }),
                              },
                          },
                      },
                      {
                          $group: {
                              _id: "$office",
                              count: { $sum: 1 },
                          },
                      },
                  ])
                : [],
            scope.physical
                ? PhysicalReport.aggregate([
                      {
                          $match: {
                              ...period,
                              ...officeMatch,
                              ...statusFilter("physical", statusBucket),
                              office: {
                                  ...(office
                                      ? { $eq: office }
                                      : { $nin: [null, ""] }),
                              },
                          },
                      },
                      {
                          $group: {
                              _id: "$office",
                              count: { $sum: 1 },
                          },
                      },
                  ])
                : [],
            OfficePerformance.aggregate([
                {
                    $match: {
                        ...period,
                        ...officeMatch,
                        ...statusFilter("performance", statusBucket),
                        office: {
                            ...(office
                                ? { $eq: office }
                                : { $nin: [null, ""] }),
                        },
                    },
                },
                {
                    $group: {
                        _id: "$office",
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

    for (const item of documents) {
        addOffice(item._id);
        map.get(item._id).documents = item.count;
    }

    for (const item of physicalReports) {
        addOffice(item._id);
        map.get(item._id).physicalReports = item.count;
    }

    for (const item of performanceReports) {
        addOffice(item._id);
        map.get(item._id).performanceReports = item.count;
    }

    return [...map.values()]
        .map((item) => ({
            ...item,
            totalSubmissions:
                item.documents +
                item.physicalReports +
                item.performanceReports,
        }))
        .filter((item) => item.totalSubmissions > 0)
        .sort(
            (a, b) =>
                b.totalSubmissions - a.totalSubmissions ||
                a.office.localeCompare(b.office)
        );
};


const officeResultSummary = async ({
    year,
    quarter,
    office = null,
    statusBucket = null,
}) => {
    const match = {
        formType: "LBAC5",
        year,
        ...(quarter ? { quarter } : {}),
        ...(office ? { office } : {}),
        ...statusFilter("physical", statusBucket),
    };

    const rows = await PhysicalReport.aggregate([
        { $match: match },
        { $unwind: "$evaluationRows" },
        {
            $match: {
                "evaluationRows.rowType": "ITEM",
            },
        },
        {
            $group: {
                _id: "$office",
                actualPerformance: {
                    $sum: { $ifNull: ["$evaluationRows.actualOutput", 0] },
                },
                targetPerformance: {
                    $sum: { $ifNull: ["$evaluationRows.targetOutput", 0] },
                },
                allocationReleased: {
                    $sum: { $ifNull: ["$evaluationRows.allotmentReleased", 0] },
                },
                obligationsIncurred: {
                    $sum: { $ifNull: ["$evaluationRows.obligationsIncurred", 0] },
                },
                reports: { $addToSet: "$_id" },
            },
        },
        {
            $project: {
                _id: 0,
                office: "$_id",
                actualPerformance: { $round: ["$actualPerformance", 2] },
                targetPerformance: { $round: ["$targetPerformance", 2] },
                allocationReleased: { $round: ["$allocationReleased", 2] },
                obligationsIncurred: { $round: ["$obligationsIncurred", 2] },
                reportCount: { $size: "$reports" },
            },
        },
        { $sort: { office: 1 } },
    ]);

    const clean = rows.map((row) => ({
        office: row.office || "Unknown Office",
        actualPerformance: Number(row.actualPerformance || 0),
        targetPerformance: Number(row.targetPerformance || 0),
        allocationReleased: Number(row.allocationReleased || 0),
        obligationsIncurred: Number(row.obligationsIncurred || 0),
        reportCount: Number(row.reportCount || 0),
    }));

    return {
        actualPerformance: clean.map((row) => ({
            office: row.office,
            value: row.actualPerformance,
        })),
        allocationReleased: clean.map((row) => ({
            office: row.office,
            value: row.allocationReleased,
        })),
        obligationsIncurred: clean.map((row) => ({
            office: row.office,
            value: row.obligationsIncurred,
        })),
        rows: clean,
    };
};

const getRecentActivity = async ({
    year,
    quarter,
    office = null,
    documentType = null,
    statusBucket = null,
}) => {
    const period = byPeriod({ year, quarter });
    const scope = documentTypeScope(documentType);

    const commonOffice = office ? { office } : {};
    const commonStatus = (model) =>
        statusFilter(model, statusBucket);

    const [documents, physicalReports, performanceReports] =
        await Promise.all([
            scope.document
                ? Document.find({
                      kind: "SUBMISSION",
                      ...period,
                      ...commonOffice,
                      ...(scope.documentMatch || {}),
                      ...commonStatus("document"),
                  })
                      .select(
                          "name office folder status remark createdAt"
                      )
                      .sort({ createdAt: -1 })
                      .limit(RECENT_LIMIT)
                      .lean()
                : [],
            scope.physical
                ? PhysicalReport.find({
                      ...period,
                      ...commonOffice,
                      ...commonStatus("physical"),
                  })
                      .select(
                          "formType office status adminRemarks createdAt"
                      )
                      .sort({ createdAt: -1 })
                      .limit(RECENT_LIMIT)
                      .lean()
                : [],
            OfficePerformance.find({
                ...period,
                ...commonOffice,
                ...commonStatus("performance"),
            })
                .select(
                    "ppa office status adminRemarks createdAt"
                )
                .sort({ createdAt: -1 })
                .limit(RECENT_LIMIT)
                .lean(),
        ]);

    return [
        ...documents.map(documentSummary),
        ...physicalReports.map(physicalSummary),
        ...performanceReports.map(performanceSummary),
    ]
        .sort(
            (a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
        )
        .slice(0, RECENT_LIMIT);
};



const buildQuarterMatrix = async ({ year, office = null }) => {
    const officeMatch = office ? { office } : { office: { $nin: [null, ""] } };
    const rows = await PhysicalReport.aggregate([
        { $match: { year, ...officeMatch, formType: "LBAC3" } },
        {
            $group: {
                _id: { office: "$office", quarter: "$quarter" },
                count: { $sum: 1 },
                pending: { $sum: { $cond: [{ $in: ["$status", ["PENDING", "SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"]] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $in: ["$status", ["APPROVED", "VALIDATED", "COMPLETED"]] }, 1, 0] } },
                headApproved: { $sum: { $cond: [{ $eq: ["$status", "APPROVED_BY_HEAD"] }, 1, 0] } },
                returned: { $sum: { $cond: [{ $in: ["$status", ["DENIED", "RETURNED"]] }, 1, 0] } },
            },
        },
    ]);

    const map = new Map();
    for (const officeName of office ? [office] : DEPARTMENTS) {
        map.set(officeName, {
            office: officeName,
            Q1: { count: 0, pending: 0, headApproved: 0, approved: 0, returned: 0 },
            Q2: { count: 0, pending: 0, headApproved: 0, approved: 0, returned: 0 },
            Q3: { count: 0, pending: 0, headApproved: 0, approved: 0, returned: 0 },
            Q4: { count: 0, pending: 0, headApproved: 0, approved: 0, returned: 0 },
        });
    }
    for (const row of rows) {
        const officeData = map.get(row._id.office);
        const quarterData = officeData?.[row._id.quarter];
        if (!quarterData) continue;
        quarterData.count = Number(row.count || 0);
        quarterData.pending = Number(row.pending || 0);
        quarterData.headApproved = Number(row.headApproved || 0);
        quarterData.approved = Number(row.approved || 0);
        quarterData.returned = Number(row.returned || 0);
    }
    return [...map.values()];
};


const FINAL_PHYSICAL_STATUSES = new Set(["APPROVED", "VALIDATED", "COMPLETED"]);
const ACTIVE_PHYSICAL_STATUSES = new Set(["PENDING", "SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "APPROVED_BY_HEAD", "FOR_PPDO_REVIEW"]);
const RETURNED_PHYSICAL_STATUSES = new Set(["RETURNED", "DENIED"]);

const complianceStatus = (statuses) => {
    const values = [...statuses].filter(Boolean);
    if (!values.length) return "MISSING";
    if (values.some((status) => RETURNED_PHYSICAL_STATUSES.has(status))) return "RETURNED";
    if (values.some((status) => ACTIVE_PHYSICAL_STATUSES.has(status))) return "IN_REVIEW";
    if (values.every((status) => FINAL_PHYSICAL_STATUSES.has(status))) return "VALIDATED";
    return "SUBMITTED";
};

const buildSectorCompliance = ({ offices, officeGroupsByQuarter }) => {
    const sectors = SECTORS.map((sector) => {
        const sectorOffices = offices.filter((office) => OFFICES_BY_SECTOR[sector]?.includes(office));
        const quarters = Object.fromEntries(QUARTERS.map((quarter) => {
            let complete = 0;
            let partial = 0;
            let missing = 0;
            let inReview = 0;
            let returned = 0;
            let validated = 0;

            for (const office of sectorOffices) {
                const groups = officeGroupsByQuarter.get(`${office}::${quarter}`) || [];
                if (!groups.length) {
                    missing += 1;
                    continue;
                }
                const hasIncompletePair = groups.some((group) => !group.hasLBAC3 || !group.hasLBAC5);
                const hasReturned = groups.some((group) => group.statuses.some((status) => RETURNED_PHYSICAL_STATUSES.has(status)));
                const hasReview = groups.some((group) => group.statuses.some((status) => ACTIVE_PHYSICAL_STATUSES.has(status)));
                const allValidated = groups.every((group) => group.hasLBAC3 && group.hasLBAC5 && group.statuses.length > 0 && group.statuses.every((status) => FINAL_PHYSICAL_STATUSES.has(status)));

                if (hasIncompletePair) partial += 1;
                else complete += 1;
                if (hasReturned) returned += 1;
                if (hasReview) inReview += 1;
                if (allValidated) validated += 1;
            }

            const total = sectorOffices.length;
            return [quarter, {
                total,
                complete,
                partial,
                missing,
                inReview,
                returned,
                validated,
                compliancePct: total ? Number(((complete / total) * 100).toFixed(1)) : 0,
                validationPct: total ? Number(((validated / total) * 100).toFixed(1)) : 0,
            }];
        }));

        const quarterValues = Object.values(quarters);
        const totalExpected = quarterValues.reduce((sum, item) => sum + item.total, 0);
        const totalComplete = quarterValues.reduce((sum, item) => sum + item.complete, 0);
        const totalPartial = quarterValues.reduce((sum, item) => sum + item.partial, 0);
        const totalMissing = quarterValues.reduce((sum, item) => sum + item.missing, 0);

        return {
            sector,
            offices: sectorOffices.length,
            quarters,
            complete: totalComplete,
            partial: totalPartial,
            missing: totalMissing,
            compliancePct: totalExpected ? Number(((totalComplete / totalExpected) * 100).toFixed(1)) : 0,
            validationPct: totalExpected ? Number(((quarterValues.reduce((sum, item) => sum + item.validated, 0) / totalExpected) * 100).toFixed(1)) : 0,
        };
    });

    const totalExpected = sectors.reduce((sum, sector) => sum + sector.offices * QUARTERS.length, 0);
    const totalComplete = sectors.reduce((sum, sector) => sum + sector.complete, 0);
    const totalPartial = sectors.reduce((sum, sector) => sum + sector.partial, 0);
    const totalMissing = sectors.reduce((sum, sector) => sum + sector.missing, 0);

    return {
        sectors,
        provincial: {
            offices: offices.length,
            expected: totalExpected,
            complete: totalComplete,
            partial: totalPartial,
            missing: totalMissing,
            compliancePct: totalExpected ? Number(((totalComplete / totalExpected) * 100).toFixed(1)) : 0,
        },
    };
};

const getComplianceTaskState = (task, now = new Date()) => {
    if (!task) return { state: "NO_SCHEDULE", daysRemaining: null };
    if (!task.active) return { state: "CLOSED", daysRemaining: null };

    const start = new Date(task.startDate);
    const due = new Date(task.dueDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) {
        return { state: "NO_SCHEDULE", daysRemaining: null };
    }

    if (now < start) {
        return {
            state: "NOT_YET_DUE",
            daysRemaining: Math.ceil((start.getTime() - now.getTime()) / 86400000),
        };
    }

    const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / 86400000);
    if (daysRemaining < 0) return { state: "OVERDUE", daysRemaining };
    if (daysRemaining <= 7) return { state: "DUE_SOON", daysRemaining };
    return { state: "OPEN", daysRemaining };
};

const taskMatchesComplianceGroup = (task, group) => {
    if (!task || !group) return false;
    if (task.reportGroupId && String(task.reportGroupId) !== String(group.reportGroupId || "")) return false;
    if (task.reportTitle && String(task.reportTitle).trim() !== String(group.reportTitle || "").trim()) return false;
    return true;
};

const pickComplianceTasks = ({ tasks, office, quarter, group }) => {
    const candidates = tasks.filter((task) => {
        if (task.office && task.office !== "ALL" && task.office !== office) return false;
        if (task.quarter && task.quarter !== quarter) return false;
        if (group && !taskMatchesComplianceGroup(task, group)) return false;
        return true;
    });

    return candidates.sort((a, b) => {
        const officeRank = (item) => item.office === office ? 0 : 1;
        const groupRank = (item) => item.reportGroupId ? 0 : 1;
        const titleRank = (item) => item.reportTitle ? 0 : 1;
        return officeRank(a) - officeRank(b)
            || groupRank(a) - groupRank(b)
            || titleRank(a) - titleRank(b)
            || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
};

const summarizeComplianceDeadline = ({ tasks, office, quarter, groups }) => {
    const now = new Date();
    const allTasks = [];
    const seen = new Set();

    const addTasks = (items) => {
        for (const task of items) {
            const id = String(task._id);
            if (seen.has(id)) continue;
            seen.add(id);
            allTasks.push(task);
        }
    };

    for (const group of groups) {
        addTasks(pickComplianceTasks({ tasks, office, quarter, group }));
    }
    if (!groups.length) addTasks(pickComplianceTasks({ tasks, office, quarter, group: null }));

    if (!allTasks.length) {
        return {
            state: "NO_SCHEDULE",
            daysRemaining: null,
            startDate: null,
            dueDate: null,
            taskCount: 0,
            taskIds: [],
            titles: [],
        };
    }

    const states = allTasks.map((task) => ({ task, ...getComplianceTaskState(task, now) }));
    const priority = ["OVERDUE", "DUE_SOON", "OPEN", "NOT_YET_DUE", "CLOSED"];
    const selected = states.sort((a, b) => priority.indexOf(a.state) - priority.indexOf(b.state))[0];

    const dueDates = states
        .map((item) => new Date(item.task.dueDate))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a - b);
    const startDates = states
        .map((item) => new Date(item.task.startDate))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a - b);

    return {
        state: selected.state,
        daysRemaining: selected.daysRemaining,
        startDate: startDates[0] || null,
        dueDate: dueDates[0] || null,
        taskCount: allTasks.length,
        taskIds: allTasks.map((task) => String(task._id)),
        titles: [...new Set(allTasks.map((task) => task.title).filter(Boolean))],
    };
};

const resolveComplianceCell = ({ groups, schedule }) => {
    if (!groups.length) {
        return {
            status: schedule.state === "NO_SCHEDULE" ? "MISSING" : schedule.state,
            groups: 0,
            completeGroups: 0,
            partialGroups: 0,
            lbac3: 0,
            lbac5: 0,
            validated: 0,
            deadlineState: schedule.state,
            daysRemaining: schedule.daysRemaining,
            startDate: schedule.startDate,
            dueDate: schedule.dueDate,
            scheduleTitle: schedule.titles?.[0] || "",
            taskCount: schedule.taskCount,
        };
    }

    const completeGroups = groups.filter((group) => group.hasLBAC3 && group.hasLBAC5).length;
    const partialGroups = groups.length - completeGroups;
    const validated = groups.filter((group) =>
        group.hasLBAC3 &&
        group.hasLBAC5 &&
        group.statuses.length > 0 &&
        group.statuses.every((status) => FINAL_PHYSICAL_STATUSES.has(status))
    ).length;
    const hasReturned = groups.some((group) => group.status === "RETURNED");
    const hasReview = groups.some((group) => group.status === "IN_REVIEW");

    let status;
    if (partialGroups > 0) status = "PARTIAL";
    else if (hasReturned) status = "RETURNED";
    else if (hasReview) status = "IN_REVIEW";
    else if (validated === groups.length) status = "VALIDATED";
    else status = "SUBMITTED";

    return {
        status,
        groups: groups.length,
        completeGroups,
        partialGroups,
        lbac3: groups.filter((group) => group.hasLBAC3).length,
        lbac5: groups.filter((group) => group.hasLBAC5).length,
        validated,
        deadlineState: schedule.state,
        daysRemaining: schedule.daysRemaining,
        startDate: schedule.startDate,
        dueDate: schedule.dueDate,
        scheduleTitle: schedule.titles?.[0] || "",
        taskCount: schedule.taskCount,
    };
};

const buildComplianceOverview = async ({ year, office = null }) => {
    const offices = office ? [office] : DEPARTMENTS;
    const match = {
        year,
        formType: { $in: ["LBAC3", "LBAC5"] },
        quarter: { $in: QUARTERS },
        ...(office ? { office } : {}),
    };

    const [rows, tasks] = await Promise.all([
        PhysicalReport.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { office: "$office", quarter: "$quarter", reportGroupId: "$reportGroupId" },
                    forms: { $addToSet: "$formType" },
                    statuses: { $addToSet: "$status" },
                    reportTitles: { $addToSet: "$reportTitle" },
                },
            },
        ]),
        SubmissionTask.find({
            year,
            active: true,
            formType: { $in: ["LBAC3", "LBAC5"] },
            quarter: { $in: ["", ...QUARTERS] },
            ...(office ? { office: { $in: ["ALL", office] } } : { office: { $in: ["ALL", ...DEPARTMENTS] } }),
        })
            .select("_id title office formType quarter reportTitle reportGroupId startDate dueDate active")
            .sort({ dueDate: 1, startDate: 1 })
            .lean(),
    ]);

    const officeGroupsByQuarter = new Map();
    for (const row of rows) {
        const officeName = row?._id?.office;
        const quarter = row?._id?.quarter;
        if (!officeName || !quarter) continue;
        const key = `${officeName}::${quarter}`;
        const groups = officeGroupsByQuarter.get(key) || [];
        groups.push({
            reportGroupId: row?._id?.reportGroupId || "",
            hasLBAC3: (row.forms || []).includes("LBAC3"),
            hasLBAC5: (row.forms || []).includes("LBAC5"),
            statuses: (row.statuses || []).filter(Boolean),
            status: complianceStatus(row.statuses || []),
            reportTitle: (row.reportTitles || []).find(Boolean) || "",
        });
        officeGroupsByQuarter.set(key, groups);
    }

    const officeQuarterDetails = new Map();
    for (const officeName of offices) {
        for (const quarter of QUARTERS) {
            const groups = officeGroupsByQuarter.get(`${officeName}::${quarter}`) || [];
            const schedule = summarizeComplianceDeadline({ tasks, office: officeName, quarter, groups });
            officeQuarterDetails.set(`${officeName}::${quarter}`, resolveComplianceCell({ groups, schedule }));
        }
    }

    const sectorCompliance = buildSectorCompliance({ offices, officeGroupsByQuarter });

    // Add deadline intelligence to each sector/quarter without changing the existing
    // complete/partial/missing counts used by the dashboard calculations.
    sectorCompliance.sectors = sectorCompliance.sectors.map((sector) => ({
        ...sector,
        quarters: Object.fromEntries(QUARTERS.map((quarter) => {
            const officeCells = sector.offices
                ? offices
                    .filter((officeName) => OFFICES_BY_SECTOR[sector.sector]?.includes(officeName))
                    .map((officeName) => officeQuarterDetails.get(`${officeName}::${quarter}`))
                : [];
            const deadlineCounts = officeCells.reduce((acc, cell) => {
                const key = cell?.deadlineState || "NO_SCHEDULE";
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const dueDates = officeCells.map((cell) => cell?.dueDate).filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
            return [quarter, {
                ...(sector.quarters?.[quarter] || {}),
                deadlineCounts,
                nextDueDate: dueDates[0] || null,
                overdue: deadlineCounts.OVERDUE || 0,
                dueSoon: deadlineCounts.DUE_SOON || 0,
                notYetDue: deadlineCounts.NOT_YET_DUE || 0,
                scheduled: officeCells.filter((cell) => cell?.deadlineState && cell.deadlineState !== "NO_SCHEDULE").length,
            }];
        })),
    }));

    const officeDetails = offices.map((officeName) => ({
        office: officeName,
        sector: SECTORS.find((sector) => OFFICES_BY_SECTOR[sector]?.includes(officeName)) || "Unassigned Sector",
        quarters: Object.fromEntries(QUARTERS.map((quarter) => [
            quarter,
            officeQuarterDetails.get(`${officeName}::${quarter}`),
        ])),
    }));

    const allCells = officeDetails.flatMap((item) => QUARTERS.map((quarter) => item.quarters[quarter]));
    const deadlineSummary = allCells.reduce((acc, cell) => {
        const status = cell?.status || "MISSING";
        const deadlineState = cell?.deadlineState || "NO_SCHEDULE";
        const deadlineRelevant = !["VALIDATED", "IN_REVIEW", "SUBMITTED"].includes(status);
        if (deadlineRelevant) {
            acc[deadlineState] = (acc[deadlineState] || 0) + 1;
        }
        if (status === "VALIDATED") acc.VALIDATED = (acc.VALIDATED || 0) + 1;
        if (status === "IN_REVIEW") acc.IN_REVIEW = (acc.IN_REVIEW || 0) + 1;
        if (status === "PARTIAL") acc.PARTIAL = (acc.PARTIAL || 0) + 1;
        if (status === "RETURNED") acc.RETURNED = (acc.RETURNED || 0) + 1;
        if (status === "SUBMITTED") acc.SUBMITTED = (acc.SUBMITTED || 0) + 1;
        return acc;
    }, {});

    return {
        ...sectorCompliance,
        officeDetails,
        deadlineSummary,
    };
};

const analyticsStatusFilter = (statusBucket) =>
    statusBucket ? statusFilter("physical", statusBucket) : {
        status: { $in: ["APPROVED", "VALIDATED", "COMPLETED"] },
    };

const buildFinancialOverview = async ({ year, quarter, office = null, statusBucket = null }) => {
    const match = {
        year,
        ...(quarter ? { quarter } : {}),
        formType: "LBAC5",
        ...(office ? { office } : {}),
        ...analyticsStatusFilter(statusBucket),
    };
    const [row] = await PhysicalReport.aggregate([
        { $match: match },
        { $unwind: "$evaluationRows" },
        { $match: { "evaluationRows.rowType": "ITEM" } },
        {
            $group: {
                _id: null,
                target: { $sum: { $ifNull: ["$evaluationRows.targetOutput", 0] } },
                actual: { $sum: { $ifNull: ["$evaluationRows.actualOutput", 0] } },
                allocation: { $sum: { $ifNull: ["$evaluationRows.allotmentReleased", 0] } },
                obligations: { $sum: { $ifNull: ["$evaluationRows.obligationsIncurred", 0] } },
                physicalWeightedScore: { $sum: { $ifNull: ["$evaluationRows.physicalWeightedScore", 0] } },
                financialWeightedScore: { $sum: { $ifNull: ["$evaluationRows.financialWeightedScore", 0] } },
                coaTotal: { $sum: { $ifNull: ["$evaluationRows.coaPct", 0] } },
                coaCount: { $sum: 1 },
            },
        },
    ]);
    const target = Number(row?.target || 0);
    const actual = Number(row?.actual || 0);
    const allocation = Number(row?.allocation || 0);
    const obligations = Number(row?.obligations || 0);
    const physicalWeightedScore = Number(Number(row?.physicalWeightedScore || 0).toFixed(2));
    const financialWeightedScore = Number(Number(row?.financialWeightedScore || 0).toFixed(2));
    return {
        target,
        actual,
        variance: Number((actual - target).toFixed(2)),
        accomplishment: target > 0 ? Number(((actual / target) * 100).toFixed(2)) : 0,
        allocation,
        obligations,
        financialVariance: Number((allocation - obligations).toFixed(2)),
        absorptiveCapacity: allocation > 0 ? Number(((obligations / allocation) * 100).toFixed(2)) : 0,
        physicalWeightedScore,
        financialWeightedScore,
        overallWeightedScore: Number((physicalWeightedScore + financialWeightedScore).toFixed(2)),
        averageCoa: row?.coaCount ? Number((Number(row.coaTotal || 0) / Number(row.coaCount)).toFixed(2)) : 0,
    };
};


const buildOfficeHealth = async ({ year, quarter, office = null }) => {
    const offices = office ? [office] : DEPARTMENTS;
    const matchBase = {
        year,
        ...(quarter ? { quarter } : {}),
        formType: "LBAC3",
        ...(office ? { office } : {}),
    };

    const rows = await PhysicalReport.aggregate([
        { $match: matchBase },
        {
            $project: {
                office: 1,
                status: 1,
                target: {
                    $sum: [
                        { $ifNull: ["$rows.actualPerformance.q1", 0] },
                        { $ifNull: ["$rows.actualPerformance.q2", 0] },
                        { $ifNull: ["$rows.actualPerformance.q3", 0] },
                        { $ifNull: ["$rows.actualPerformance.q4", 0] },
                    ],
                },
            },
        },
    ]);

    // The aggregation above deliberately keeps the query lightweight. Detailed
    // per-office totals are read from the saved LBAC rows below.
    const resultMap = new Map(
        offices.map((officeName) => [officeName, {
            office: officeName,
            reportExists: false,
            status: "NOT_STARTED",
            target: 0,
            actual: 0,
            variance: 0,
            accomplishment: 0,
            completeness: 0,
        }])
    );

    const reports = await PhysicalReport.find(matchBase)
        .select("office status rows")
        .lean();

    for (const report of reports) {
        const entry = resultMap.get(report.office);
        if (!entry) continue;
        entry.reportExists = true;
        entry.status = report.status || "PENDING";

        let target = 0;
        let actual = 0;
        let targetSlots = 0;
        let actualSlots = 0;

        for (const row of report.rows || []) {
            if (String(row?.rowType || "ITEM").toUpperCase() === "SERVICE") continue;
            const targetOutput = row.targetOutput || {};
            const actualOutput = row.actualPerformance || {};
            target += Number(targetOutput.total || 0);
            actual += Number(actualOutput.total || 0);
            for (const key of ["q1", "q2", "q3", "q4"]) {
                if (targetOutput[key] !== null && targetOutput[key] !== undefined && targetOutput[key] !== "") targetSlots += 1;
                if (actualOutput[key] !== null && actualOutput[key] !== undefined && actualOutput[key] !== "") actualSlots += 1;
            }
        }

        entry.target = Number(target.toFixed(2));
        entry.actual = Number(actual.toFixed(2));
        entry.variance = Number((actual - target).toFixed(2));
        entry.accomplishment = target > 0 ? Number(((actual / target) * 100).toFixed(2)) : 0;
        entry.completeness = targetSlots + actualSlots > 0
            ? Number((((targetSlots + actualSlots) / Math.max((report.rows?.filter((r) => String(r?.rowType || "ITEM").toUpperCase() !== "SERVICE").length || 1) * 8, 1)) * 100).toFixed(2))
            : 0;
    }

    return [...resultMap.values()].sort((a, b) => {
        const rank = (item) => ({ VALIDATED: 0, APPROVED: 1, APPROVED_BY_HEAD: 2, FOR_PPDO_REVIEW: 3, UNDER_REVIEW: 4, SUBMITTED: 5, PENDING: 6, RETURNED: 7, DENIED: 8, NOT_STARTED: 9 }[item.status] ?? 10);
        return rank(a) - rank(b) || a.office.localeCompare(b.office);
    });
};

const buildActionCenter = async ({ year, quarter, office = null }) => {
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + 30);
    const officeMatch = office ? { office } : {};

    const [tasks, events, schedule] = await Promise.all([
        SubmissionTask.find({ year, active: true, ...officeMatch, dueDate: { $gte: now, $lte: until } })
            .select("title office formType quarter dueDate startDate")
            .sort({ dueDate: 1 })
            .limit(8)
            .lean(),
        CalendarActivity.find({ visibility: "ALL_USERS", startAt: { $gte: now, $lte: until } })
            .select("title category startAt endAt location")
            .sort({ startAt: 1 })
            .limit(8)
            .lean(),
        QuarterSchedule.find({ year, enabled: true }).select("quarter openAt closeAt notes").sort({ quarter: 1 }).lean(),
    ]);

    const deadlines = schedule.map((item) => ({
        quarter: item.quarter,
        openAt: item.openAt,
        closeAt: item.closeAt,
        notes: item.notes || "",
    }));

    return {
        upcomingTasks: tasks.map((item) => ({
            id: item._id.toString(),
            title: item.title,
            office: item.office || "All Offices",
            formType: item.formType,
            quarter: item.quarter || "",
            dueDate: item.dueDate,
            startDate: item.startDate,
        })),
        upcomingActivities: events.map((item) => ({
            id: item._id.toString(),
            title: item.title,
            category: item.category,
            startAt: item.startAt,
            endAt: item.endAt,
            location: item.location || "",
        })),
        quarterSchedule: deadlines,
    };
};

const buildOfficeResultLeaderboard = async ({ year, quarter, office = null, statusBucket = null }) => {
    const match = {
        year,
        ...(quarter ? { quarter } : {}),
        formType: "LBAC5",
        ...(office ? { office } : {}),
        ...analyticsStatusFilter(statusBucket),
    };
    const rows = await PhysicalReport.aggregate([
        { $match: match },
        { $unwind: "$evaluationRows" },
        { $match: { "evaluationRows.rowType": "ITEM" } },
        {
            $group: {
                _id: { office: "$office", reportGroupId: "$reportGroupId" },
                target: { $sum: { $ifNull: ["$evaluationRows.targetOutput", 0] } },
                actual: { $sum: { $ifNull: ["$evaluationRows.actualOutput", 0] } },
                allocation: { $sum: { $ifNull: ["$evaluationRows.allotmentReleased", 0] } },
                obligations: { $sum: { $ifNull: ["$evaluationRows.obligationsIncurred", 0] } },
                physicalWeightedScore: { $sum: { $ifNull: ["$evaluationRows.physicalWeightedScore", 0] } },
                financialWeightedScore: { $sum: { $ifNull: ["$evaluationRows.financialWeightedScore", 0] } },
                coa: { $avg: { $ifNull: ["$evaluationRows.coaPct", 0] } },
            },
        },
        {
            $group: {
                _id: "$_id.office",
                target: { $sum: "$target" },
                actual: { $sum: "$actual" },
                allocation: { $sum: "$allocation" },
                obligations: { $sum: "$obligations" },
                physicalWeightedScore: { $avg: "$physicalWeightedScore" },
                financialWeightedScore: { $avg: "$financialWeightedScore" },
                coa: { $avg: "$coa" },
                reports: { $sum: 1 },
            },
        },
        { $sort: { actual: -1 } },
    ]);
    return rows.map((row) => {
        const target = Number(row.target || 0);
        const actual = Number(row.actual || 0);
        const allocation = Number(row.allocation || 0);
        const obligations = Number(row.obligations || 0);
        const physicalWeightedScore = Number(Number(row.physicalWeightedScore || 0).toFixed(2));
        const financialWeightedScore = Number(Number(row.financialWeightedScore || 0).toFixed(2));
        return {
            office: row._id || "Unknown Office",
            target,
            actual,
            variance: Number((actual - target).toFixed(2)),
            accomplishment: target > 0 ? Number(((actual / target) * 100).toFixed(2)) : 0,
            allocation,
            obligations,
            financialVariance: Number((allocation - obligations).toFixed(2)),
            absorptiveCapacity: allocation > 0 ? Number(((obligations / allocation) * 100).toFixed(2)) : 0,
            coa: Number(Number(row.coa || 0).toFixed(2)),
            physicalWeightedScore,
            financialWeightedScore,
            overallWeightedScore: Number((physicalWeightedScore + financialWeightedScore).toFixed(2)),
            reportCount: Number(row.reports || 0),
        };
    });
};


const buildSectorPerformance = async ({ year, quarter, office = null, statusBucket = null }) => {
    const match = {
        year,
        ...(quarter ? { quarter } : {}),
        formType: "LBAC5",
        ...(office ? { office } : {}),
        ...analyticsStatusFilter(statusBucket),
    };

    const rows = await PhysicalReport.aggregate([
        { $match: match },
        { $unwind: "$evaluationRows" },
        { $match: { "evaluationRows.rowType": "ITEM" } },
        {
            $group: {
                _id: {
                    sector: { $ifNull: ["$sector", "Unassigned Sector"] },
                    office: "$office",
                    reportGroupId: "$reportGroupId",
                },
                target: { $sum: { $ifNull: ["$evaluationRows.targetOutput", 0] } },
                actual: { $sum: { $ifNull: ["$evaluationRows.actualOutput", 0] } },
                allocation: { $sum: { $ifNull: ["$evaluationRows.allotmentReleased", 0] } },
                obligations: { $sum: { $ifNull: ["$evaluationRows.obligationsIncurred", 0] } },
                physicalWeightedScore: { $sum: { $ifNull: ["$evaluationRows.physicalWeightedScore", 0] } },
                financialWeightedScore: { $sum: { $ifNull: ["$evaluationRows.financialWeightedScore", 0] } },
                coaTotal: { $sum: { $ifNull: ["$evaluationRows.coaPct", 0] } },
                coaCount: { $sum: { $cond: [{ $ne: [{ $ifNull: ["$evaluationRows.coaPct", null] }, null] }, 1, 0] } },
            },
        },
        {
            $group: {
                _id: "$_id.sector",
                offices: { $addToSet: "$_id.office" },
                reports: { $sum: 1 },
                target: { $sum: "$target" },
                actual: { $sum: "$actual" },
                allocation: { $sum: "$allocation" },
                obligations: { $sum: "$obligations" },
                physicalWeightedScore: { $avg: "$physicalWeightedScore" },
                financialWeightedScore: { $avg: "$financialWeightedScore" },
                coaTotal: { $sum: "$coaTotal" },
                coaCount: { $sum: "$coaCount" },
            },
        },
        { $sort: { actual: -1, _id: 1 } },
    ]);

    return rows.map((row) => {
        const target = Number(row.target || 0);
        const actual = Number(row.actual || 0);
        const allocation = Number(row.allocation || 0);
        const obligations = Number(row.obligations || 0);
        const physicalWeightedScore = Number(Number(row.physicalWeightedScore || 0).toFixed(2));
        const financialWeightedScore = Number(Number(row.financialWeightedScore || 0).toFixed(2));
        return {
            sector: row._id || "Unassigned Sector",
            officeCount: (row.offices || []).filter(Boolean).length,
            reportCount: Number(row.reports || 0),
            target,
            actual,
            variance: Number((actual - target).toFixed(2)),
            accomplishment: target > 0 ? Number(((actual / target) * 100).toFixed(2)) : 0,
            allocation,
            obligations,
            financialVariance: Number((allocation - obligations).toFixed(2)),
            absorptiveCapacity: allocation > 0 ? Number(((obligations / allocation) * 100).toFixed(2)) : 0,
            coa: Number(row.coaCount || 0) > 0 ? Number((Number(row.coaTotal || 0) / Number(row.coaCount)).toFixed(2)) : 0,
            physicalWeightedScore,
            financialWeightedScore,
            overallWeightedScore: Number((physicalWeightedScore + financialWeightedScore).toFixed(2)),
        };
    });
};

const buildProvincialPerformance = async ({ year, quarter, office = null, statusBucket = null }) => {
    const sectors = await buildSectorPerformance({ year, quarter, office, statusBucket });
    return sectors.reduce((total, row) => ({
        officeCount: total.officeCount + row.officeCount,
        reportCount: total.reportCount + row.reportCount,
        target: Number((total.target + row.target).toFixed(2)),
        actual: Number((total.actual + row.actual).toFixed(2)),
        variance: Number((total.variance + row.variance).toFixed(2)),
        allocation: Number((total.allocation + row.allocation).toFixed(2)),
        obligations: Number((total.obligations + row.obligations).toFixed(2)),
        financialVariance: Number((total.financialVariance + row.financialVariance).toFixed(2)),
    }), {
        officeCount: 0, reportCount: 0, target: 0, actual: 0, variance: 0,
        allocation: 0, obligations: 0, financialVariance: 0,
    });
};


const getWorkflowCounts = async ({ year, quarter, office = null }) => {
    const physicalMatch = { year, ...(quarter ? { quarter } : {}), ...(office ? { office } : {}) };
    const documentMatch = { kind: "SUBMISSION", year, ...(quarter ? { quarter } : {}), ...(office ? { office } : {}) };
    const performanceMatch = { year, ...(quarter ? { quarter } : {}), ...(office ? { office } : {}) };

    const [physical, documents, performance] = await Promise.all([
        PhysicalReport.aggregate([{ $match: physicalMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        Document.aggregate([{ $match: documentMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        OfficePerformance.aggregate([{ $match: performanceMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const out = { pending: 0, forHeadApproval: 0, forPPDOReview: 0, approved: 0, returned: 0 };
    for (const row of physical) {
        const n = Number(row.count || 0);
        if (["PENDING", "SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(row._id)) out.pending += n;
        if (row._id === "APPROVED_BY_HEAD") out.forHeadApproval += n;
        if (row._id === "FOR_PPDO_REVIEW") out.forPPDOReview += n;
        if (["APPROVED", "VALIDATED", "COMPLETED"].includes(row._id)) out.approved += n;
        if (["DENIED", "RETURNED"].includes(row._id)) out.returned += n;
    }
    for (const row of documents) {
        const n = Number(row.count || 0);
        if (["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(row._id)) out.pending += n;
        if (["RECEIVED", "APPROVED", "VALIDATED", "COMPLETED"].includes(row._id)) out.approved += n;
        if (["ENDED", "DENIED", "RETURNED"].includes(row._id)) out.returned += n;
    }
    for (const row of performance) {
        const n = Number(row.count || 0);
        if (["PENDING", "SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "FOR_REVIEW"].includes(row._id)) out.pending += n;
        if (["APPROVED", "VALIDATED", "COMPLETED"].includes(row._id)) out.approved += n;
        if (["DENIED", "RETURNED"].includes(row._id)) out.returned += n;
    }
    return out;
};

export const getDashboard = async (req, res) => {
    try {
        const defaultPeriod = currentPeriod();

        const year =
            safeYear(req.query.year) || defaultPeriod.year;

        const quarter =
            safeQuarter(req.query.quarter) ||
            defaultPeriod.quarter;

        const office = safeOffice(req.query.office);
        const documentType = safeDocumentType(
            req.query.documentType
        );
        const statusBucket = safeStatusBucket(
            req.query.status
        );

        if (req.session.role === "ADMIN") {
            const [
                documents,
                physicalReports,
                performance,
                activeUsers,
                officeBreakdown,
                recentActivity,
                resultSummary,
                workflowCounts,
                financialOverview,
                officeLeaderboard,
                sectorPerformance,
                provincialPerformance,
                quarterMatrix,
                actionCenter,
                officeHealth,
                complianceOverview,
            ] = await Promise.all([
                documentStats({
                    year,
                    quarter,
                    office,
                    documentType,
                    statusBucket,
                }),
                physicalStats({
                    year,
                    quarter,
                    office,
                    documentType,
                    statusBucket,
                }),
                officePerformanceStats({
                    year,
                    quarter,
                    office,
                    statusBucket,
                }),
                Employee.countDocuments({
                    isDeleted: { $ne: true },
                    employmentStatus: "ACTIVE",
                }),
                buildOfficeBreakdown({
                    year,
                    quarter,
                    office,
                    documentType,
                    statusBucket,
                }),
                getRecentActivity({
                    year,
                    quarter,
                    office,
                    documentType,
                    statusBucket,
                }),
                officeResultSummary({
                    year,
                    quarter,
                    office,
                    statusBucket,
                }),
                getWorkflowCounts({ year, quarter, office }),
                buildFinancialOverview({ year, quarter, office, statusBucket }),
                buildOfficeResultLeaderboard({ year, quarter, office, statusBucket }),
                buildSectorPerformance({ year, quarter, office, statusBucket }),
                buildProvincialPerformance({ year, quarter, office, statusBucket }),
                buildQuarterMatrix({ year, office }),
                buildActionCenter({ year, quarter, office }),
                buildOfficeHealth({ year, quarter, office }),
                buildComplianceOverview({ year, office }),
            ]);

            const totalSubmissions =
                documents.all +
                physicalReports.all +
                performance.all;

            const pendingReviews =
                documents.pending +
                physicalReports.pending +
                performance.pending;

            const approvedItems =
                documents.approved +
                physicalReports.approved +
                performance.approved;

            const returnedItems =
                documents.returned +
                physicalReports.denied +
                performance.denied;

            return res.json({
                success: true,
                period: { year, quarter },
                filters: {
                    office,
                    documentType,
                    status: statusBucket,
                },
                options: {
                    offices: DEPARTMENTS,
                    documentTypes: DASHBOARD_DOCUMENT_TYPES,
                    statuses: [
                        { value: "PENDING", label: "Pending" },
                        { value: "APPROVED", label: "Approved" },
                        { value: "RETURNED", label: "Returned / Denied" },
                    ],
                },
                totalDepartments: DEPARTMENTS.length,
                totalEmployees: activeUsers,
                stats: {
                    totalSubmissions,
                    pendingReviews,
                    approvedItems,
                    returnedItems,
                    officesReporting: officeBreakdown.length,
                },
                documents,
                physicalReports,
                performance,
                officeBreakdown,
                recentActivity,
                resultSummary,
                workflowCounts,
                financialOverview,
                officeLeaderboard,
                sectorPerformance,
                provincialPerformance,
                quarterMatrix,
                actionCenter,
                officeHealth,
                complianceOverview,
                provincialOverview: {
                    totalOffices: officeHealth.length,
                    reporting: officeHealth.filter((item) => item.reportExists).length,
                    validated: officeHealth.filter((item) => ["VALIDATED", "APPROVED", "COMPLETED"].includes(item.status)).length,
                    forReview: officeHealth.filter((item) => ["PENDING", "SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "APPROVED_BY_HEAD", "FOR_PPDO_REVIEW"].includes(item.status)).length,
                    returned: officeHealth.filter((item) => ["RETURNED", "DENIED"].includes(item.status)).length,
                    notStarted: officeHealth.filter((item) => item.status === "NOT_STARTED").length,
                },
            });
        }

        const employee = await Employee.findOne({
            userID: req.session.id,
            isDeleted: { $ne: true },
        })
            .select(
                "firstName lastName department position employmentStatus"
            )
            .lean();

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Your account has no assigned office.",
            });
        }

        const userOffice = employee.department;

        const [documents, physicalReports, performance] =
            await Promise.all([
                documentStats({
                    office: userOffice,
                    year,
                    quarter,
                }),
                physicalStats({
                    office: userOffice,
                    year,
                    quarter,
                }),
                officePerformanceStats({
                    office: userOffice,
                    year,
                    quarter,
                }),
            ]);

        return res.json({
            success: true,
            period: { year, quarter },
            employee,
            stats: {
                totalSubmissions:
                    documents.all +
                    physicalReports.all +
                    performance.all,
                pendingReviews:
                    documents.pending +
                    physicalReports.pending +
                    performance.pending,
                approvedItems:
                    documents.approved +
                    physicalReports.approved +
                    performance.approved,
                returnedItems:
                    documents.returned +
                    physicalReports.denied +
                    performance.denied,
            },
            documents,
            physicalReports,
            performance,
            recentActivity: await getRecentActivity({
                office: userOffice,
                year,
                quarter,
            }),
        });
    } catch (error) {
        console.error("DASHBOARD ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to load dashboard.",
        });
    }
};
