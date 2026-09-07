import { OFFICES_BY_SECTOR } from "../src/assets/assets.jsx";
export const YEAR_NOW = new Date().getFullYear();
export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
export const FORM_TYPES = ["LBAC3", "LBAC5"];
export const STATUSES = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "RETURNED",
    "RESUBMITTED",
    "APPROVED",
    "VALIDATED",
    "COMPLETED",
    "PENDING",
    "APPROVED_BY_HEAD",
    "DENIED",
];
export const QUARTER_NAMES = { Q1: "1st Quarter", Q2: "2nd Quarter", Q3: "3rd Quarter", Q4: "4th Quarter" };
export const roles = (role) => String(role || "").trim().toUpperCase();
export const isAdminRole = (role) => roles(role) === "ADMIN";
export const isHeadRole = (role) => roles(role) === "DEPARTMENT_HEAD";
export const isEncoderRole = (role) => roles(role) === "EMPLOYEE" || roles(role) === "ENCODER" || roles(role) === "USER" || roles(role) === "OFFICE_USER";

export const num = (value, fallback = 0) => {
    if (value === "" || value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const inputNumber = (value) => value === null || value === undefined ? "" : value;

export const safeDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

export const currentQuarter = () => `Q${Math.floor(new Date().getMonth() / 3) + 1}`;

export const officeSector = (office) =>
    Object.entries(OFFICES_BY_SECTOR || {}).find(([, offices]) => offices.includes(office))?.[0] || "";


export const createQuarter = () => ({ q1: "", q2: "", q3: "", q4: "" });

export const cumulativeQuarterValue = (values, quarter) => {
    const count = QUARTERS.indexOf(String(quarter || "").toUpperCase()) + 1;
    return QUARTERS.slice(0, count > 0 ? count : QUARTERS.length)
        .reduce((total, item) => total + num(values?.[item.toLowerCase()]), 0);
};

export const newRowKey = (prefix = "row") => {
    try {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return `${prefix}-${crypto.randomUUID()}`;
        }
    } catch {
        // Fall through to a timestamp/random key for older browsers.
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createLbac3Row = (defaults = {}) => ({
    rowKey: defaults.rowKey || newRowKey("lbac3-item"),
    rowType: "ITEM",
    categoryName: defaults.categoryName || "General Service",
    ppaCode: "",
    ppaName: "",
    majorFinalOutput: "",
    performanceIndicator: "",
    targetOutput: createQuarter(),
    actualPerformance: createQuarter(),
    remarks: "",
    budgetType: defaults.budgetType || "REGULAR",
});

export const createLbac3Service = (name = "", rowKey = "") => ({
    rowKey: rowKey || newRowKey("lbac3-service"),
    rowType: "SERVICE",
    categoryName: name,
    ppaCode: "",
    ppaName: "",
    majorFinalOutput: "",
    performanceIndicator: "",
    targetOutput: createQuarter(),
    actualPerformance: createQuarter(),
    remarks: "",
    budgetType: "REGULAR",
});

export const createLbac5Row = (seed = {}) => ({
    rowType: "ITEM",
    budgetType: seed.budgetType === "SUPPLEMENTAL" ? "SUPPLEMENTAL" : "REGULAR",
    groupKey: "",
    parentGroupKey: "",
    categoryName: seed.categoryName || "General Service",
    sourceLbac3RowId: seed.sourceLbac3RowId || "",
    sourceLbac3RowKey: seed.sourceLbac3RowKey || "",
    ppaCode: seed.ppaCode || "",
    majorFinalOutput: seed.majorFinalOutput || seed.ppaName || "",
    cost: inputNumber(seed.cost),
    weight: inputNumber(seed.weight),
    targetOutput: inputNumber(seed.targetOutput),
    actualOutput: inputNumber(seed.actualOutput),
    // COA follows the reference spreadsheet formula: min(100, Actual / Target × 100).
    coaPct: inputNumber(Math.min(num(seed.targetOutput) > 0 ? (num(seed.actualOutput) / num(seed.targetOutput)) * 100 : 0, 100)),
    allotmentReleased: inputNumber(seed.allotmentReleased),
    obligationsIncurred: inputNumber(seed.obligationsIncurred),
    remarks: seed.remarks || "",
});

export const createLbac5Service = (name = "") => ({
    rowType: "GROUP",
    budgetType: "REGULAR",
    groupKey: `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    parentGroupKey: "",
    categoryName: name,
    ppaCode: "",
    majorFinalOutput: "",
    cost: "",
    weight: "",
    targetOutput: "",
    actualOutput: "",
    coaPct: "",
    allotmentReleased: "",
    obligationsIncurred: "",
    remarks: "",
});

export const createLbac5MainRow = (seed = {}) => ({
    ...createLbac5Row(seed),
    rowType: "MAIN",
    groupKey: "",
    parentGroupKey: "",
    categoryName: "",
    ppaCode: seed.ppaCode || "",
    majorFinalOutput: seed.majorFinalOutput || "",
});

export const emptyForm = (type = "LBAC3", defaults = {}) => ({
    formType: type,
    office: defaults.office || "",
    sector: defaults.sector || "",
    year: defaults.year || YEAR_NOW,
    quarter: defaults.quarter || currentQuarter(),
    periodEndDate: "",
    periodLabel: "",
    varianceAsOf: "",
    majorPpaCode: "",
    majorFinalOutput: "",
    rows: [],
    deletedRowKeys: [],
    evaluationRows: type === "LBAC5" ? [] : [],
    preparedBy: "",
});

export const normalizeQuarter = (source) => ({
    q1: inputNumber(source?.q1),
    q2: inputNumber(source?.q2),
    q3: inputNumber(source?.q3),
    q4: inputNumber(source?.q4),
});

export const normalizeLbac3Rows = (rows) => {
    const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    const normalized = safeRows.map((row) => ({
        id: row._id || row.id || "",
        rowKey: row.rowKey || row._id || row.id || newRowKey("lbac3-legacy"),
        rowType: ["SERVICE", "GROUP", "CATEGORY", "SECTION"].includes(String(row.rowType || "ITEM").toUpperCase()) || row.isService ? "SERVICE" : "ITEM",
        categoryName: row.categoryName || "General Service",
        budgetType: row.budgetType === "SUPPLEMENTAL" ? "SUPPLEMENTAL" : "REGULAR",
        ppaCode: row.ppaCode || "",
        ppaName: row.ppaName || row.majorFinalOutput || "",
        majorFinalOutput: row.majorFinalOutput || row.ppaName || "",
        performanceIndicator: row.performanceIndicator || "",
        targetOutput: normalizeQuarter(row.targetOutput),
        actualPerformance: normalizeQuarter(row.actualPerformance),
        remarks: row.remarks || "",
    }));

    // Convert older row-only records into the new Service -> PPA/Activity hierarchy
    // without deleting any existing input. Existing service rows are preserved as-is.
    if (normalized.some((row) => row.rowType === "SERVICE")) return normalized;
    const grouped = [];
    let lastCategory = null;
    normalized.forEach((row) => {
        const category = row.categoryName || "1. General Service";
        if (category !== lastCategory) {
            grouped.push(createLbac3Service(category, `legacy-service:${category}`));
            lastCategory = category;
        }
        row.categoryName = category;
        grouped.push(row);
    });
    return grouped;
};

export const normalizeLbac5Rows = (rows) => {
    const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    const normalized = [];
    let lastCategory = null;

    for (const raw of safeRows) {
        const type = String(raw.rowType || "ITEM").toUpperCase();
        if (type === "MAIN") {
            normalized.push({ ...createLbac5MainRow(), ...raw, rowType: "MAIN" });
            continue;
        }
        if (type === "GROUP" || type === "SERVICE") {
            const service = createLbac5Service(raw.categoryName || "General Service");
            service.groupKey = raw.groupKey || service.groupKey;
            normalized.push(service);
            lastCategory = service.categoryName;
            continue;
        }
        const item = createLbac5Row(raw);
        item.categoryName = raw.categoryName || lastCategory || "General Service";
        normalized.push(item);
        lastCategory = item.categoryName;
    }

    if (!normalized.some((row) => ["GROUP", "SERVICE"].includes(row.rowType))) {
        const grouped = normalized.filter((row) => row.rowType === "MAIN");
        let category = null;
        for (const item of normalized.filter((row) => row.rowType === "ITEM")) {
            const nextCategory = item.categoryName || "General Service";
            if (nextCategory !== category) {
                grouped.push(createLbac5Service(nextCategory));
                category = nextCategory;
            }
            grouped.push(item);
        }
        return grouped;
    }
    return normalized;
};

export const normalizeReport = (report) => {
    const formType = FORM_TYPES.includes(report?.formType) ? report.formType : "LBAC3";
    const rows = normalizeLbac3Rows(report?.rows);
    return {
        ...emptyForm(formType, {
            office: report?.office || "",
            sector: report?.sector || officeSector(report?.office),
            year: report?.year || YEAR_NOW,
            quarter: report?.quarter || currentQuarter(),
        }),
        id: report?.id || report?._id || null,
        formType,
        office: report?.office || "",
        sector: report?.sector || officeSector(report?.office),
        year: report?.year || YEAR_NOW,
        quarter: report?.quarter || currentQuarter(),
        periodEndDate: safeDate(report?.periodEndDate),
        periodLabel: report?.periodLabel || "",
        varianceAsOf: safeDate(report?.varianceAsOf),
        majorPpaCode: report?.majorPpaCode || rows[0]?.ppaCode || "",
        majorFinalOutput: report?.majorFinalOutput || rows[0]?.majorFinalOutput || "",
        rows,
        deletedRowKeys: [],
        evaluationRows: normalizeLbac5Rows(report?.evaluationRows),
        preparedBy: report?.preparedBy || "",
        preparedDate: safeDate(report?.preparedDate),
        officeHead: report?.officeHead || "",
        officeHeadDate: safeDate(report?.officeHeadDate),
        localPlanningCoordinator: report?.localPlanningCoordinator || "",
        localPlanningCoordinatorDate: safeDate(report?.localPlanningCoordinatorDate),
        status: report?.status || "DRAFT",
        adminRemarks: report?.adminRemarks || "",
        returnReason: report?.returnReason || "",
        signatures: report?.signatures || {},
        encoderFrozen: Boolean(report?.encoderFrozen),
        quarterClosed: Boolean(report?.quarterClosed),
        createdAt: report?.createdAt || null,
        updatedAt: report?.updatedAt || null,
    };
};

export const displayStatus = (status) => String(status || "DRAFT").replaceAll("_", " ");

export const statusClass = (status) => {
    const value = String(status || "DRAFT").toUpperCase();
    if (["APPROVED", "VALIDATED", "COMPLETED"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (["SUBMITTED", "RESUBMITTED"].includes(value)) return "border-amber-200 bg-amber-50 text-amber-700";
    if (value === "UNDER_REVIEW") return "border-blue-200 bg-blue-50 text-blue-700";
    if (["RETURNED", "DENIED"].includes(value)) return "border-rose-200 bg-rose-50 text-rose-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
};

export const physicalPoints = (pct) => {
    const value = num(pct);
    if (value >= 110) return 5;
    if (value >= 100) return 4;
    if (value >= 90) return 3;
    if (value >= 80) return 2;
    return 1;
};

export const financialPoints = (pct) => {
    const value = num(pct);
    if (value >= 100) return 5;
    if (value >= 95) return 4;
    if (value >= 90) return 3;
    if (value >= 80) return 2;
    return 1;
};

export const calculateLbac5 = (row) => {
    const weight = Math.max(0, Math.min(100, num(row.weight)));
    const target = Math.max(0, num(row.targetOutput));
    const actual = Math.max(0, num(row.actualOutput));
    const allotment = Math.max(0, num(row.allotmentReleased));
    const obligations = Math.max(0, num(row.obligationsIncurred));
    const accomplishment = target > 0 ? (actual / target) * 100 : 0;
    const absorptive = allotment > 0 ? (obligations / allotment) * 100 : 0;
    const physical = physicalPoints(accomplishment);
    const financial = financialPoints(absorptive);
    return {
        ...row,
        weight,
        target,
        actual,
        allotment,
        obligations,
        variance: actual - target,
        accomplishment,
        absorptive,
        physical,
        financial,
        // Excel formula: IF(physical % >= 100, 100, physical %).
        // COA is derived and never manually encoded.
        coaPct: Math.min(accomplishment, 100),
        physicalWeighted: physical * (weight / 100),
        financialWeighted: financial * (weight / 100),
    };
};

export const calculateLbac3Totals = (rows) => {
    const result = {
        q1: { target: 0, actual: 0, variance: 0 },
        q2: { target: 0, actual: 0, variance: 0 },
        q3: { target: 0, actual: 0, variance: 0 },
        q4: { target: 0, actual: 0, variance: 0 },
    };
    for (const row of Array.isArray(rows) ? rows : []) {
        if (String(row?.rowType || "ITEM").toUpperCase() === "SERVICE") continue;
        for (const q of QUARTERS) {
            const key = q.toLowerCase();
            result[key].target += num(row.targetOutput?.[key]);
            result[key].actual += num(row.actualPerformance?.[key]);
        }
    }
    for (const q of QUARTERS) {
        const key = q.toLowerCase();
        result[key].variance = result[key].actual - result[key].target;
    }
    return result;
};

export const money = (value) => num(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const percent = (value) => `${num(value).toFixed(2)}%`;

export const errorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (data?.details) return data.details;
    if (error?.message) return error.message;
    return fallback;
};

export const safeFilename = (value) => String(value || "physical-report").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();

export const downloadText = (filename, content, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
};
