import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    Check,
    ChevronLeft,
    ChevronDown,
    Copy,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    Plus,
    RefreshCw,
    Search,
    Send,
    ShieldCheck,
    Trash2,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import ExcelJS from "exceljs";
import api from "../api/axios.js";
import { OFFICES_BY_SECTOR } from "../assets/assets.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { calculateLbac5Row } from "../utils/lbac5Calculations.js";

const YEAR_NOW = new Date().getFullYear();
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const FORM_TYPES = ["LBAC3", "LBAC5"];
const STATUSES = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "RETURNED",
    "RESUBMITTED",
    "APPROVED",
    "VALIDATED",
    "COMPLETED",
    "APPROVED_BY_ADMIN",
    "DENIED",
];
const QUARTER_NAMES = { Q1: "1st Quarter", Q2: "2nd Quarter", Q3: "3rd Quarter", Q4: "4th Quarter" };

const roleOf = (role) => String(role || "").trim().toUpperCase();
const isAdminRole = (role) => roleOf(role) === "ADMIN";
const isHeadRole = (role) => roleOf(role) === "DEPARTMENT_HEAD";
const isEncoderRole = (role) => ["EMPLOYEE", "ENCODER", "USER", "OFFICE_USER"].includes(roleOf(role));

const num = (value, fallback = 0) => {
    if (value === "" || value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const safeDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const currentQuarter = () => `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
const money = (value) => num(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = (value) => `${num(value).toFixed(2)}%`;
const displayStatus = (status) => String(status || "DRAFT").replaceAll("_", " ");
const nextActionFor = (status, role) => {
    const value = roleOf(status);
    const currentRole = roleOf(role);
    if (currentRole === "ADMIN") {
        if (["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN"].includes(value)) return "PPDO/Admin: Validate this approved report.";
        if (["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW"].includes(value)) return "Waiting for Approval Head review.";
        if (["RETURNED", "DENIED"].includes(value)) return "Encoder must correct and resubmit this report.";
        if (["VALIDATED", "COMPLETED"].includes(value)) return "No action — report is frozen.";
        return "Create/carry forward or monitor the encoder submission.";
    }
    if (currentRole === "DEPARTMENT_HEAD") {
        if (["SUBMITTED", "RESUBMITTED", "PENDING"].includes(value)) return "Approval Head: Review and approve or return with remarks.";
        if (value === "UNDER_REVIEW") return "Approval Head: Complete the review.";
        if (["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(value)) return "No action — awaiting the next PPDO step.";
        return "Waiting for the office encoder.";
    }
    if (["RETURNED", "DENIED"].includes(value)) return "Encoder: Correct the remarks and resubmit.";
    if (value === "DRAFT") return "Encoder: Complete LBAC 3/LBAC 5 and submit.";
    if (value === "SUBMITTED" || value === "UNDER_REVIEW" || value === "RESUBMITTED") return "Waiting for Approval Head review.";
    if (["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(value)) return "No action — report is locked for the encoder.";
    return "Continue encoding the current quarter.";
};
const statusClass = (status) => {
    const value = roleOf(status);
    if (["APPROVED", "VALIDATED", "COMPLETED"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (["SUBMITTED", "RESUBMITTED"].includes(value)) return "border-amber-200 bg-amber-50 text-amber-700";
    if (value === "UNDER_REVIEW") return "border-blue-200 bg-blue-50 text-blue-700";
    if (["RETURNED", "DENIED"].includes(value)) return "border-rose-200 bg-rose-50 text-rose-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
};
const errorMessage = (error, fallback) => error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
const safeFilename = (value) => String(value || "physical-report").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
const officeSector = (office) => Object.entries(OFFICES_BY_SECTOR || {}).find(([, offices]) => offices.includes(office))?.[0] || "";
const newRowKey = () => `lbac-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const createQuarter = () => ({ q1: "", q2: "", q3: "", q4: "" });
const rowTypeOf = (row) => String(row?.rowType || "ITEM").toUpperCase();
const isLbac3Heading = (row) => ["MAIN", "GROUP", "SERVICE", "SECTION", "CATEGORY"].includes(rowTypeOf(row));
const isLbac3Item = (row) => rowTypeOf(row) === "ITEM";
const hasLbac3Content = (row) => {
    if (!row) return false;
    const quarterValues = [
        row.targetOutput?.q1, row.targetOutput?.q2, row.targetOutput?.q3, row.targetOutput?.q4,
        row.actualPerformance?.q1, row.actualPerformance?.q2, row.actualPerformance?.q3, row.actualPerformance?.q4,
    ];
    return [
        row.ppaCode, row.ppaName, row.majorFinalOutput, row.categoryName, row.performanceIndicator, row.remarks,
        ...quarterValues,
    ].some((value) => String(value ?? "").trim() !== "");
};

const createLbac3Row = (type = "ITEM") => {
    const normalized = String(type || "ITEM").toUpperCase();
    const rowType = normalized === "MAIN" ? "MAIN" : normalized === "GROUP" || normalized === "SERVICE" ? "GROUP" : "ITEM";
    const rowKey = newRowKey();
    return {
        rowKey,
        rowType,
        categoryName: "",
        ppaCode: "",
        ppaName: "",
        majorFinalOutput: "",
        performanceIndicator: "",
        targetOutput: createQuarter(),
        actualPerformance: createQuarter(),
        remarks: "",
        budgetType: "REGULAR",
        headingLevel: rowType === "MAIN" ? 0 : rowType === "GROUP" ? 1 : 4,
        groupKey: rowType === "GROUP" ? rowKey : "",
        parentGroupKey: "",
    };
};

const createLbac5Row = (source = {}, financial = {}) => {
    const sourceType = String(source?.rowType || "ITEM").toUpperCase();
    const isMain = sourceType === "MAIN";
    const isHeading = ["MAIN", "GROUP", "SERVICE", "SECTION", "CATEGORY"].includes(sourceType);

    if (isHeading) {
        return {
            rowKey: source.rowKey || newRowKey(),
            rowType: isMain ? "MAIN" : "GROUP",
            categoryName: source.categoryName || source.majorFinalOutput || source.ppaName || "",
            groupKey: source.groupKey || "",
            parentGroupKey: source.parentGroupKey || "",
            headingLevel: isMain ? 0 : Number(source.headingLevel ?? 1),
            sourceLbac3RowKey: source.rowKey || source.sourceLbac3RowKey || "",
            sourceLbac3RowId: source._id || source.sourceLbac3RowId || "",
            ppaCode: "",
            majorFinalOutput: source.majorFinalOutput || source.categoryName || source.ppaName || "",
            performanceIndicator: "",
            targetOutput: 0,
            actualOutput: 0,
            cost: 0,
            weight: 0,
            allotmentReleased: 0,
            obligationsIncurred: 0,
            remarks: "",
            coaPct: "",
        };
    }

    return {
        rowKey: source.rowKey || newRowKey(),
        rowType: "ITEM",
        categoryName: source.categoryName || "",
        groupKey: source.groupKey || "",
        parentGroupKey: source.parentGroupKey || "",
        headingLevel: Number(source.headingLevel ?? 4),
        sourceLbac3RowKey: source.rowKey || source.sourceLbac3RowKey || "",
        sourceLbac3RowId: source._id || source.sourceLbac3RowId || "",
        ppaCode: source.ppaCode || "",
        majorFinalOutput: source.ppaName || source.majorFinalOutput || "",
        performanceIndicator: source.performanceIndicator || "",
        targetOutput: financial.targetOutput ?? "",
        actualOutput: financial.actualOutput ?? "",
        cost: financial.cost ?? "",
        weight: financial.weight ?? "",
        allotmentReleased: financial.allotmentReleased ?? "",
        obligationsIncurred: financial.obligationsIncurred ?? "",
        remarks: financial.remarks ?? "",
        coaPct: "",
    };
};

const emptyForm = (type = "LBAC3", defaults = {}) => ({
    id: null,
    formType: type,
    office: defaults.office || "",
    sector: defaults.sector || "",
    year: Number(defaults.year || YEAR_NOW),
    quarter: defaults.quarter || currentQuarter(),
    reportGroupId: defaults.reportGroupId || "",
    reportTitle: defaults.reportTitle || "",
    periodEndDate: "",
    periodLabel: "",
    majorPpaCode: "",
    majorFinalOutput: "",
    rows: type === "LBAC3" ? [] : [],
    evaluationRows: type === "LBAC5" ? [] : [],
    deletedRowKeys: [],
    preparedBy: "",
    preparedDate: "",
    officeHead: "",
    officeHeadDate: "",
    localPlanningCoordinator: "",
    localPlanningCoordinatorDate: "",
    signatures: {},
    status: "DRAFT",
    adminRemarks: "",
    returnReason: "",
    encoderFrozen: false,
    quarterClosed: false,
    updatedAt: null,
});

const normalizeQuarter = (value) => ({
    q1: value?.q1 ?? "",
    q2: value?.q2 ?? "",
    q3: value?.q3 ?? "",
    q4: value?.q4 ?? "",
});

const normalizeLbac3Rows = (rows) => (Array.isArray(rows) ? rows : []).filter(Boolean).map((raw) => ({
    id: raw._id || raw.id || "",
    rowKey: raw.rowKey || raw._id || raw.id || newRowKey(),
    rowType: ["MAIN","GROUP","SERVICE","SECTION","CATEGORY","ITEM"].includes(String(raw.rowType || "ITEM").toUpperCase()) ? String(raw.rowType || "ITEM").toUpperCase() : "ITEM",
    headingLevel: Number.isFinite(Number(raw.headingLevel)) ? Number(raw.headingLevel) : 4,
    groupKey: raw.groupKey || "",
    parentGroupKey: raw.parentGroupKey || "",
    categoryName: raw.categoryName || raw.service || "",
    ppaCode: raw.ppaCode || "",
    ppaName: raw.ppaName || raw.majorFinalOutput || "",
    majorFinalOutput: raw.majorFinalOutput || raw.ppaName || "",
    performanceIndicator: raw.performanceIndicator || "",
    targetOutput: normalizeQuarter(raw.targetOutput),
    actualPerformance: normalizeQuarter(raw.actualPerformance),
    remarks: raw.remarks || "",
    budgetType: raw.budgetType === "SUPPLEMENTAL" ? "SUPPLEMENTAL" : "REGULAR",
}));

const normalizeLbac5Rows = (rows) => (Array.isArray(rows) ? rows : [])
    .filter(Boolean)
    .map((raw) => {
        const rowType = String(raw?.rowType || "ITEM").toUpperCase();
        if (["MAIN", "GROUP", "SERVICE", "SECTION", "CATEGORY"].includes(rowType)) {
            return {
                ...createLbac5Row(raw),
                ...raw,
                rowType: rowType === "MAIN" ? "MAIN" : "GROUP",
                categoryName: raw.categoryName || raw.majorFinalOutput || raw.ppaName || "",
                majorFinalOutput: raw.majorFinalOutput || raw.categoryName || raw.ppaName || "",
            };
        }
        const hasContent = [raw.ppaName, raw.majorFinalOutput, raw.performanceIndicator, raw.ppaCode, raw.sourceLbac3RowKey, raw.sourceLbac3RowId]
            .some((value) => String(value ?? "").trim());
        if (!hasContent) return null;
        return {
            ...createLbac5Row(raw),
            ...raw,
            rowType: "ITEM",
        };
    })
    .filter(Boolean);

const normalizeReport = (report) => {
    const formType = FORM_TYPES.includes(report?.formType) ? report.formType : "LBAC3";
    const rows = normalizeLbac3Rows(report?.rows);
    return {
        ...emptyForm(formType, {
            office: report?.office,
            sector: report?.sector || officeSector(report?.office),
            year: report?.year,
            quarter: report?.quarter,
        }),
        id: report?.id || report?._id || null,
        formType,
        office: report?.office || "",
        sector: report?.sector || officeSector(report?.office),
        year: Number(report?.year || YEAR_NOW),
        quarter: report?.quarter || currentQuarter(),
        reportGroupId: report?.reportGroupId || "",
        reportTitle: report?.reportTitle || "",
        periodEndDate: safeDate(report?.periodEndDate),
        periodLabel: report?.periodLabel || "",
        majorPpaCode: report?.majorPpaCode || rows[0]?.ppaCode || "",
        majorFinalOutput: report?.majorFinalOutput || rows[0]?.ppaName || "",
        rows,
        evaluationRows: normalizeLbac5Rows(report?.evaluationRows),
        preparedBy: report?.preparedBy || "",
        preparedDate: safeDate(report?.preparedDate),
        createdBy: report?.createdBy || null,
        createdByName: report?.createdByName || "",
        editedBy: report?.editedBy || null,
        editedByName: report?.editedByName || "",
        editedAt: safeDate(report?.editedAt),
        carriedForwardFromReport: report?.carriedForwardFromReport || null,
        carriedForwardFromQuarter: report?.carriedForwardFromQuarter || "",
        carriedForwardAt: safeDate(report?.carriedForwardAt),
        carriedForwardBy: report?.carriedForwardBy || null,
        carriedForwardByName: report?.carriedForwardByName || "",
        officeHead: report?.officeHead || "",
        officeHeadDate: safeDate(report?.officeHeadDate),
        localPlanningCoordinator: report?.localPlanningCoordinator || "",
        localPlanningCoordinatorDate: safeDate(report?.localPlanningCoordinatorDate),
        signatures: report?.signatures || {},
        status: report?.status || "DRAFT",
        adminRemarks: report?.adminRemarks || "",
        returnReason: report?.returnReason || "",
        encoderFrozen: Boolean(report?.encoderFrozen),
        quarterClosed: Boolean(report?.quarterClosed),
        updatedAt: report?.updatedAt || null,
    };
};

const isHeadingRow = (row) => ["MAIN","GROUP","SERVICE","SECTION","CATEGORY"].includes(String(row?.rowType || "ITEM").toUpperCase());

const rowQuarterTotal = (row, bucket) => QUARTERS.reduce((sum, q) => sum + num(row?.[bucket]?.[q.toLowerCase()]), 0);

const headingTotalsFor = (rows, heading) => {
    const level = Number(heading?.headingLevel ?? 1);
    const start = rows.indexOf(heading);
    const end = rows.findIndex((candidate, i) => i > start && isHeadingRow(candidate) && Number(candidate?.headingLevel ?? 1) <= level);
    const children = rows.slice(start + 1, end < 0 ? rows.length : end).filter((row) => !isHeadingRow(row));
    return {
        target: QUARTERS.reduce((sum,q)=>sum+children.reduce((s,r)=>s+num(r.targetOutput?.[q.toLowerCase()]),0),0),
        actual: QUARTERS.reduce((sum,q)=>sum+children.reduce((s,r)=>s+num(r.actualPerformance?.[q.toLowerCase()]),0),0),
    };
};

const calculateLbac3Totals = (rows) => {
    const totals = Object.fromEntries(QUARTERS.map((quarter) => [quarter.toLowerCase(), { target: 0, actual: 0, variance: 0 }]));
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        for (const quarter of QUARTERS) {
            const key = quarter.toLowerCase();
            totals[key].target += num(row.targetOutput?.[key]);
            totals[key].actual += num(row.actualPerformance?.[key]);
        }
    });
    QUARTERS.forEach((quarter) => {
        const key = quarter.toLowerCase();
        totals[key].variance = totals[key].actual - totals[key].target;
    });
    return totals;
};

const cumulativeQuarterValue = (value, quarter) => {
    const count = QUARTERS.indexOf(String(quarter || "Q1").toUpperCase()) + 1;
    return QUARTERS.slice(0, count).reduce((total, item) => total + num(value?.[item.toLowerCase()]), 0);
};

const calculateLbac5 = (row) => calculateLbac5Row(row);

const errorOrStale = (error) => error?.response?.status === 409 && error?.response?.data?.code === "REPORT_VERSION_CONFLICT";

function Field({ label, children, hint, className = "" }) {
    return (
        <label className={`block ${className}`}>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
            {children}
            {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
        </label>
    );
}

function StatusBadge({ status }) {
    return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(status)}`}>{displayStatus(status)}</span>;
}

function OfficePicker({ value, onChange, disabled = false, officeGroups }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const pickerRef = useRef(null);
    const normalizedSearch = search.trim().toLowerCase();
    const selectedSector = officeSector(value);
    const selectedLabel = value || "Select office";

    useEffect(() => {
        if (!open) return undefined;
        const handleOutside = (event) => {
            if (!pickerRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [open]);

    return (
        <div ref={pickerRef} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className={`pr-input flex items-center justify-between gap-3 text-left ${disabled ? "locked" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={value ? "text-slate-800" : "text-slate-400"}>{selectedLabel}</span>
                <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && !disabled ? (
                <div className="absolute left-0 right-0 z-[80] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 p-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                            <input
                                autoFocus
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400"
                                placeholder="Search office..."
                            />
                        </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-1.5">
                        {officeGroups.map(([sector, offices]) => {
                            const visibleOffices = offices.filter((office) => !normalizedSearch || `${office} ${sector}`.toLowerCase().includes(normalizedSearch));
                            if (!visibleOffices.length) return null;
                            return (
                                <div key={sector} className="mb-1 last:mb-0">
                                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-indigo-500">{sector}</div>
                                    {visibleOffices.map((office) => (
                                        <button
                                            type="button"
                                            key={office}
                                            role="option"
                                            aria-selected={office === value}
                                            onClick={() => {
                                                onChange(office);
                                                setSearch("");
                                                setOpen(false);
                                            }}
                                            className={`block w-full rounded-lg px-3 py-2 text-left text-xs transition ${office === value ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}
                                        >
                                            {office}
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                        {!officeGroups.some(([, offices]) => offices.some((office) => !normalizedSearch || `${office}`.toLowerCase().includes(normalizedSearch))) ? (
                            <div className="px-3 py-6 text-center text-xs text-slate-400">No matching office found.</div>
                        ) : null}
                    </div>
                    {value ? <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">Sector: <strong className="text-slate-700">{selectedSector || "Unclassified"}</strong></div> : null}
                </div>
            ) : null}
        </div>
    );
}

export default function PhysicalReport() {
    const { user } = useAuth();
    const role = roleOf(user?.role);
    const isAdmin = isAdminRole(role);
    const isHead = isHeadRole(role);
    const canEncode = isEncoderRole(role) || isAdmin;

    const [view, setView] = useState("list");
    const [editorTab, setEditorTab] = useState("LBAC3");
    const [reports, setReports] = useState([]);
    const [form, setForm] = useState(emptyForm());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadingSource, setLoadingSource] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [userOffice, setUserOffice] = useState("");
    const [filters, setFilters] = useState({ search: "", office: "", formType: "ALL", status: "ALL", quarter: "ALL", year: YEAR_NOW });
    const [returnDialog, setReturnDialog] = useState({ open: false, report: null, remarks: "" });
    const [approvalDialog, setApprovalDialog] = useState({ open: false, report: null, officeHead: "", localPlanningCoordinator: "", officeHeadFile: null, coordinatorFile: null });
    const [submissionTasks, setSubmissionTasks] = useState([]);
    const [loadingSubmissionTasks, setLoadingSubmissionTasks] = useState(false);
    const requestIdRef = useRef(0);
    const sourceRequestRef = useRef(0);
    const abortRef = useRef(null);

    const officeGroups = useMemo(() => Object.entries(OFFICES_BY_SECTOR || {}), []);
    const isReportLocked = Boolean(form.id) && !isAdmin && ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_ADMIN"].includes(roleOf(form.status));
    const selectedQuarterClosed = Boolean(form.quarterClosed);
    const editorLocked = isReportLocked || (!isAdmin && selectedQuarterClosed);
    const workflowStage = useMemo(() => {
        if (isAdmin) return { label: "PPDO / Admin", text: "Create or carry forward the office report, then validate the approved submission." };
        if (isHead) return { label: "Approval Head", text: "Review the office encoder's submission, return it with remarks when corrections are needed, or approve it." };
        return { label: "Office Encoder", text: "Review the Admin-carried-forward data, update the current quarter, then submit it for Approval Head review." };
    }, [isAdmin, isHead]);

    const filteredReports = useMemo(() => {
        const search = filters.search.trim().toLowerCase();
        return reports.filter((report) => {
            if (filters.office && report.office !== filters.office) return false;
            if (filters.formType !== "ALL" && report.formType !== filters.formType) return false;
            if (filters.status !== "ALL" && roleOf(report.status) !== filters.status) return false;
            if (filters.quarter !== "ALL" && roleOf(report.quarter) !== filters.quarter) return false;
            if (search) {
                const text = [report.office, report.reportTitle, report.formType, report.majorPpaCode, report.majorFinalOutput, report.status].filter(Boolean).join(" ").toLowerCase();
                if (!text.includes(search)) return false;
            }
            return true;
        });
    }, [filters, reports]);

    const reportGroups = useMemo(() => {
        const groups = new Map();
        filteredReports.forEach((report) => {
            const title = String(report.reportTitle || "Untitled Report").trim() || "Untitled Report";
            const groupKey = report.reportGroupId
                ? `group:${report.reportGroupId}`
                : `fallback:${report.office}|${report.year}|${title}`;
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    key: groupKey,
                    office: report.office,
                    sector: report.sector || officeSector(report.office),
                    year: report.year,
                    reportTitle: title,
                    reports: [],
                });
            }
            groups.get(groupKey).reports.push(report);
        });
        return Array.from(groups.values())
            .map((group) => ({
                ...group,
                reports: [...group.reports].sort((a, b) => {
                    const quarterDiff = QUARTERS.indexOf(a.quarter) - QUARTERS.indexOf(b.quarter);
                    if (quarterDiff) return quarterDiff;
                    return a.formType.localeCompare(b.formType);
                }),
            }))
            .sort((a, b) => `${a.sector}|${a.office}|${a.reportTitle}`.localeCompare(`${b.sector}|${b.office}|${b.reportTitle}`));
    }, [filteredReports]);

    const stats = useMemo(() => ({
        total: filteredReports.length,
        pending: filteredReports.filter((report) => ["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW"].includes(roleOf(report.status))).length,
        returned: filteredReports.filter((report) => ["RETURNED", "DENIED"].includes(roleOf(report.status))).length,
        completed: filteredReports.filter((report) => ["APPROVED", "VALIDATED", "COMPLETED"].includes(roleOf(report.status))).length,
    }), [filteredReports]);

    const roleQueue = useMemo(() => {
        if (isAdmin) {
            return {
                title: "PPDO / Admin Action Queue",
                description: "Validate approved submissions and monitor reports moving through the office workflow.",
                action: filteredReports.filter((report) => ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN"].includes(roleOf(report.status))).length,
                actionLabel: "For Validation",
            };
        }
        if (isHead) {
            return {
                title: "Approval Head Action Queue",
                description: "Review submitted reports, then approve or return them with clear correction remarks.",
                action: filteredReports.filter((report) => ["SUBMITTED", "RESUBMITTED", "PENDING", "UNDER_REVIEW"].includes(roleOf(report.status))).length,
                actionLabel: "Needs Review",
            };
        }
        return {
            title: "Office Encoder Action Queue",
            description: "Complete the current quarter, respond to returned reports, and submit the LBAC 5 evaluation for review.",
            action: filteredReports.filter((report) => ["DRAFT", "RETURNED", "DENIED"].includes(roleOf(report.status))).length,
            actionLabel: "For Encoding",
        };
    }, [filteredReports, isAdmin, isHead]);

    const lbac3Totals = useMemo(() => calculateLbac3Totals(form.rows), [form.rows]);
    const lbac5Calculated = useMemo(() => form.evaluationRows.map(calculateLbac5), [form.evaluationRows]);
    const lbac5ItemRows = useMemo(() => lbac5Calculated.filter((row) => row.rowType === "ITEM"), [lbac5Calculated]);
    const lbac5Totals = useMemo(() => {
        return {
            weight: lbac5ItemRows.reduce((sum, row) => sum + row.weight, 0),
            physical: lbac5ItemRows.reduce((sum, row) => sum + row.physicalWeighted, 0),
            financial: lbac5ItemRows.reduce((sum, row) => sum + row.financialWeighted, 0),
            allotment: lbac5ItemRows.reduce((sum, row) => sum + row.allotment, 0),
            obligations: lbac5ItemRows.reduce((sum, row) => sum + row.obligations, 0),
            financialVariance: lbac5ItemRows.reduce((sum, row) => sum + row.financialVariance, 0),
            averageCoa: lbac5ItemRows.length
                ? lbac5ItemRows.reduce((sum, row) => sum + row.coa, 0) / lbac5ItemRows.length
                : 0,
        };
    }, [lbac5ItemRows]);

    const loadReports = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        setError("");
        try {
            const params = { year: Number(filters.year) || YEAR_NOW };
            if (filters.search.trim()) params.search = filters.search.trim();
            if (isAdmin && filters.office) params.office = filters.office;
            if (filters.formType !== "ALL") params.formType = filters.formType;
            if (filters.status !== "ALL") params.status = filters.status;
            if (filters.quarter !== "ALL") params.quarter = filters.quarter;
            const { data } = await api.get("/physical-reports", { params, signal: controller.signal });
            if (requestId === requestIdRef.current) setReports((Array.isArray(data?.data) ? data.data : []).map(normalizeReport));
        } catch (requestError) {
            const cancelled = requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError" || requestError?.name === "AbortError";
            if (!cancelled && requestId === requestIdRef.current) setError(errorMessage(requestError, "Unable to load Physical Reports."));
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, [filters, isAdmin]);

    const loadSubmissionTasks = useCallback(async ({ office, year, quarter = "", formType = "" } = {}) => {
        if (!year) {
            setSubmissionTasks([]);
            return [];
        }
        setLoadingSubmissionTasks(true);
        try {
            const params = { year: Number(year), ...(office ? { office } : {}) };
            if (quarter) params.quarter = quarter;
            if (formType) params.formType = formType;
            const { data } = await api.get("/submission-tasks", { params });
            const tasks = Array.isArray(data?.data) ? data.data : [];
            setSubmissionTasks(tasks);
            return tasks;
        } catch (requestError) {
            console.warn("SUBMISSION TASKS:", requestError);
            setSubmissionTasks([]);
            return [];
        } finally {
            setLoadingSubmissionTasks(false);
        }
    }, []);

    const activeSubmissionTask = useMemo(() => {
        const candidates = submissionTasks.filter((task) => {
            if (Number(task.year) !== Number(form.year)) return false;
            if (task.quarter !== form.quarter) return false;
            if (task.formType !== editorTab) return false;
            if (task.office && task.office !== "ALL" && task.office !== form.office) return false;
            return true;
        });
        if (!candidates.length) return null;
        const title = String(form.reportTitle || "").trim().toLowerCase();
        return candidates.find((task) => String(task.reportTitle || "").trim().toLowerCase() === title && title)
            || candidates.find((task) => !String(task.reportTitle || "").trim())
            || candidates[0];
    }, [editorTab, form.office, form.quarter, form.reportTitle, form.year, submissionTasks]);

    useEffect(() => {
        const office = view === "editor" ? form.office : (isAdmin ? filters.office : userOffice);
        const year = view === "editor" ? form.year : filters.year;
        if (!year) return undefined;
        const timer = setTimeout(() => {
            loadSubmissionTasks({ office, year });
        }, 100);
        return () => clearTimeout(timer);
    }, [filters.office, filters.year, form.office, form.year, isAdmin, loadSubmissionTasks, userOffice, view]);

    useEffect(() => {
        let active = true;
        if (isAdmin) return undefined;
        api.get("/officePerformance/my-office")
            .then(({ data }) => {
                if (!active) return;
                setUserOffice(data?.data?.office || "");
            })
            .catch(() => {
                if (!active) return;
                setUserOffice("");
            });
        return () => { active = false; };
    }, [isAdmin]);

    useEffect(() => {
        const timer = setTimeout(loadReports, 150);
        return () => clearTimeout(timer);
    }, [loadReports]);

    useEffect(() => () => abortRef.current?.abort(), []);

    const openEditor = useCallback((report) => {
        const normalized = normalizeReport(report);
        setForm(normalized);
        setEditorTab(normalized.formType);
        setNotice("");
        setError("");
        setView("editor");
    }, []);

    const resetEditor = (type, office, year, quarter) => {
        const next = emptyForm(type, { office, sector: officeSector(office), year, quarter });
        const periodMonth = { Q1: 3, Q2: 6, Q3: 9, Q4: 12 }[quarter] || 3;
        const date = new Date(Number(year), periodMonth, 0).toISOString().slice(0, 10);
        next.periodEndDate = date;
        next.periodLabel = `${["March", "June", "September", "December"][periodMonth / 3 - 1]} ${year}`;
        setForm(next);
        setEditorTab(type);
        setNotice("");
        setError("");
        setView("editor");
    };

    const startCreate = async () => {
        if (!canEncode) return;
        const year = Number(filters.year) || YEAR_NOW;
        const quarter = filters.quarter !== "ALL" ? filters.quarter : currentQuarter();
        const office = isAdmin ? filters.office : userOffice;
        if (!office) {
            toast.error("Select an office first.");
            return;
        }
        // New Report always creates a new report group. Multiple reports for the
        // same office/year/quarter are intentionally supported.
        resetEditor("LBAC3", office, year, quarter);
    };

    const loadLbac3Source = useCallback(async ({ office, year, quarter, reportGroupId = "", applyToEditor = true } = {}) => {
        if (!office || !year || !quarter) return null;
        const requestId = ++sourceRequestRef.current;
        setLoadingSource(true);
        try {
            const { data } = await api.get("/physical-reports/lbac3-source", { params: { office, year, quarter, reportGroupId: reportGroupId || undefined } });
            const source = data?.data || null;
            if (requestId !== sourceRequestRef.current) return null;
            if (applyToEditor && source) {
                setForm((current) => ({
                    ...current,
                    office: source.office || current.office,
                    sector: source.sector || current.sector,
                    year: Number(source.year || current.year),
                    quarter: source.quarter || current.quarter,
                    majorPpaCode: source.majorPpaCode || current.majorPpaCode,
                    majorFinalOutput: source.majorFinalOutput || current.majorFinalOutput,
                    rows: normalizeLbac3Rows(source.rows),
                }));
                setNotice(source.mode === "TEMPLATE" ? "Existing annual LBAC 3 structure loaded." : `LBAC 3 ${quarter} is loaded.`);
            }
            return source;
        } catch (requestError) {
            if (requestId === sourceRequestRef.current) setNotice(errorMessage(requestError, "No existing LBAC 3 source was found. You can start encoding below."));
            return null;
        } finally {
            if (requestId === sourceRequestRef.current) setLoadingSource(false);
        }
    }, []);

    useEffect(() => {
        if (view !== "editor" || editorTab !== "LBAC3" || !form.office || !form.year || !form.quarter || form.rows.length) return;
        const timer = setTimeout(() => loadLbac3Source({ office: form.office, year: form.year, quarter: form.quarter, reportGroupId: form.reportGroupId }), 100);
        return () => clearTimeout(timer);
    }, [editorTab, form.office, form.quarter, form.reportGroupId, form.year, form.rows.length, loadLbac3Source, view]);

    const syncLbac5FromLbac3 = useCallback(async () => {
        if (!form.office || !form.year || !form.quarter) return;

        // LBAC 3 and LBAC 5 are separate database records. When the encoder
        // switches tabs from LBAC 3, never keep the LBAC 3 id on the LBAC 5
        // editor. Doing so would PUT the LBAC 5 payload into the LBAC 3 record.
        let pairedLbac5 = null;
        if (form.reportGroupId) {
            try {
                const pairResponse = await api.get("/physical-reports", {
                    params: {
                        office: form.office,
                        year: form.year,
                        quarter: form.quarter,
                        formType: "LBAC5",
                        reportGroupId: form.reportGroupId,
                    },
                });
                pairedLbac5 = (Array.isArray(pairResponse?.data?.data) ? pairResponse.data.data : [])
                    .map(normalizeReport)
                    .find((item) => item.quarter === form.quarter && item.reportGroupId === form.reportGroupId) || null;
            } catch (requestError) {
                // A missing LBAC 5 is normal for a newly created report group.
                // Do not block the encoder; the first LBAC 5 save will create it.
                if (requestError?.response?.status !== 404) {
                    setNotice("LBAC 5 could not be loaded yet. The evaluation sheet can still be generated from LBAC 3.");
                }
            }
        }

        // Prefer the rows currently being encoded so switching to LBAC 5 does
        // not replace unsaved spreadsheet edits with an older server snapshot.
        const hasCurrentRows = Array.isArray(form.rows) && form.rows.some((row) => row && String(row.ppaName || row.majorFinalOutput || row.performanceIndicator || row.ppaCode || '').trim());
        const source = hasCurrentRows
            ? {
                rows: form.rows,
                majorPpaCode: form.rows.find((row) => String(row?.ppaCode || '').trim())?.ppaCode || form.majorPpaCode,
                majorFinalOutput: form.rows.find((row) => String(row?.majorFinalOutput || row?.ppaName || '').trim())?.majorFinalOutput || form.majorFinalOutput,
            }
            : await loadLbac3Source({ office: form.office, year: form.year, quarter: form.quarter, reportGroupId: form.reportGroupId, applyToEditor: false });
        const sourceRows = normalizeLbac3Rows(source?.rows?.length ? source.rows : form.rows);
        const existingFinancialRows = pairedLbac5?.evaluationRows || [];
        const previousFinancial = new Map(
            existingFinancialRows
                .filter((row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM")
                .map((row) => [String(row.sourceLbac3RowKey || row.sourceLbac3RowId || row.ppaCode || row.majorFinalOutput || ""), row])
        );
        const nextRows = sourceRows.map((sourceRow) => {
            const sourceType = String(sourceRow?.rowType || "ITEM").toUpperCase();
            if (["MAIN", "GROUP", "SERVICE", "SECTION", "CATEGORY"].includes(sourceType)) {
                return createLbac5Row(sourceRow);
            }
            const key = String(sourceRow.rowKey || sourceRow.id || sourceRow.ppaCode || sourceRow.ppaName || "");
            const previous = previousFinancial.get(key) || {};
            return createLbac5Row(sourceRow, {
                ...previous,
                targetOutput: cumulativeQuarterValue(sourceRow.targetOutput, form.quarter),
                actualOutput: cumulativeQuarterValue(sourceRow.actualPerformance, form.quarter),
            });
        });
        setForm((current) => ({
            ...current,
            id: pairedLbac5?.id || null,
            formType: "LBAC5",
            reportGroupId: pairedLbac5?.reportGroupId || current.reportGroupId,
            reportTitle: pairedLbac5?.reportTitle || current.reportTitle,
            status: pairedLbac5?.status || "DRAFT",
            updatedAt: pairedLbac5?.updatedAt || null,
            createdBy: pairedLbac5?.createdBy || current.createdBy,
            createdByName: pairedLbac5?.createdByName || current.createdByName,
            editedBy: pairedLbac5?.editedBy || current.editedBy,
            editedByName: pairedLbac5?.editedByName || current.editedByName,
            editedAt: pairedLbac5?.editedAt || current.editedAt,
            majorPpaCode: source?.majorPpaCode || current.rows.find((row) => row.ppaCode)?.ppaCode || current.majorPpaCode,
            majorFinalOutput: source?.majorFinalOutput || current.rows[0]?.majorFinalOutput || current.majorFinalOutput,
            evaluationRows: nextRows,
        }));
        setNotice(pairedLbac5
            ? "Existing LBAC 5 loaded and synchronized with the current LBAC 3 structure."
            : "LBAC 5 was generated from LBAC 3. Save the evaluation sheet to create its paired record.");
    }, [form.majorFinalOutput, form.majorPpaCode, form.office, form.quarter, form.reportGroupId, form.rows, form.year, loadLbac3Source]);

    const updateLbac3Row = (index, field, value) => {
        setForm((current) => ({
            ...current,
            rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
        }));
    };

    const updateLbac3Quarter = (index, bucket, quarter, value) => {
        const selected = roleOf(form.quarter);
        const targetQuarter = roleOf(quarter);
        if (!isAdmin && selectedQuarterClosed) return;
        if (!isAdmin && isReportLocked) return;
        if (bucket === "targetOutput" && !isAdmin && selected !== "Q1" && targetQuarter !== selected) return;
        if (bucket === "actualPerformance" && !isAdmin && targetQuarter !== selected) return;
        setForm((current) => ({
            ...current,
            rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, [bucket]: { ...row[bucket], [quarter.toLowerCase()]: value } } : row),
        }));
    };

    const addLbac3Row = (type = "ITEM") => {
        if (editorLocked) return;
        setForm((current) => {
            const rows = Array.isArray(current.rows) ? current.rows : [];
            const row = createLbac3Row(type);
            const lastMain = [...rows].reverse().find((candidate) => rowTypeOf(candidate) === "MAIN");
            const lastGroup = [...rows].reverse().find((candidate) => rowTypeOf(candidate) === "GROUP");
            if (row.rowType === "GROUP") row.parentGroupKey = lastMain?.rowKey || "";
            if (row.rowType === "ITEM") {
                row.parentGroupKey = lastGroup?.rowKey || "";
                row.groupKey = lastGroup?.groupKey || "";
            }
            return { ...current, rows: [...rows, row] };
        });
    };

    const addLbac3Header = () => addLbac3Row("MAIN");
    const addLbac3Service = () => addLbac3Row("GROUP");
    const addLbac3Ppa = () => addLbac3Row("ITEM");

    const removeLbac3Row = (index) => {
        if (editorLocked) return;
        setForm((current) => {
            const row = current.rows[index];
            const deleted = row?.rowKey ? [...new Set([...(current.deletedRowKeys || []), row.rowKey])] : current.deletedRowKeys;
            return { ...current, rows: current.rows.filter((_, rowIndex) => rowIndex !== index), deletedRowKeys: deleted };
        });
    };

    const updateLbac5Row = (index, field, value) => {
        if (editorLocked) return;
        setForm((current) => ({
            ...current,
            evaluationRows: current.evaluationRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
        }));
    };

    const validateForm = () => {
        if (!form.office) return "Select the office responsible for this report.";
        if (!QUARTERS.includes(form.quarter)) return "Select a valid quarter.";
        if (editorTab === "LBAC3" && !String(form.reportTitle || "").trim()) return "Enter a Report Title.";
        if (editorTab === "LBAC3") {
            // LBAC 3 intentionally behaves like the Excel sheet. Draft encoding
            // does not require a PPA Code, name, or Performance Indicator.
            const rows = (Array.isArray(form.rows) ? form.rows : []).filter(Boolean);
            if (!rows.length) return "Add a row first.";
        } else {
            // LBAC 5 rows are generated from the saved LBAC 3 source. Never ask
            // the encoder to add a PPA manually on the evaluation sheet.
            // The backend remains authoritative if no LBAC 3 source exists.
            return "";
        }
        return "";
    };

    const buildPayload = (submissionAction) => ({
        formType: editorTab,
        office: form.office,
        sector: form.sector,
        reportGroupId: form.reportGroupId || undefined,
        reportTitle: form.reportTitle || "",
        year: Number(form.year),
        quarter: form.quarter,
        periodEndDate: form.periodEndDate || null,
        periodLabel: form.periodLabel || "",
        varianceAsOf: form.periodEndDate || null,
        // PPA Code is entered once at the top of the spreadsheet. If a
        // Header/Service was added first, that top row can be a heading rather
        // than an ITEM, so accept the code from any row without changing the UI.
        majorPpaCode: form.rows.find((row) => String(row?.ppaCode || "").trim())?.ppaCode || form.majorPpaCode || "",
        majorFinalOutput: form.rows.find((row) => isLbac3Item(row) && String(row?.majorFinalOutput || row?.ppaName || "").trim())?.majorFinalOutput || form.majorFinalOutput || "",
        // Do not persist accidental empty spreadsheet rows. Structural MAIN/GROUP
        // rows remain untouched, while incomplete non-empty PPA rows are retained so
        // validation can report the actual missing field.
        rows: editorTab === "LBAC3"
            ? form.rows.filter((row) => isLbac3Heading(row) || hasLbac3Content(row))
            : [],
        evaluationRows: editorTab === "LBAC5" ? form.evaluationRows : [],
        deletedRowKeys: form.deletedRowKeys || [],
        preparedBy: form.preparedBy || "",
        preparedDate: form.preparedDate || null,
        expectedUpdatedAt: form.updatedAt || null,
        submissionAction,
    });

    const save = async (submissionAction = "DRAFT") => {
        if (editorLocked) return;
        const validation = validateForm();
        if (validation) {
            toast.error(validation);
            return;
        }
        setSaving(true);
        setError("");
        try {
            const payload = buildPayload(submissionAction);
            const response = form.id
                ? await api.put(`/physical-reports/${form.id}`, payload)
                : await api.post("/physical-reports", payload);
            const saved = normalizeReport(response?.data?.data);
            setForm(saved);
            toast.success(response?.data?.message || "Physical Report saved.");
            if (editorTab === "LBAC3" && submissionAction === "DRAFT") {
                setNotice("LBAC 3 saved. Continue to LBAC 5 for the automatically generated evaluation sheet.");
            }
            // Keep the editor responsive after save. The register is refreshed
            // when the user returns to it, so saving no longer triggers a second
            // full-list request while the spreadsheet is still open.
            return true;
        } catch (requestError) {
            let message = errorMessage(requestError, "Unable to save Physical Report.");
            if (errorOrStale(requestError)) message = "This report was changed by another user. Reload the latest version before saving.";
            if (requestError?.response?.status === 409 && requestError?.response?.data?.code === "QUARTER_SNAPSHOT_FROZEN") message = requestError.response.data.error;
            setError(message);
            toast.error(message, { duration: 6000 });
        } finally {
            setSaving(false);
        }
        return false;
    };

    const startReview = async (report) => {
        try {
            await api.patch(`/physical-reports/${report.id}/review`);
            toast.success("Report moved to Under Review.");
            loadReports();
        } catch (requestError) {
            toast.error(errorMessage(requestError, "Unable to start review."));
        }
    };

    const openApproval = (report) => setApprovalDialog({ open: true, report, officeHead: report.officeHead || "", localPlanningCoordinator: report.localPlanningCoordinator || "", officeHeadFile: null, coordinatorFile: null });

    const approve = async () => {
        const dialog = approvalDialog;
        if (!dialog.report || !dialog.officeHead.trim() || !dialog.localPlanningCoordinator.trim()) return toast.error("Enter both approving names.");
        if (!dialog.officeHeadFile || !dialog.coordinatorFile) return toast.error("Upload both e-signature images.");
        const body = new FormData();
        body.append("officeHead", dialog.officeHead.trim());
        body.append("localPlanningCoordinator", dialog.localPlanningCoordinator.trim());
        body.append("signatureOfficeHead", dialog.officeHeadFile);
        body.append("signatureCoordinator", dialog.coordinatorFile);
        try {
            await api.patch(`/physical-reports/${dialog.report.id}/approve`, body);
            toast.success("Physical Report approved.");
            setApprovalDialog({ open: false, report: null, officeHead: "", localPlanningCoordinator: "", officeHeadFile: null, coordinatorFile: null });
            loadReports();
        } catch (requestError) {
            toast.error(errorMessage(requestError, "Unable to approve Physical Report."));
        }
    };

    const returnReport = async () => {
        if (!returnDialog.report || !returnDialog.remarks.trim()) return toast.error("Correction remarks are required.");
        try {
            await api.patch(`/physical-reports/${returnDialog.report.id}/deny`, { remarks: returnDialog.remarks.trim() });
            toast.success("Physical Report returned for correction.");
            setReturnDialog({ open: false, report: null, remarks: "" });
            loadReports();
        } catch (requestError) {
            toast.error(errorMessage(requestError, "Unable to return Physical Report."));
        }
    };

    const validateReport = async (report) => {
        try {
            await api.patch(`/physical-reports/${report.id}/validate`);
            toast.success("Physical Report validated and frozen.");
            loadReports();
        } catch (requestError) {
            toast.error(errorMessage(requestError, "Unable to validate Physical Report."));
        }
    };

    const carryForward = async (report) => {
        if (!report || report.formType !== "LBAC3") return;
        const currentIndex = QUARTERS.indexOf(report.quarter);
        const nextQuarter = currentIndex >= 0 ? QUARTERS[currentIndex + 1] : null;
        if (!nextQuarter) return toast.error("Q4 has no next quarter to carry forward.");
        if (!window.confirm(`Carry ${report.reportTitle || "this report"} from ${report.quarter} ${report.year} to ${nextQuarter} ${report.year}?`)) return;
        try {
            const { data } = await api.post(`/physical-reports/${report.id}/carry-forward`);
            toast.success(data?.message || `Report carried forward to ${nextQuarter}.`);
            loadReports();
        } catch (requestError) {
            toast.error(errorMessage(requestError, "Unable to carry report forward."));
        }
    };

    const deleteReport = async (report) => {
        if (!window.confirm(`Delete ${report.formType} for ${report.office}, ${QUARTER_NAMES[report.quarter] || report.quarter} ${report.year}?`)) return;
        try {
            await api.delete(`/physical-reports/${report.id}`);
            toast.success("Physical Report deleted.");
            loadReports();
        } catch (requestError) {
            toast.error(errorMessage(requestError, "Unable to delete Physical Report."));
        }
    };

    const printReport = async (reportOrForm) => {
        try {
            let item = reportOrForm;
            if (reportOrForm?.id) {
                const { data } = await api.get(`/physical-reports/${reportOrForm.id}`);
                item = normalizeReport(data?.data);
            }
            const rows = item.formType === "LBAC5" ? item.evaluationRows : item.rows;
            const bodyRows = rows.map((row, index) => {
                if (item.formType === "LBAC3") {
                    const t = row.targetOutput || {}; const a = row.actualPerformance || {};
                    return `<tr><td>${index + 1 === 1 ? escapeHtml(row.ppaCode) : ""}</td><td>${escapeHtml(row.ppaName || row.majorFinalOutput)}</td><td>${escapeHtml(row.performanceIndicator)}</td><td>${num(t.q1)}</td><td>${num(t.q2)}</td><td>${num(t.q3)}</td><td>${num(t.q4)}</td><td>${num(a.q1)}</td><td>${num(a.q2)}</td><td>${num(a.q3)}</td><td>${num(a.q4)}</td><td>${escapeHtml(row.remarks)}</td></tr>`;
                }
                const calc = calculateLbac5(row);
                return `<tr><td>${escapeHtml(row.ppaCode || "")}</td><td>${escapeHtml(row.majorFinalOutput || row.ppaName)}</td><td>${money(calc.cost)}</td><td>${percent(calc.weight)}</td><td>${money(calc.target)}</td><td>${money(calc.actual)}</td><td>${money(calc.variance)}</td><td>${percent(calc.accomplishment)}</td><td>${calc.physical}</td><td>${percent(calc.coa)}</td><td>${money(calc.allotment)}</td><td>${money(calc.obligations)}</td><td>${money(calc.financialVariance)}</td><td>${percent(calc.absorptive)}</td><td>${calc.financial}</td></tr>`;
            }).join("");
            const columns = item.formType === "LBAC3"
                ? "<th>PPA Code</th><th>Major Final Output / PPA</th><th>Performance Indicator</th><th>Target Q1</th><th>Target Q2</th><th>Target Q3</th><th>Target Q4</th><th>Actual Q1</th><th>Actual Q2</th><th>Actual Q3</th><th>Actual Q4</th><th>Remarks</th>"
                : "<th>PPA Code</th><th>Major Final Output</th><th>Cost</th><th>Weight</th><th>Target Output</th><th>Actual Output</th><th>Physical Variance</th><th>Physical %</th><th>Pts</th><th>COA</th><th>Allotment</th><th>Obligations</th><th>Financial Variance</th><th>Absorptive %</th><th>Fin. Pts</th>";
            const win = window.open("", "_blank", "width=1400,height=900");
            if (!win) return toast.error("Allow pop-ups to print the report.");
            win.document.write(`<!doctype html><html><head><title>LBAC ${item.formType === "LBAC3" ? "3" : "5"} - ${escapeHtml(item.office)}</title><style>${printStyles()}</style></head><body><h1>${item.formType === "LBAC3" ? "LBAC FORM NO. 3" : "LBAC FORM NO. 5"} — ${escapeHtml(item.reportTitle || "Untitled Report")}</h1><div class="meta"><b>Report Title:</b> ${escapeHtml(item.reportTitle || "")} &nbsp;&nbsp; <b>Office:</b> ${escapeHtml(item.office)} &nbsp;&nbsp; <b>Quarter:</b> ${escapeHtml(QUARTER_NAMES[item.quarter] || item.quarter)} ${escapeHtml(item.year)} <br><b>PPA Code:</b> ${escapeHtml(item.majorPpaCode || "")} &nbsp;&nbsp; <b>Major Final Output:</b> ${escapeHtml(item.majorFinalOutput || "")}</div><table><thead><tr>${columns}</tr></thead><tbody>${bodyRows || "<tr><td colspan='13'>No rows encoded.</td></tr>"}</tbody></table><div class="sign"><span>Prepared by: <b>${escapeHtml(item.preparedBy || "")}</b></span><span>Department/Office Head: <b>${escapeHtml(item.officeHead || "")}</b></span><span>Local Planning Coordinator: <b>${escapeHtml(item.localPlanningCoordinator || "")}</b></span></div><script>window.onload=()=>setTimeout(()=>window.print(),200);</script></body></html>`);
            win.document.close();
        } catch (requestError) {
            toast.error(errorMessage(requestError, "Unable to prepare the printable report."));
        }
    };

    const exportExcel = async (reportOrForm) => {
        try {
            let item = reportOrForm;
            if (reportOrForm?.id) {
                const { data } = await api.get(`/physical-reports/${reportOrForm.id}`);
                item = normalizeReport(data?.data);
            }
            let lbac3 = item.formType === "LBAC3" ? item : null;
            let lbac5 = item.formType === "LBAC5" ? item : null;
            if (!lbac3) {
                const response = await api.get("/physical-reports", { params: { office: item.office, year: item.year, quarter: item.quarter, formType: "LBAC3", reportGroupId: item.reportGroupId || undefined } });
                lbac3 = (Array.isArray(response?.data?.data) ? response.data.data.map(normalizeReport).find(Boolean) : null) || null;
            }
            if (!lbac5 && lbac3) {
                lbac5 = { ...emptyForm("LBAC5", { office: lbac3.office, sector: lbac3.sector, year: lbac3.year, quarter: lbac3.quarter, reportGroupId: lbac3.reportGroupId, reportTitle: lbac3.reportTitle }), majorPpaCode: lbac3.majorPpaCode, majorFinalOutput: lbac3.majorFinalOutput, evaluationRows: normalizeLbac5Rows(lbac3.evaluationRows) };
            }
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "PPDO Monitor";
            const thin = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            const styleSheet = (sheet, widths) => {
                sheet.columns = widths.map((width) => ({ width }));
                sheet.views = [{ state: "frozen", ySplit: 6 }];
                sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.2, right: 0.2, top: 0.25, bottom: 0.25 } };
            };
            const write3 = (target) => {
                const sheet = workbook.addWorksheet("LBAC Form No.3");
                styleSheet(sheet, [15, 32, 30, 12, 12, 12, 12, 12, 12, 12, 12, 28]);
                sheet.mergeCells("A1:L1"); sheet.getCell("A1").value = target?.reportTitle ? `LBAC FORM NO. 3 — ${target.reportTitle}` : "LBAC FORM NO. 3 — PHYSICAL REPORT OF OPERATIONS"; sheet.getCell("A1").font = { bold: true, size: 15 }; sheet.getCell("A1").alignment = { horizontal: "center" };
                sheet.mergeCells("A2:L2"); sheet.getCell("A2").value = `Office: ${target?.office || ""} | ${QUARTER_NAMES[target?.quarter] || target?.quarter} ${target?.year || ""}`; sheet.getCell("A2").font = { bold: true };
                sheet.getRow(4).values = ["PPA Code", "Major Final Output / PPA", "Performance Indicator", "Target Q1", "Target Q2", "Target Q3", "Target Q4", "Actual Q1", "Actual Q2", "Actual Q3", "Actual Q4", "Remarks"];
                sheet.getRow(4).eachCell((cell) => { cell.font = { bold: true }; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = thin; });
                const rows = Array.isArray(target?.rows) ? target.rows : [];
                rows.forEach((row, index) => {
                    const t = row.targetOutput || {}; const a = row.actualPerformance || {};
                    const values = [index === 0 ? row.ppaCode || "" : "", row.ppaName || row.majorFinalOutput || "", row.performanceIndicator || "", num(t.q1), num(t.q2), num(t.q3), num(t.q4), num(a.q1), num(a.q2), num(a.q3), num(a.q4), row.remarks || ""];
                    sheet.addRow(values).eachCell({ includeEmpty: true }, (cell) => { cell.border = thin; cell.alignment = { vertical: "top", wrapText: true }; });
                });
                const totalRow = sheet.addRow(["TOTAL", "", "", ...QUARTERS.map((q) => num(calculateLbac3Totals(rows)[q.toLowerCase()].target)), ...QUARTERS.map((q) => num(calculateLbac3Totals(rows)[q.toLowerCase()].actual)), ""]);
                totalRow.font = { bold: true };
                totalRow.eachCell({ includeEmpty: true }, (cell) => { cell.border = thin; });
            };
            const write5 = (target) => {
                const sheet = workbook.addWorksheet("LBAC Form No. 5");
                styleSheet(sheet, [15, 35, 14, 11, 14, 14, 14, 14, 9, 16, 18, 14, 9]);
                sheet.mergeCells("A1:M1"); sheet.getCell("A1").value = target?.reportTitle ? `LBAC FORM NO. 5 — ${target.reportTitle}` : "LBAC FORM NO. 5 — PHYSICAL AND FINANCIAL PERFORMANCE EVALUATION"; sheet.getCell("A1").font = { bold: true, size: 15 }; sheet.getCell("A1").alignment = { horizontal: "center" };
                sheet.mergeCells("A2:M2"); sheet.getCell("A2").value = `Office: ${target?.office || ""} | ${QUARTER_NAMES[target?.quarter] || target?.quarter} ${target?.year || ""}`;
                sheet.getRow(4).values = ["PPA Code", "Major Final Output", "Cost", "Weight %", "Target", "Actual", "Variance", "Physical %", "Pts", "Allotment", "Obligations", "Absorptive %", "Fin. Pts"];
                sheet.getRow(4).eachCell((cell) => { cell.font = { bold: true }; cell.alignment = { horizontal: "center", wrapText: true }; cell.border = thin; });
                (Array.isArray(target?.evaluationRows) ? target.evaluationRows : []).forEach((row, index) => {
                    const calc = calculateLbac5(row);
                    sheet.addRow([index === 0 ? row.ppaCode || "" : "", row.majorFinalOutput || row.ppaName || "", calc.cost, calc.weight / 100, calc.target, calc.actual, calc.variance, calc.accomplishment / 100, calc.physical, calc.allotment, calc.obligations, calc.absorptive / 100, calc.financial]).eachCell({ includeEmpty: true }, (cell) => { cell.border = thin; });
                });
            };
            if (lbac3) write3(lbac3);
            if (lbac5) write5(lbac5);
            const summary = workbook.addWorksheet("LBAC Form No. 6");
            summary.columns = [{ width: 34 }, { width: 22 }, { width: 22 }, { width: 22 }];
            summary.getCell("A1").value = "LBAC FORM NO. 6 — PHYSICAL AND FINANCIAL SUMMARY";
            summary.getCell("A1").font = { bold: true, size: 15 };
            summary.mergeCells("A1:D1");
            summary.getRow(3).values = ["Office", "Quarter", "Target", "Actual"];
            summary.getRow(3).eachCell((cell) => { cell.font = { bold: true }; cell.border = thin; });
            if (lbac3) {
                const total = calculateLbac3Totals(lbac3.rows)[String(lbac3.quarter || "Q1").toLowerCase()] || { target: 0, actual: 0 };
                summary.addRow([lbac3.office, `${lbac3.quarter} ${lbac3.year}`, total.target, total.actual]).eachCell((cell) => { cell.border = thin; });
            }
            const summaryRow = summary.addRow(["Overall LBAC 5", "", lbac5 ? lbac5.evaluationRows.reduce((sum, row) => sum + num(row.targetOutput), 0) : 0, lbac5 ? lbac5.evaluationRows.reduce((sum, row) => sum + num(row.actualOutput), 0) : 0]);
            summaryRow.eachCell((cell) => { cell.border = thin; });
            summary.views = [{ state: "frozen", ySplit: 3 }];
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a"); link.href = url; link.download = `${safeFilename(item.reportTitle || `${item.office}-Physical-Report`)}-${item.year}-${item.quarter}.xlsx`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast.success("Physical Report Excel workbook exported.");
        } catch (requestError) {
            toast.error(errorMessage(requestError, "Unable to export the report to Excel."));
        }
    };

    const backToList = () => {
        setView("list");
        setError("");
        setNotice("");
        loadReports();
    };

    const currentQuarterTotal = lbac3Totals[String(form.quarter || "Q1").toLowerCase()] || { target: 0, actual: 0, variance: 0 };

    return (
        <>
            <style>{`.pr-input{width:100%;border:1px solid rgb(203 213 225);background:#fff;padding:.55rem .65rem;font-size:.82rem;outline:none}.pr-input:focus{border-color:rgb(99 102 241);box-shadow:0 0 0 2px rgb(99 102 241 / .10)}.pr-input.locked{background:#f1f5f9;color:#64748b;cursor:not-allowed}.pr-input.blue-lock{background:#eef2ff;color:#4338ca}.pr-input.green-lock{background:#ecfdf5;color:#047857}.spreadsheet td,.spreadsheet th{border:1px solid rgb(203 213 225)}.spreadsheet th{background:#f8fafc}`}</style>
            {view === "list" && (
                <div className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div><p className="text-sm font-semibold text-indigo-600">PPDO Monitoring Division</p><h1 className="text-2xl font-bold text-slate-900">Physical Reports</h1><p className="mt-1 text-sm text-slate-500">Encode → automatic computation → print/export. The report behaves like a spreadsheet; only calculated/official workflow fields are locked.</p></div>
                        <div className="flex gap-2">{canEncode ? <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={17}/> New Physical Report</button> : null}<button onClick={loadReports} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"><RefreshCw size={16}/> Refresh</button></div>
                    </div>
                    {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertTriangle className="mr-2 inline" size={17}/>{error}</div> : null}
                    <div className="grid gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 lg:col-span-2">
                            <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold text-indigo-950">{roleQueue.title}</div><p className="mt-1 text-xs leading-5 text-indigo-800/80">{roleQueue.description}</p></div><div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm"><div className="text-xl font-black text-indigo-700">{roleQueue.action}</div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{roleQueue.actionLabel}</div></div></div>
                        </div>
                        <div className="rounded-2xl border bg-white p-4"><span className="text-xs font-semibold text-slate-400">TOTAL RECORDS</span><div className="mt-1 text-2xl font-bold">{stats.total}</div></div>
                        <div className="rounded-2xl border bg-white p-4"><span className="text-xs font-semibold text-slate-400">RETURNED</span><div className="mt-1 text-2xl font-bold text-rose-600">{stats.returned}</div><div className="mt-1 text-[10px] text-slate-400">Needs correction</div></div>
                    </div>
                    <div className="rounded-2xl border bg-white p-4"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6"><Field label="Search"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input className="pr-input pl-9" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Office, PPA, status..."/></div></Field>{isAdmin ? <Field label="Office"><select className="pr-input" value={filters.office} onChange={(event) => setFilters((current) => ({ ...current, office: event.target.value }))}><option value="">All offices</option>{officeGroups.map(([sector, offices]) => <optgroup key={sector} label={sector}>{offices.map((office) => <option key={office} value={office}>{office}</option>)}</optgroup>)}</select></Field> : null}<Field label="Form"><select className="pr-input" value={filters.formType} onChange={(event) => setFilters((current) => ({ ...current, formType: event.target.value }))}><option value="ALL">All forms</option>{FORM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Quarter"><select className="pr-input" value={filters.quarter} onChange={(event) => setFilters((current) => ({ ...current, quarter: event.target.value }))}><option value="ALL">All quarters</option>{QUARTERS.map((quarter) => <option key={quarter}>{quarter}</option>)}</select></Field><Field label="Status"><select className="pr-input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="ALL">All status</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field><Field label="Year"><input className="pr-input" type="number" value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}/></Field></div></div>
                    <div className="overflow-hidden rounded-2xl border bg-white">
                        <div className="border-b p-4">
                            <div className="font-bold">Physical Report Register</div>
                            <p className="mt-1 text-xs text-slate-500">Reports are grouped by sector, office, and Report Title. LBAC 3 and LBAC 5 stay together under the same report group.</p>
                        </div>
                        <div className="space-y-3 p-4">
                            {loading ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">Loading Physical Reports...</div> : null}
                            {!loading && !reportGroups.length ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">No Physical Reports found for the selected filters.</div> : null}
                            {!loading && reportGroups.map((group) => {
                                const quarterMap = new Map();
                                group.reports.forEach((report) => {
                                    if (!quarterMap.has(report.quarter)) quarterMap.set(report.quarter, []);
                                    quarterMap.get(report.quarter).push(report);
                                });
                                return (
                                    <div key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600">{group.sector || "Unclassified Sector"}</span>
                                                    <span className="text-sm font-bold text-slate-900">{group.office}</span>
                                                </div>
                                                <div className="mt-1 text-sm font-semibold text-slate-700">{group.reportTitle}</div>
                                                <div className="text-[11px] text-slate-400">{group.year} · {group.reports[0]?.reportGroupId ? "Connected LBAC 3 + LBAC 5 report group" : "Legacy report group"}</div>
                                            </div>
                                            <div className="text-xs text-slate-500">{group.reports.length} record{group.reports.length === 1 ? "" : "s"}</div>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {Array.from(quarterMap.entries()).map(([quarter, quarterReports]) => (
                                                <div key={quarter} className="px-4 py-3">
                                                    <div className="mb-2 flex items-center justify-between gap-3">
                                                        <div className="text-xs font-bold text-slate-800">{QUARTER_NAMES[quarter] || quarter} {group.year}</div>
                                                        <div className="text-[10px] text-slate-400">{quarterReports.length === 2 ? "LBAC 3 + LBAC 5" : "Partial pair"}</div>
                                                    </div>
                                                    <div className="grid gap-2 md:grid-cols-2">
                                                        {quarterReports.map((report) => (
                                                            <div key={report.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-bold text-slate-700">LBAC {report.formType.replace("LBAC", "")}</span>
                                                                        <StatusBadge status={report.status} />
                                                                    </div>
                                                                    <div className="mt-1 truncate text-[11px] text-slate-500">{report.majorPpaCode || "No PPA code"}</div>
                                                                    <div className="mt-1 text-[10px] text-slate-400">Edited by {report.editedByName || report.preparedBy || "—"}{report.editedAt ? ` · ${new Date(report.editedAt).toLocaleDateString()}` : ""}</div>
                                                                    <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-4 text-slate-600"><span className="font-bold text-slate-700">Next:</span> {nextActionFor(report.status, role)}</div>
                                                                </div>
                                                                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                                                    <button title="Open" onClick={() => openEditor(report)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"><Eye size={17}/></button>
                                                                    <button title="Print" onClick={() => printReport(report)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Download size={17}/></button>
                                                                    <button title="Excel" onClick={() => exportExcel(report)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><FileSpreadsheet size={17}/></button>
                                                                    {isAdmin && report.formType === "LBAC3" && QUARTERS.indexOf(report.quarter) < 3 && ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN"].includes(roleOf(report.status)) ? <button title="Carry forward to next quarter" onClick={() => carryForward(report)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"><Copy size={17}/></button> : null}
                                                                    {isHead && ["SUBMITTED", "RESUBMITTED"].includes(roleOf(report.status)) ? <button title="Review" onClick={() => startReview(report)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><ShieldCheck size={17}/></button> : null}
                                                                    {isHead && roleOf(report.status) === "UNDER_REVIEW" ? <button title="Approve" onClick={() => openApproval(report)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><Check size={17}/></button> : null}
                                                                    {isHead && ["SUBMITTED", "RESUBMITTED", "UNDER_REVIEW"].includes(roleOf(report.status)) ? <button title="Return" onClick={() => setReturnDialog({ open: true, report, remarks: "" })} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><X size={17}/></button> : null}
                                                                    {isAdmin && ["APPROVED", "APPROVED_BY_ADMIN"].includes(roleOf(report.status)) ? <button title="Validate" onClick={() => validateReport(report)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><ShieldCheck size={17}/></button> : null}
                                                                    {isAdmin ? <button title="Delete" onClick={() => deleteReport(report)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={17}/></button> : null}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                )}

                {view !== "list" && (
                    <div className="space-y-5">
                    <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5"><Field label="Department / Office"><OfficePicker value={form.office} disabled={!isAdmin || Boolean(form.id)} officeGroups={officeGroups} onChange={(office) => setForm((current) => ({ ...current, office, sector: officeSector(office) }))} /></Field><Field label="Year"><input className={`pr-input ${form.id && !isAdmin ? "locked" : ""}`} disabled={Boolean(form.id) && !isAdmin} type="number" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: Number(event.target.value) || YEAR_NOW }))}/></Field><Field label="Quarter"><select className={`pr-input ${form.id ? "locked" : ""}`} disabled={Boolean(form.id)} value={form.quarter} onChange={(event) => setForm((current) => ({ ...current, quarter: event.target.value }))}>{QUARTERS.map((quarter) => <option key={quarter}>{quarter}</option>)}</select></Field><Field label="Quarter Ending"><input className="pr-input locked" disabled value={`${QUARTER_NAMES[form.quarter] || form.quarter} ${form.year}`} /></Field></div><div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="Report Title"><input className="pr-input" value={form.reportTitle || ""} onChange={(event) => setForm((current) => ({ ...current, reportTitle: event.target.value }))} placeholder="e.g., General Fund - PEO" maxLength={300}/></Field><Field label="Prepared By"><input className={`pr-input ${!isAdmin ? "locked" : ""}`} disabled={!isAdmin} value={form.preparedBy} onChange={(event) => setForm((current) => ({ ...current, preparedBy: event.target.value }))}/></Field></div>{form.id ? <div className="mt-3 space-y-2"><div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500"><span><strong className="text-slate-700">Created by:</strong> {form.createdByName || (form.createdBy ? "Recorded user" : "—")}</span><span><strong className="text-slate-700">Last edited by:</strong> {form.editedByName || "—"}</span><span><strong className="text-slate-700">Last edited:</strong> {form.editedAt ? new Date(form.editedAt).toLocaleString() : "—"}</span><span className="text-slate-400">Every edit is recorded in the Physical Report Audit Trail.</span></div>{form.carriedForwardFromQuarter ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800"><strong>Carried forward:</strong> This report was initialized from {form.carriedForwardFromQuarter} data{form.carriedForwardByName ? ` by ${form.carriedForwardByName}` : ""}. The current quarter remains editable by the assigned office encoder.</div> : null}</div> : null}</div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button type="button" onClick={backToList} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ChevronLeft size={16}/> Back to Register</button>
                        <div className="text-xs text-slate-500">{form.formType} · {QUARTER_NAMES[form.quarter] || form.quarter} {form.year}</div>
                    </div>
                    <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-900"><strong>{workflowStage.label}:</strong> {workflowStage.text}</div>
                    {notice ? <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"><strong>Update:</strong> {notice}</div> : null}
                    <div className={`mb-3 rounded-xl border px-4 py-3 ${activeSubmissionTask?.state === "OVERDUE" ? "border-rose-200 bg-rose-50" : activeSubmissionTask?.state === "DUE_SOON" ? "border-amber-200 bg-amber-50" : activeSubmissionTask?.state === "UPCOMING" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-start gap-3">
                            <AlertTriangle className={`mt-0.5 shrink-0 ${activeSubmissionTask?.state === "OVERDUE" ? "text-rose-600" : activeSubmissionTask?.state === "DUE_SOON" ? "text-amber-600" : "text-slate-400"}`} size={18}/>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Submission Schedule</p>
                                {activeSubmissionTask ? <><p className="mt-1 text-sm font-semibold text-slate-900">{activeSubmissionTask.title}</p><p className="mt-1 text-xs text-slate-600">{activeSubmissionTask.startDate ? `Open ${safeDate(activeSubmissionTask.startDate)}` : ""}{activeSubmissionTask.startDate && activeSubmissionTask.dueDate ? " · " : ""}{activeSubmissionTask.dueDate ? `Due ${safeDate(activeSubmissionTask.dueDate)}` : ""}</p><p className={`mt-1 text-xs font-bold ${activeSubmissionTask.state === "OVERDUE" ? "text-rose-700" : activeSubmissionTask.state === "DUE_SOON" ? "text-amber-700" : activeSubmissionTask.state === "UPCOMING" ? "text-blue-700" : "text-slate-600"}`}>{activeSubmissionTask.state === "OVERDUE" ? "OVERDUE — submit as soon as possible." : activeSubmissionTask.state === "DUE_SOON" ? `DUE SOON — ${Math.max(0, Number(activeSubmissionTask.daysRemaining || 0))} day(s) remaining.` : activeSubmissionTask.state === "UPCOMING" ? "Submission period has not started." : activeSubmissionTask.state === "CLOSED" ? "Schedule closed." : activeSubmissionTask.submitted ? "Submission recorded." : "Submission period is open."}</p></> : <p className="mt-1 text-xs text-slate-500">No Admin submission schedule is assigned for this report.</p>}
                            </div>
                            {loadingSubmissionTasks ? <RefreshCw size={15} className="animate-spin text-slate-400"/> : null}
                        </div>
                    </div>
                    <div className="flex gap-2 rounded-xl border bg-white p-2"><button onClick={() => setEditorTab("LBAC3")} className={`rounded-lg px-4 py-2 text-sm font-bold ${editorTab === "LBAC3" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>LBAC Form 3 — Physical</button><button onClick={async () => { setError(""); setEditorTab("LBAC5"); await syncLbac5FromLbac3(); }} className={`rounded-lg px-4 py-2 text-sm font-bold ${editorTab === "LBAC5" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>LBAC Form 5 — Evaluation</button></div>

                    {editorTab === "LBAC3" ? (
                        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-bold">LBAC Form 3 — Spreadsheet Encoding</h2><p className="text-xs text-slate-500">Encode it like the Excel file. Choose a row type only when needed; the cells stay flexible.</p></div><div className="flex flex-wrap gap-2"><button disabled={editorLocked} onClick={addLbac3Header} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"><Plus size={16}/> Text / Header</button><button disabled={editorLocked} onClick={addLbac3Service} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 disabled:opacity-40"><Plus size={16}/> Service</button><button disabled={editorLocked} onClick={addLbac3Ppa} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><Plus size={16}/> PPA</button><button onClick={() => printReport(form)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><FileText size={16}/> Print</button><button onClick={() => exportExcel(form)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><FileSpreadsheet size={16}/> Excel</button></div></div>
                            <div className="overflow-x-auto"><table className="spreadsheet min-w-[1800px] w-full text-xs"><thead><tr><th rowSpan="2" className="px-2 py-2">#</th><th rowSpan="2" className="px-2 py-2">PPA CODE<br/><span className="font-normal">first row only</span></th><th rowSpan="2" className="px-2 py-2">MAJOR FINAL OUTPUT / PPA / ACTIVITY</th><th rowSpan="2" className="px-2 py-2">PERFORMANCE INDICATOR</th><th colSpan="4" className="px-2 py-2">TARGET</th><th colSpan="4" className="px-2 py-2">ACTUAL</th><th rowSpan="2" className="px-2 py-2">TOTAL TARGET</th><th rowSpan="2" className="px-2 py-2">TOTAL ACTUAL</th><th rowSpan="2" className="px-2 py-2">VARIANCE</th><th rowSpan="2" className="px-2 py-2">REMARKS</th><th rowSpan="2" className="px-2 py-2"></th></tr><tr>{["Q1","Q2","Q3","Q4","Q1","Q2","Q3","Q4"].map((quarter, index) => <th key={`${quarter}-${index}`} className="px-2 py-2">{quarter}</th>)}</tr></thead><tbody>{form.rows.map((row, index) => {
                                const type = rowTypeOf(row);
                                const heading = isLbac3Heading(row);
                                const service = type === "GROUP" || type === "SERVICE";
                                const totals = heading ? headingTotalsFor(form.rows, row) : { target: rowQuarterTotal(row, "targetOutput"), actual: rowQuarterTotal(row, "actualPerformance") };
                                const totalTarget = totals.target;
                                const totalActual = totals.actual;
                                const firstPpaIndex = form.rows.findIndex((candidate) => isLbac3Item(candidate));
                                const canEditCode = isLbac3Item(row) && index === firstPpaIndex;
                                const displayName = row.categoryName || row.ppaName || row.majorFinalOutput || "";
                                return <tr key={row.rowKey || index} className={`align-top ${type === "MAIN" ? "bg-slate-100 font-bold" : service ? "bg-indigo-50/50 font-semibold" : ""}`}>
                                    <td className="px-2 py-1.5 text-center font-semibold text-slate-400">{index + 1}</td>
                                    <td className="px-1"><input className={`pr-input ${!canEditCode ? "locked" : ""}`} disabled={editorLocked || !canEditCode} value={canEditCode ? row.ppaCode || "" : ""} onChange={(event) => updateLbac3Row(index, "ppaCode", event.target.value)} placeholder={canEditCode ? "PPA Code (optional)" : "—"}/></td>
                                    <td className="px-1"><input className={`pr-input ${heading ? "font-bold bg-transparent" : ""}`} disabled={editorLocked} value={displayName} onChange={(event) => updateLbac3Row(index, heading ? "categoryName" : "ppaName", event.target.value)} placeholder={type === "MAIN" ? "Type text / header" : service ? "Type service / category" : "Type PPA / Activity"}/></td>
                                    <td className="px-1"><input className="pr-input" disabled={editorLocked} value={row.performanceIndicator || ""} onChange={(event) => updateLbac3Row(index, "performanceIndicator", event.target.value)} placeholder={heading ? "Optional" : "Type indicator / text"}/></td>
                                    {["q1","q2","q3","q4"].map((q) => <td key={`t-${q}`} className="px-1"><input className={`pr-input text-right ${!isAdmin && form.quarter !== "Q1" && q !== form.quarter.toLowerCase() ? "locked" : ""}`} disabled={!isAdmin && (editorLocked || (form.quarter !== "Q1" && q !== form.quarter.toLowerCase()))} value={row.targetOutput?.[q] ?? ""} onChange={(event) => updateLbac3Quarter(index, "targetOutput", q.toUpperCase(), event.target.value)} /></td>)}
                                    {["q1","q2","q3","q4"].map((q) => <td key={`a-${q}`} className="px-1"><input className={`pr-input text-right ${!isAdmin && q !== form.quarter.toLowerCase() ? "locked" : ""}`} disabled={!isAdmin && (editorLocked || q !== form.quarter.toLowerCase())} value={row.actualPerformance?.[q] ?? ""} onChange={(event) => updateLbac3Quarter(index, "actualPerformance", q.toUpperCase(), event.target.value)} /></td>)}
                                    <td className="px-2 py-2 text-right font-semibold bg-slate-50">{totalTarget ? money(totalTarget) : "—"}</td>
                                    <td className="px-2 py-2 text-right font-semibold bg-slate-50">{totalActual ? money(totalActual) : "—"}</td>
                                    <td className="px-2 py-2 text-right font-semibold">{totalTarget || totalActual ? money(totalActual - totalTarget) : "—"}</td>
                                    <td className="px-1"><input className="pr-input" disabled={editorLocked} value={row.remarks || ""} onChange={(event) => updateLbac3Row(index, "remarks", event.target.value)} placeholder="Optional"/></td>
                                    <td className="px-1 text-center"><button disabled={editorLocked} onClick={() => removeLbac3Row(index)} className="rounded p-2 text-rose-600 disabled:opacity-30"><Trash2 size={15}/></button></td>
                                </tr>;
                            })}</tbody></table></div>
                            <div className="grid gap-3 border-t bg-slate-50 p-4 sm:grid-cols-3"><div><span className="text-xs text-slate-500">Current Quarter Target</span><div className="font-bold">{money(currentQuarterTotal.target)}</div></div><div><span className="text-xs text-slate-500">Current Quarter Actual</span><div className="font-bold">{money(currentQuarterTotal.actual)}</div></div><div><span className="text-xs text-slate-500">Variance</span><div className={`font-bold ${currentQuarterTotal.variance < 0 ? "text-rose-600" : "text-emerald-600"}`}>{money(currentQuarterTotal.variance)}</div></div></div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-bold">LBAC Form 5 — Spreadsheet Evaluation</h2><p className="text-xs text-slate-500">Rows are generated from LBAC 3. Services/categories remain as headings; PPA rows carry the evaluation fields. Physical Target/Actual are locked and automatic. Enter only financial/evaluation values.{loadingSource ? " Loading source…" : ""}</p></div><div className="flex gap-2"><button onClick={() => printReport(form)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><FileText size={16}/> Print</button><button onClick={() => exportExcel(form)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><FileSpreadsheet size={16}/> Excel</button></div></div>
                            <div className="overflow-x-auto"><table className="spreadsheet min-w-[2200px] w-full text-xs"><thead><tr><th className="px-2 py-2">#</th><th className="px-2 py-2">PPA CODE</th><th className="px-2 py-2">MAJOR FINAL OUTPUT / PPA</th><th className="px-2 py-2">COST</th><th className="px-2 py-2">WEIGHT %</th><th className="px-2 py-2">TARGET OUTPUT<br/>(AUTO)</th><th className="px-2 py-2">ACTUAL OUTPUT<br/>(AUTO)</th><th className="px-2 py-2">PHYSICAL VARIANCE</th><th className="px-2 py-2">PHYSICAL %</th><th className="px-2 py-2">PTS</th><th className="px-2 py-2">COA</th><th className="px-2 py-2">ALLOTMENT</th><th className="px-2 py-2">OBLIGATIONS</th><th className="px-2 py-2">FINANCIAL VARIANCE</th><th className="px-2 py-2">ABSORPTIVE %</th><th className="px-2 py-2">FIN. PTS</th><th className="px-2 py-2">REMARKS</th></tr></thead><tbody>{form.evaluationRows.map((row, index) => {
                                const calc = lbac5Calculated[index] || calculateLbac5(row);
                                const rowType = String(row?.rowType || "ITEM").toUpperCase();
                                const heading = ["MAIN", "GROUP"].includes(rowType);
                                if (heading) {
                                    const level = Number(row?.headingLevel ?? (rowType === "MAIN" ? 0 : 1));
                                    const label = row.majorFinalOutput || row.categoryName || "Untitled Group";
                                    return (
                                        <tr key={row.rowKey || index} className={rowType === "MAIN" ? "bg-indigo-50" : "bg-slate-100"}>
                                            <td colSpan="10" className="px-3 py-2 font-bold text-slate-700" style={{ paddingLeft: `${Math.max(12, level * 20)}px` }}>
                                                {rowType === "MAIN" ? "MAIN OUTPUT" : "SERVICE / CATEGORY"} — {label}
                                            </td>
                                            <td className="px-2 py-2 text-right font-bold bg-slate-50">{money(row.targetOutput || 0)}</td>
                                            <td className="px-2 py-2 text-right font-bold bg-slate-50">{money(row.actualOutput || 0)}</td>
                                            <td className="px-2 py-2 text-right font-bold">{money(row.variance || 0)}</td>
                                            <td colSpan="4" className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Automatic total • not included in weight</td>
                                        </tr>
                                    );
                                }
                                return (
                                    <tr key={row.rowKey || index} className="align-top">
                                        <td className="px-2 py-2 text-center text-slate-400">{index + 1}</td>
                                        <td className="px-1"><input className="pr-input blue-lock" disabled value={row.ppaCode || ""}/></td>
                                        <td className="px-1"><input className="pr-input blue-lock" disabled value={row.majorFinalOutput || ""}/></td>
                                        <td className="px-1"><input type="number" className={`pr-input text-right ${editorLocked ? "locked" : ""}`} disabled={editorLocked} value={row.cost ?? ""} onChange={(event) => updateLbac5Row(index, "cost", event.target.value)}/></td>
                                        <td className="px-1"><input type="number" min="0" max="100" className={`pr-input text-right ${editorLocked ? "locked" : ""}`} disabled={editorLocked} value={row.weight ?? ""} onChange={(event) => updateLbac5Row(index, "weight", event.target.value)}/></td>
                                        <td className="px-1"><input className="pr-input blue-lock text-right" disabled value={calc.target}/></td>
                                        <td className="px-1"><input className="pr-input green-lock text-right" disabled value={calc.actual}/></td>
                                        <td className="px-2 py-2 text-right">{money(calc.variance)}</td>
                                        <td className="px-2 py-2 text-right">{percent(calc.accomplishment)}</td>
                                        <td className="px-2 py-2 text-center font-bold text-indigo-600">{calc.physical}</td>
                                        <td className="px-2 py-2 text-right bg-slate-50">{percent(calc.coa)}</td>
                                        <td className="px-1"><input type="number" min="0" className={`pr-input text-right ${editorLocked ? "locked" : ""}`} disabled={editorLocked} value={row.allotmentReleased ?? ""} onChange={(event) => updateLbac5Row(index, "allotmentReleased", event.target.value)}/></td>
                                        <td className="px-1"><input type="number" min="0" className={`pr-input text-right ${editorLocked ? "locked" : ""}`} disabled={editorLocked} value={row.obligationsIncurred ?? ""} onChange={(event) => updateLbac5Row(index, "obligationsIncurred", event.target.value)}/></td>
                                        <td className="px-2 py-2 text-right bg-slate-50">{money(calc.financialVariance)}</td>
                                        <td className="px-2 py-2 text-right">{percent(calc.absorptive)}</td>
                                        <td className="px-2 py-2 text-center font-bold text-emerald-600">{calc.financial}</td>
                                        <td className="px-1"><input className={`pr-input ${editorLocked ? "locked" : ""}`} disabled={editorLocked} value={row.remarks || ""} onChange={(event) => updateLbac5Row(index, "remarks", event.target.value)} placeholder="Optional"/></td>
                                    </tr>
                                );
                            })}</tbody></table></div><div className="grid gap-3 border-t bg-slate-50 p-4 sm:grid-cols-6"><div><span className="text-xs text-slate-500">Total Weight</span><div className={`font-bold ${Math.abs(lbac5Totals.weight - 100) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>{percent(lbac5Totals.weight)}</div></div><div><span className="text-xs text-slate-500">Avg. COA</span><div className="font-bold">{percent(lbac5Totals.averageCoa)}</div></div><div><span className="text-xs text-slate-500">Physical Weighted</span><div className="font-bold">{lbac5Totals.physical.toFixed(2)}</div></div><div><span className="text-xs text-slate-500">Financial Variance</span><div className={`font-bold ${lbac5Totals.financialVariance > 0 ? "text-rose-600" : "text-slate-800"}`}>{money(lbac5Totals.financialVariance)}</div></div><div><span className="text-xs text-slate-500">Financial Weighted</span><div className="font-bold">{lbac5Totals.financial.toFixed(2)}</div></div><div><span className="text-xs text-slate-500">Overall</span><div className="font-bold">{(lbac5Totals.physical + lbac5Totals.financial).toFixed(2)}</div></div></div></div>
                    )}

                    <div className="sticky bottom-3 z-20 rounded-2xl border bg-white/95 p-3 shadow-lg backdrop-blur"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="text-sm text-slate-500">{editorTab === "LBAC3" ? `Current quarter: ${QUARTER_NAMES[form.quarter] || form.quarter}. Target ${money(currentQuarterTotal.target)} | Actual ${money(currentQuarterTotal.actual)}.` : `LBAC 5 is generated from LBAC 3. Only the unlocked financial/evaluation cells require encoding.`}</div><div className="flex flex-wrap justify-end gap-2"><button disabled={saving || editorLocked} onClick={() => save("DRAFT")} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40">{saving ? "Saving..." : "Save Draft"}</button>{editorTab === "LBAC5" ? <button disabled={saving || editorLocked} onClick={() => save("SUBMIT")} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving ? <RefreshCw size={16} className="animate-spin"/> : <Send size={16}/>} Submit for Approval</button> : <button disabled={saving || editorLocked} onClick={async () => { const ok = await save("DRAFT"); if (ok) { setEditorTab("LBAC5"); await syncLbac5FromLbac3(); } }} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Save & Continue to LBAC 5</button>}</div></div></div>
                </div>
            )}

            {returnDialog.open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-4"><div><h3 className="font-bold">Return for Correction</h3><p className="text-xs text-slate-500">{returnDialog.report?.office} · {returnDialog.report?.formType}</p></div><button onClick={() => setReturnDialog({ open: false, report: null, remarks: "" })} className="rounded p-2"><X size={18}/></button></div><div className="p-4"><textarea className="pr-input" rows="5" value={returnDialog.remarks} onChange={(event) => setReturnDialog((current) => ({ ...current, remarks: event.target.value }))} placeholder="Enter correction remarks..."/></div><div className="flex justify-end gap-2 border-t p-4"><button onClick={() => setReturnDialog({ open: false, report: null, remarks: "" })} className="rounded-lg border px-4 py-2">Cancel</button><button onClick={returnReport} className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white">Return</button></div></div></div> : null}
            {approvalDialog.open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-4"><div><h3 className="font-bold">Approve Physical Report</h3><p className="text-xs text-slate-500">Both names and signature images are required.</p></div><button onClick={() => setApprovalDialog((current) => ({ ...current, open: false }))} className="rounded p-2"><X size={18}/></button></div><div className="grid gap-4 p-4 md:grid-cols-2"><Field label="Office / Department Head"><input className="pr-input" value={approvalDialog.officeHead} onChange={(event) => setApprovalDialog((current) => ({ ...current, officeHead: event.target.value }))}/></Field><Field label="Local Planning Coordinator"><input className="pr-input" value={approvalDialog.localPlanningCoordinator} onChange={(event) => setApprovalDialog((current) => ({ ...current, localPlanningCoordinator: event.target.value }))}/></Field><Field label="Head e-signature"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setApprovalDialog((current) => ({ ...current, officeHeadFile: event.target.files?.[0] || null }))}/></Field><Field label="Coordinator e-signature"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setApprovalDialog((current) => ({ ...current, coordinatorFile: event.target.files?.[0] || null }))}/></Field></div><div className="flex justify-end gap-2 border-t p-4"><button onClick={() => setApprovalDialog((current) => ({ ...current, open: false }))} className="rounded-lg border px-4 py-2">Cancel</button><button onClick={approve} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white"><Check size={16}/> Approve</button></div></div></div> : null}
        </>
    );
}

function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function printStyles() {
    return `@page{size:A4 landscape;margin:8mm}body{font-family:Arial,sans-serif;color:#111;font-size:9px}.meta{margin:10px 0;padding:8px;border:1px solid #bbb}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px;vertical-align:top}th{background:#eee;font-size:8px;text-align:center}.sign{display:flex;justify-content:space-between;margin-top:30px}.sign span{width:31%;border-top:1px solid #222;padding-top:5px}`;
}
