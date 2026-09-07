import { randomUUID } from "node:crypto";
import PhysicalReport from "../models/PhysicalReport.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import { DEPARTMENTS, OFFICES_BY_SECTOR, SECTORS } from "../constants/departments.js";
import { calculateEvaluationRow, calculateLbac5Totals } from "../utils/lbac5Calculations.js";
import { getSchedule, isWindowOpen } from "../utils/quarterSchedule.js";
import { bodyOf, cleanText, numberOrNull, parseJson, quarterValues, sectorForOffice } from "../utils/physicalReportControllerHelpers.js";
import { parseExpectedUpdatedAt, sameTimestamp, staleUpdateResponse } from "../utils/optimisticConcurrency.js";
import { writeAudit } from "../utils/audit.js";

const FORM_TYPES = ["LBAC3", "LBAC5"];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_NUMBERS = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
const ENCODER_ROLES = new Set(["EMPLOYEE", "ENCODER", "USER", "OFFICE_USER"]);
const APPROVAL_SIGNATURE_FIELDS = [
    "signatureOfficeHead",
    "signatureCoordinator",
];


const isHierarchyHeading = (row) =>
    ["MAIN", "GROUP", "SERVICE", "SECTION", "CATEGORY"].includes(
        String(row?.rowType || "").toUpperCase()
    );

const normalizeHierarchyType = (rowType, fallback = "GROUP") => {
    const value = String(rowType || "").toUpperCase();
    if (value === "ITEM") return "ITEM";
    if (value === "MAIN") return "MAIN";
    if (value === "GROUP" || value === "SERVICE" || value === "SECTION" || value === "CATEGORY") return "GROUP";
    return fallback;
};

const normalizeHeadingLevel = (value, fallback = 1) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(3, Math.trunc(parsed)));
};


const getEmployeeForSession = async (sessionId) =>
    Employee.findOne({
        userID: sessionId,
        isDeleted: { $ne: true },
    })
        .select("firstName lastName department position userID")
        .lean();

const getUserForSession = async (sessionId) =>
    User.findById(sessionId)
        .select("firstName lastName email role")
        .lean();

const getEncoderName = async (sessionId) => {
    const employee = await getEmployeeForSession(sessionId);
    if (employee) {
        const name = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
        if (name) return name;
    }

    const user = await getUserForSession(sessionId);
    const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return name || user?.email || "Encoder";
};

const getEncoderOffice = async (sessionId) => {
    const employee = await getEmployeeForSession(sessionId);
    return employee?.department || "";
};

const getAssignedOfficeForSession = async (sessionId) => {
    const employee = await getEmployeeForSession(sessionId);
    if (employee?.department) return employee.department;

    // Department Head accounts created before the Employee profile was linked
    // may still carry their office on the User document. Use it as a fallback so
    // the approval queue does not appear empty.
    const user = await User.findById(sessionId).lean();
    return cleanText(user?.department || user?.office || user?.assignedOffice);
};


const calculateLbac3QuarterTotals = (rows = []) => {
    const totals = {
        Q1: { target: 0, actual: 0, variance: 0 },
        Q2: { target: 0, actual: 0, variance: 0 },
        Q3: { target: 0, actual: 0, variance: 0 },
        Q4: { target: 0, actual: 0, variance: 0 },
    };

    for (const row of rows) {
        if (String(row?.rowType || "ITEM").toUpperCase() !== "ITEM") continue;
        for (const quarter of QUARTERS) {
            const key = quarter.toLowerCase();
            totals[quarter].target += Number(row.targetOutput?.[key] || 0);
            totals[quarter].actual += Number(row.actualPerformance?.[key] || 0);
        }
    }

    for (const quarter of QUARTERS) {
        totals[quarter].target = Number(totals[quarter].target.toFixed(2));
        totals[quarter].actual = Number(totals[quarter].actual.toFixed(2));
        totals[quarter].variance = Number(
            (totals[quarter].actual - totals[quarter].target).toFixed(2)
        );
    }

    return totals;
};

const parseLbac3Rows = (rows, reportMajorFinalOutput = "", reportMajorPpaCode = "") => {
    rows = parseJson(rows, []);

    if (!Array.isArray(rows)) {
        return { error: "LBAC 3 rows must be an array." };
    }

    // Ignore accidental completely-empty ITEM rows (for example, an unused
    // row left behind after clicking "Add PPA Row"). Structural GROUP rows
    // are always retained. A partially filled ITEM is retained so the normal
    // validation flow can still report what is missing.
    const meaningfulRows = rows.filter((raw) => {
        const row = raw || {};
        const rowType = normalizeHierarchyType(row.rowType, "ITEM");
        if (rowType === "GROUP") return true;

        const ppaName = cleanText(row.ppaName || row.majorFinalOutput);
        if (ppaName) return true;

        const hasOtherItemData = [
            row.ppaCode,
            row.performanceIndicator,
            row.groupKey,
            row.parentGroupKey,
            row.budgetType,
            row.remarks,
        ].some((value) => cleanText(value));

        const quarterHasValue = (value) => {
            if (value === null || value === undefined || value === "") return false;
            if (typeof value === "object") {
                return ["q1", "q2", "q3", "q4", "total"].some((key) => {
                    const candidate = value[key];
                    return candidate !== null && candidate !== undefined && candidate !== "";
                });
            }
            return true;
        };

        return hasOtherItemData || quarterHasValue(row.targetOutput) || quarterHasValue(row.actualPerformance);
    });

    const parsed = [];

    for (let index = 0; index < meaningfulRows.length; index += 1) {
        const row = meaningfulRows[index] || {};
        const rowType = normalizeHierarchyType(row.rowType, "ITEM");

        if (rowType === "MAIN") {
            parsed.push({
                rowKey: cleanText(row.rowKey || row._id || row.id) || `lbac3-main-${randomUUID()}`,
                rowType: "MAIN",
                headingLevel: 0,
                groupKey: "",
                parentGroupKey: "",
                categoryName: cleanText(row.categoryName || row.majorFinalOutput || row.ppaName || reportMajorFinalOutput),
                budgetType: cleanText(row.budgetType).toUpperCase() === "SUPPLEMENTAL" ? "SUPPLEMENTAL" : "REGULAR",
                ppaCode: "",
                ppaName: "",
                majorFinalOutput: cleanText(row.majorFinalOutput || row.categoryName || reportMajorFinalOutput),
                performanceIndicator: "",
                targetOutput: { q1: null, q2: null, q3: null, q4: null, total: 0 },
                actualPerformance: { q1: null, q2: null, q3: null, q4: null, total: 0 },
                variance: 0,
                remarks: "",
            });
            continue;
        }

        if (rowType === "GROUP") {
            parsed.push({
                rowKey: cleanText(row.rowKey || row._id || row.id) || `lbac3-group-${randomUUID()}`,
                rowType: "GROUP",
                headingLevel: normalizeHeadingLevel(row.headingLevel, 1),
                groupKey: cleanText(row.groupKey) || `lbac3-group-${randomUUID()}`,
                parentGroupKey: cleanText(row.parentGroupKey),
                categoryName: cleanText(row.categoryName || row.majorFinalOutput || row.ppaName),
                budgetType: cleanText(row.budgetType).toUpperCase() === "SUPPLEMENTAL" ? "SUPPLEMENTAL" : "REGULAR",
                ppaCode: "",
                ppaName: "",
                majorFinalOutput: cleanText(row.majorFinalOutput || row.categoryName),
                performanceIndicator: "",
                targetOutput: { q1: null, q2: null, q3: null, q4: null, total: 0 },
                actualPerformance: { q1: null, q2: null, q3: null, q4: null, total: 0 },
                variance: 0,
                remarks: "",
            });
            continue;
        }

        const ppaName = cleanText(row.ppaName || row.majorFinalOutput);
        const majorFinalOutput = cleanText(reportMajorFinalOutput || row.majorFinalOutput);
        const performanceIndicator = cleanText(row.performanceIndicator);

        // The office encoder may leave descriptive fields blank and complete them later.
        // Quarter identity and one-or-more rows remain the only structural rules.

        const target = quarterValues(row.targetOutput);
        if (target.error) {
            return {
                error: `Row ${index + 1}: ${target.error}`,
            };
        }

        const actual = quarterValues(row.actualPerformance);
        if (actual.error) {
            return {
                error: `Row ${index + 1}: ${actual.error}`,
            };
        }

        parsed.push({
            rowKey: cleanText(row.rowKey || row._id || row.id) || `lbac3-item-${randomUUID()}`,
            rowType: "ITEM",
            headingLevel: 4,
            groupKey: "",
            parentGroupKey: cleanText(row.parentGroupKey),
            budgetType: cleanText(row.budgetType).toUpperCase() === "SUPPLEMENTAL" ? "SUPPLEMENTAL" : "REGULAR",
            ppaCode: cleanText(row.ppaCode),
            ppaName,
            majorFinalOutput,
            performanceIndicator,
            targetOutput: target.value,
            actualPerformance: actual.value,
            variance: Number(
                (actual.value.total - target.value.total).toFixed(2)
            ),
            remarks: cleanText(row.remarks),
        });
    }

    return { value: parsed };
};

const parseLbac5Rows = (rows, linkedTotals, sourceRows = [], quarter = "", lockPhysicalFields = true) => {
    // LBAC 5 is an evaluation sheet generated from LBAC 3. The encoder must
    // never be required to add a PPA row here. Keep the complete source for
    // fallback generation, while using only ITEM rows for physical matching.
    const allSourceRows = Array.isArray(sourceRows) ? sourceRows.filter(Boolean) : [];
    const sourceItemRows = allSourceRows.filter(
        (row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM"
    );

    rows = parseJson(rows, []);

    // LBAC 5 must never be a standalone form: either the caller supplied a
    // saved LBAC 3 source to generate/lock rows from, or the incoming rows
    // already carry ITEM data (e.g. re-saving a previously generated sheet).
    // Only when NEITHER is available is there nothing to build LBAC 5 from.
    const hasProvidedItemRows = Array.isArray(rows) && rows.some(
        (row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM"
    );

    if (sourceItemRows.length === 0 && !hasProvidedItemRows) {
        return {
            error: "LBAC Form 5 requires a saved LBAC Form 3 first. Encode and save LBAC Form 3 before opening the evaluation sheet.",
        };
    }

    // If the client sends no evaluation rows, generate the evaluation rows
    // directly from the confirmed LBAC 3 source. This is intentional: LBAC 5
    // is not a second PPA-encoding form.
    if (!Array.isArray(rows) || rows.length === 0) {
        rows = prepareLbac5FromLbac3(
            { rows: allSourceRows, majorPpaCode: "", majorFinalOutput: "" },
            quarter,
            []
        );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
        return {
            error: "LBAC Form 5 could not be generated from the saved LBAC Form 3.",
        };
    }

    const parsed = [];

    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index] || {};
        const rowType = ["MAIN", "GROUP", "ITEM"].includes(row.rowType)
            ? row.rowType
            : "ITEM";
        // Descriptive and evaluation fields stay spreadsheet-friendly. The form
        // may be saved with whatever the encoder currently entered.
        const majorFinalOutput = cleanText(
            row.majorFinalOutput || row.ppaName || row.categoryName
        );

        if (rowType === "MAIN" || rowType === "GROUP") {
            parsed.push({
                rowType,
                headingLevel: rowType === "MAIN" ? 0 : normalizeHeadingLevel(row.headingLevel, 1),
                budgetType: cleanText(row.budgetType).toUpperCase() === "SUPPLEMENTAL" ? "SUPPLEMENTAL" : "REGULAR",
                groupKey: cleanText(row.groupKey),
                parentGroupKey: cleanText(row.parentGroupKey),
                ppaCode: cleanText(row.ppaCode),
                majorFinalOutput,
                cost: 0,
                weight: 0,
                targetOutput: 0,
                actualOutput: 0,
                variance: 0,
                accomplishmentPct: 0,
                physicalPoints: 1,
                physicalWeightedScore: 0,
                coaPct: 0,
                allotmentReleased: 0,
                obligationsIncurred: 0,
                financialVariance: 0,
                absorptiveCapacityPct: 0,
                financialPoints: 1,
                financialWeightedScore: 0,
                remarks: cleanText(row.remarks),
            });
            continue;
        }

        const firstGroupKey = cleanText(
            rows.find((candidate) => String(candidate?.rowType || "").toUpperCase() === "GROUP")?.groupKey
        );
        const parentGroupKey = cleanText(row.parentGroupKey) || firstGroupKey;

        const weight = numberOrNull(row.weight) ?? 0;
        const cost = numberOrNull(row.cost) ?? 0;
        let targetOutput = numberOrNull(row.targetOutput) ?? 0;
        let actualOutput = numberOrNull(row.actualOutput) ?? 0;
        const allotmentReleased = numberOrNull(row.allotmentReleased) ?? 0;
        const obligationsIncurred = numberOrNull(row.obligationsIncurred) ?? 0;

        const sourceMatch = (sourceRows || []).find((sourceRow) =>
            (cleanText(row.sourceLbac3RowKey) && cleanText(sourceRow.rowKey) === cleanText(row.sourceLbac3RowKey)) ||
            (cleanText(row.sourceLbac3RowId) && String(sourceRow._id || sourceRow.id || "") === String(row.sourceLbac3RowId)) ||
            (cleanText(sourceRow.ppaName || sourceRow.majorFinalOutput) === majorFinalOutput &&
                cleanText(sourceRow.performanceIndicator) === cleanText(row.performanceIndicator))
        );

        if (sourceMatch && lockPhysicalFields) {
            // Office users cannot change LBAC 5 physical Target/Actual.
            // These values are passed directly from LBAC 3's computed TOTAL columns.
            targetOutput = resolveSourcePhysicalValue(sourceMatch, "targetOutput", "targetOutput", quarter);
            actualOutput = resolveSourcePhysicalValue(sourceMatch, "actualPerformance", "actualOutput", quarter);
        }

        // Financial/physical fields are intentionally permissive. Missing values are
        // treated as zero so the encoder can save a draft without fighting validation.
        const safeWeight = Math.max(0, Math.min(100, Number(weight) || 0));

        const calculated = calculateEvaluationRow({
            ...row,
            rowType: "ITEM",
            groupKey: cleanText(row.groupKey),
            parentGroupKey,
            majorFinalOutput,
            weight: safeWeight,
            cost: Math.max(0, Number(cost) || 0),
            targetOutput: Math.max(0, Number(targetOutput) || 0),
            actualOutput: Math.max(0, Number(actualOutput) || 0),
            allotmentReleased: Math.max(0, Number(allotmentReleased) || 0),
            obligationsIncurred: Math.max(0, Number(obligationsIncurred) || 0),
        });

        parsed.push({
            ...calculated,
            rowType: "ITEM",
            groupKey: cleanText(row.groupKey),
            parentGroupKey,
            categoryName: cleanText(row.categoryName),
            budgetType: cleanText(row.budgetType).toUpperCase() === "SUPPLEMENTAL" ? "SUPPLEMENTAL" : "REGULAR",
            sourceLbac3RowId: row.sourceLbac3RowId || sourceMatch?._id || null,
            sourceLbac3RowKey: cleanText(row.sourceLbac3RowKey || sourceMatch?.rowKey),
        });
    }

    let itemRows = parsed.filter((row) => row.rowType === "ITEM");


    // Re-apply LBAC 3 physical values after parsing so the final persisted
    // LBAC 5 payload has exactly the same Target/Actual values that the
    // selected LBAC 3 quarter provides. Financial fields remain untouched.
    itemRows = synchronizeLbac5PhysicalValues(
        itemRows,
        sourceRows,
        quarter,
        lockPhysicalFields
    );

    let itemIndex = 0;
    for (let index = 0; index < parsed.length; index += 1) {
        if (parsed[index]?.rowType !== "ITEM") continue;
        parsed[index] = itemRows[itemIndex] || parsed[index];
        itemIndex += 1;
    }
    const totalTarget = Number(
        itemRows
            .reduce((sum, row) => sum + Number(row.targetOutput || 0), 0)
            .toFixed(2)
    );
    const totalActual = Number(
        itemRows
            .reduce((sum, row) => sum + Number(row.actualOutput || 0), 0)
            .toFixed(2)
    );

    // Linked totals are informative only. Do not reject a save when manual
    // LBAC 5 entries differ from the available LBAC 3 totals.

    // No row-count, total-matching, or 100% weight rule is enforced here.
    // The values entered by the encoder are preserved and recalculated.

    return { value: parsed };
};

const findLbac3Source = async (office, year, quarter) => {
    const filter = { office, year, formType: "LBAC3" };
    if (quarter && QUARTERS.includes(quarter)) filter.quarter = quarter;

    return PhysicalReport.findOne(filter)
        .sort({ quarter: 1, createdAt: 1 })
        .lean();
};

const legacyRowKey = (row, occurrence = 0) => {
    const type = isHierarchyHeading(row) ? "GROUP" : "ITEM";
    const base = [
        type,
        cleanText(row?.categoryName),
        cleanText(row?.ppaName || row?.majorFinalOutput),
        cleanText(row?.performanceIndicator),
    ].join("|").toLowerCase();
    return `legacy:${base}:${occurrence}`;
};

const ensureUniqueRowKeys = (rows = [], { prefix = "lbac3-item" } = {}) => {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).map((raw) => {
        const row = raw?.toObject ? raw.toObject() : { ...(raw || {}) };
        const type = isHierarchyHeading(row) ? "GROUP" : "ITEM";
        let rowKey = cleanText(row?.rowKey || row?._id || row?.id);

        // Existing rowKey values are authoritative, but never allow the same
        // identity to appear twice in one report payload. A duplicated key can
        // otherwise cause two UI rows to overwrite the same stored row during
        // merge/save operations.
        const key = rowKey ? `${type}:${rowKey}` : "";
        if (!rowKey || seen.has(key)) {
            rowKey = `${prefix}-${randomUUID()}`;
        }

        seen.add(`${type}:${rowKey}`);
        return { ...row, rowKey, rowType: type };
    });
};

const normalizeStoredLbac3Rows = (rows = []) => {
    const occurrenceBySignature = new Map();
    return (Array.isArray(rows) ? rows : []).map((raw) => {
        const row = raw?.toObject ? raw.toObject() : { ...(raw || {}) };
        const type = isHierarchyHeading(row) ? "GROUP" : "ITEM";
        let rowKey = cleanText(row?.rowKey);
        if (!rowKey) {
            const signature = [
                type,
                cleanText(row?.categoryName),
                cleanText(row?.ppaName || row?.majorFinalOutput),
                cleanText(row?.performanceIndicator),
                cleanText(row?.ppaCode),
            ].join("|").toLowerCase();
            const occurrence = occurrenceBySignature.get(signature) || 0;
            occurrenceBySignature.set(signature, occurrence + 1);
            rowKey = `legacy:${signature}:${occurrence}`;
        }
        return { ...row, rowKey, rowType: type };
    });
};

const mergeAnnualLbac3Reports = (reports = []) => {
    const ordered = [...reports]
        .filter(Boolean)
        .sort((a, b) => quarterNumber(a.quarter) - quarterNumber(b.quarter) || new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0));
    if (!ordered.length) return null;

    const rowMap = new Map();
    const rowOrder = [];
    const deletedKeys = new Set(ordered.flatMap((report) => Array.isArray(report.deletedLbac3RowKeys) ? report.deletedLbac3RowKeys.map(cleanText) : []).filter(Boolean));

    for (const report of ordered) {
        const rows = normalizeStoredLbac3Rows(report.rows || []);
        const occurrenceBySignature = new Map();

        for (const raw of rows) {
            const normalizedType = normalizeHierarchyType(raw?.rowType, "ITEM");
            const type = normalizedType === "MAIN" ? "MAIN" : normalizedType === "GROUP" ? "GROUP" : "ITEM";
            let rowKey = cleanText(raw?.rowKey);
            // Old releases could have generated a random rowKey on every quarterly
            // save. For those records, prefer the deterministic content signature so
            // the same spreadsheet row is not duplicated across quarters.
            if (rowKey.startsWith("lbac3-") || rowKey.startsWith("lbac3-item-") || rowKey.startsWith("lbac3-service-")) {
                const signature = [
                    type,
                    cleanText(raw?.categoryName),
                    cleanText(raw?.ppaName || raw?.majorFinalOutput),
                    cleanText(raw?.performanceIndicator),
                    cleanText(raw?.ppaCode),
                ].join("|").toLowerCase();
                const occurrence = occurrenceBySignature.get(signature) || 0;
                occurrenceBySignature.set(signature, occurrence + 1);
                rowKey = `legacy:${signature}:${occurrence}`;
            }

            if (deletedKeys.has(rowKey)) continue;
            const mapKey = `${type}:${rowKey}`;
            let target = rowMap.get(mapKey);
            if (!target) {
                target = {
                    ...(raw || {}),
                    rowKey,
                    rowType: type,
                    targetOutput: { q1: null, q2: null, q3: null, q4: null, total: 0 },
                    actualPerformance: { q1: null, q2: null, q3: null, q4: null, total: 0 },
                };
                rowMap.set(mapKey, target);
                rowOrder.push(mapKey);
            }

            for (const field of ["categoryName", "ppaCode", "ppaName", "majorFinalOutput", "performanceIndicator", "remarks", "budgetType", "rowType", "headingLevel", "groupKey", "parentGroupKey"]) {
                if (raw?.[field] !== undefined && raw?.[field] !== null && cleanText(raw[field]) !== "") {
                    target[field] = raw[field];
                }
            }

            if (type === "GROUP") continue;

            for (const q of ["q1", "q2", "q3", "q4"]) {
                const targetValue = numberOrNull(raw?.targetOutput?.[q]);
                const actualValue = numberOrNull(raw?.actualPerformance?.[q]);
                if (targetValue !== null) target.targetOutput[q] = targetValue;
                if (actualValue !== null) target.actualPerformance[q] = actualValue;
            }
        }
    }

    const rows = rowOrder.map((key) => rowMap.get(key));
    for (const row of rows) {
        if (String(row?.rowType || "ITEM").toUpperCase() !== "ITEM") continue;
        row.targetOutput.total = Number(["q1", "q2", "q3", "q4"].reduce((sum, q) => sum + Number(row.targetOutput?.[q] || 0), 0).toFixed(2));
        row.actualPerformance.total = Number(["q1", "q2", "q3", "q4"].reduce((sum, q) => sum + Number(row.actualPerformance?.[q] || 0), 0).toFixed(2));
        row.variance = Number((row.actualPerformance.total - row.targetOutput.total).toFixed(2));
    }

    const latest = ordered[ordered.length - 1];
    const headerSource = [...ordered].reverse().find((report) => cleanText(report.majorPpaCode) || cleanText(report.majorFinalOutput)) || latest;
    const identitySource = [...ordered].reverse().find((report) => cleanText(report.reportTitle) || cleanText(report.reportGroupId)) || latest;
    return {
        ...latest,
        reportGroupId: cleanText(identitySource.reportGroupId),
        reportTitle: cleanText(identitySource.reportTitle),
        majorPpaCode: cleanText(headerSource.majorPpaCode),
        majorFinalOutput: cleanText(headerSource.majorFinalOutput),
        rows,
        id: latest._id?.toString?.() || latest.id || null,
        sourceReportId: latest._id?.toString?.() || latest.id || null,
        annualSourceReportIds: ordered.map((report) => report._id?.toString?.() || report.id).filter(Boolean),
        deletedLbac3RowKeys: [...deletedKeys],
        mode: "ANNUAL_MERGED",
        quarterTotals: calculateLbac3QuarterTotals(rows),
    };
};

const lbac3ContentKey = (row) => {
    const type = isHierarchyHeading(row) ? "GROUP" : "ITEM";
    return [
        type,
        cleanText(row?.categoryName),
        cleanText(row?.ppaName || row?.majorFinalOutput),
        cleanText(row?.performanceIndicator),
        cleanText(row?.ppaCode),
    ].join("|").toLowerCase();
};

const mergeLbac3ForSave = ({ annualReports, incomingRows, quarter, isAdmin, deletedRowKeys = [] }) => {
    const baseline = mergeAnnualLbac3Reports(annualReports || []);
    const baseRows = ensureUniqueRowKeys(normalizeStoredLbac3Rows(baseline?.rows || []), { prefix: "lbac3-item" });
    const incoming = ensureUniqueRowKeys(normalizeStoredLbac3Rows(incomingRows || []), { prefix: "lbac3-item" });
    const deleted = new Set([
        ...(Array.isArray(baseline?.deletedLbac3RowKeys) ? baseline.deletedLbac3RowKeys : []),
        ...(Array.isArray(deletedRowKeys) ? deletedRowKeys : []),
    ].map(cleanText).filter(Boolean));
    const currentKey = String(quarter || "Q1").toLowerCase();
    const allowAllTargets = Boolean(isAdmin);
    const allowQ1Targets = isAdmin || String(quarter).toUpperCase() === "Q1";

    const byKey = new Map();
    const byContent = new Map();
    const result = [];
    for (const row of baseRows) {
        if (deleted.has(cleanText(row.rowKey))) continue;
        const key = cleanText(row.rowKey);
        if (key && !byKey.has(`${row.rowType}:${key}`)) {
            const clone = { ...row };
            clone.targetOutput = { q1: numberOrNull(row.targetOutput?.q1), q2: numberOrNull(row.targetOutput?.q2), q3: numberOrNull(row.targetOutput?.q3), q4: numberOrNull(row.targetOutput?.q4), total: 0 };
            clone.actualPerformance = { q1: numberOrNull(row.actualPerformance?.q1), q2: numberOrNull(row.actualPerformance?.q2), q3: numberOrNull(row.actualPerformance?.q3), q4: numberOrNull(row.actualPerformance?.q4), total: 0 };
            byKey.set(`${row.rowType}:${key}`, clone);
            const contentKey = lbac3ContentKey(clone);
            if (!byContent.has(contentKey)) byContent.set(contentKey, []);
            byContent.get(contentKey).push(clone);
            result.push(clone);
        }
    }

    const used = new Set();
    const findMatch = (row) => {
        const key = cleanText(row.rowKey);
        if (key) {
            const exact = byKey.get(`${row.rowType}:${key}`);
            if (exact && !used.has(exact)) return exact;
        }
        const contentKey = lbac3ContentKey(row);
        const queue = byContent.get(contentKey) || [];
        return queue.find((candidate) => !used.has(candidate)) || null;
    };

    for (const incomingRow of incoming) {
        const incomingKey = cleanText(incomingRow.rowKey);
        if (incomingKey && deleted.has(incomingKey)) continue;
        let target = findMatch(incomingRow);
        if (!target) {
            target = {
                ...incomingRow,
                rowKey: incomingKey || `lbac3-item-${randomUUID()}`,
                targetOutput: { q1: null, q2: null, q3: null, q4: null, total: 0 },
                actualPerformance: { q1: null, q2: null, q3: null, q4: null, total: 0 },
            };
            result.push(target);
            byKey.set(`${target.rowType}:${target.rowKey}`, target);
        }
        used.add(target);

        // Descriptive input is persistent. A blank request does not erase a value
        // that was already entered in another quarter.
        for (const field of ["categoryName", "ppaCode", "ppaName", "majorFinalOutput", "performanceIndicator", "remarks", "budgetType", "rowType", "headingLevel", "groupKey", "parentGroupKey"]) {
            if (incomingRow[field] !== undefined && incomingRow[field] !== null && cleanText(incomingRow[field]) !== "") {
                target[field] = incomingRow[field];
            }
        }

        if (isHierarchyHeading(target)) continue;

        const targetQs = ["q1", "q2", "q3", "q4"];
        for (const q of targetQs) {
            const incomingValue = numberOrNull(incomingRow.targetOutput?.[q]);
            if (allowAllTargets || (allowQ1Targets && q === currentKey)) {
                if (incomingValue !== null) target.targetOutput[q] = incomingValue;
            }
        }

        const actualValue = numberOrNull(incomingRow.actualPerformance?.[currentKey]);
        if (actualValue !== null) target.actualPerformance[currentKey] = actualValue;
        if (isAdmin) {
            for (const q of targetQs) {
                const value = numberOrNull(incomingRow.actualPerformance?.[q]);
                if (value !== null) target.actualPerformance[q] = value;
            }
        }
    }

    let firstItemPpaCode = "";
    for (const row of result) {
        if (String(row?.rowType || "ITEM").toUpperCase() !== "ITEM") continue;
        if (!firstItemPpaCode && cleanText(row.ppaCode)) firstItemPpaCode = cleanText(row.ppaCode);
        row.targetOutput.total = Number(["q1", "q2", "q3", "q4"].reduce((sum, q) => sum + Number(row.targetOutput?.[q] || 0), 0).toFixed(2));
        row.actualPerformance.total = Number(["q1", "q2", "q3", "q4"].reduce((sum, q) => sum + Number(row.actualPerformance?.[q] || 0), 0).toFixed(2));
        row.variance = Number((row.actualPerformance.total - row.targetOutput.total).toFixed(2));
    }
    for (const row of result) {
        if (String(row?.rowType || "ITEM").toUpperCase() !== "ITEM") continue;
        row.ppaCode = firstItemPpaCode && cleanText(row.ppaCode) === firstItemPpaCode ? firstItemPpaCode : "";
    }
    return result;
};

const findLbac3AnnualSource = async (office, year, quarter, reportGroupId = "") => {
    const filter = { office, year, formType: "LBAC3" };
    if (reportGroupId) filter.reportGroupId = reportGroupId;
    const reports = await PhysicalReport.find(filter)
        .sort({ quarter: 1, updatedAt: 1, createdAt: 1 })
        .lean();
    if (!reports.length) return null;
    const merged = mergeAnnualLbac3Reports(reports);
    const exact = reports.find((report) => report.quarter === quarter);
    return {
        ...merged,
        // Keep the requested quarter as the active editing quarter.
        quarter: quarter || exact?.quarter || merged.quarter,
        reportGroupId: merged.reportGroupId || reportGroupId || "",
        reportTitle: merged.reportTitle || "",
        activeReportId: exact?._id?.toString?.() || exact?.id || null,
        activeReport: exact || null,
        annualReports: reports,
    };
};

const findLbac3CarryForwardSource = async (office, year, quarter) => {
    const exact = await findLbac3Source(office, year, quarter);
    if (exact) return exact;

    const currentNumber = quarterNumber(quarter);
    const priorQuarters = QUARTERS.slice(0, Math.max(0, currentNumber - 1));
    if (!priorQuarters.length) return null;

    // Carry forward the latest completed quarter so the next quarter opens
    // with the existing annual targets and previously encoded actual outputs.
    return PhysicalReport.findOne({
        office,
        year,
        formType: "LBAC3",
        quarter: { $in: priorQuarters },
    })
        .sort({ quarter: -1, updatedAt: -1, createdAt: -1 })
        .lean();
};

const findPriorQuarterForReportGroup = async (office, year, quarter, reportGroupId) => {
    const currentNumber = quarterNumber(quarter);
    if (!reportGroupId || currentNumber <= 1) return null;
    const priorQuarters = QUARTERS.slice(0, currentNumber - 1);
    return PhysicalReport.findOne({
        office,
        year,
        formType: "LBAC3",
        reportGroupId,
        quarter: { $in: priorQuarters },
    })
        .sort({ quarter: -1, updatedAt: -1, createdAt: -1 })
        .lean();
};

const findLbac3Template = async (office, year, reportGroupId = "") =>
    PhysicalReport.findOne({
        office,
        year,
        formType: "LBAC3",
        ...(reportGroupId ? { reportGroupId } : {}),
        status: {
            $in: [
                "SUBMITTED",
                "UNDER_REVIEW",
                "RESUBMITTED",
                "APPROVED",
                "VALIDATED",
                "COMPLETED",
                "PENDING",
                "APPROVED_BY_HEAD",
            ],
        },
    })
        .sort({ quarter: 1, createdAt: 1 })
        .lean();

export const freezeStatus = (status) =>
    ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN"].includes(status);

const currentQuarterNumber = (date = new Date()) => Math.floor(date.getMonth() / 3) + 1;
const quarterNumber = (quarter) => QUARTER_NUMBERS[String(quarter || "").toUpperCase()] || 0;

const assertEncoderQuarterWriteWindow = async (req, year, quarter) => {
    if (!ENCODER_ROLES.has(req.session?.role)) return null;

    const schedule = await getSchedule(year, quarter);

    // If Admin has configured a schedule, it is authoritative for office writes.
    if (schedule) {
        if (!isWindowOpen(schedule)) {
            return {
                status: 403,
                body: {
                    success: false,
                    error: `The ${quarter} ${year} reporting window is closed. Physical Report changes are no longer allowed.`,
                    code: "QUARTER_WINDOW_CLOSED",
                    quarter,
                    year: Number(year),
                    window: {
                        openAt: schedule.openAt || null,
                        closeAt: schedule.closeAt || null,
                        enabled: Boolean(schedule.enabled),
                    },
                },
            };
        }
        return null;
    }

    // Physical Report input windows are intentionally Admin-controlled.
    // Without an enabled schedule, office users cannot write to that quarter.
    return {
        status: 403,
        body: {
            success: false,
            error: `The ${quarter} ${year} input window has not been opened by Admin yet.`,
            code: "QUARTER_WINDOW_NOT_CONFIGURED",
            quarter,
            year: Number(year),
        },
    };
};

const isQuarterClosed = (year, quarter, date = new Date()) => {
    const numericYear = Number(year);
    const numericQuarter = quarterNumber(quarter);
    const currentYear = date.getFullYear();
    const currentQuarter = currentQuarterNumber(date);

    if (!numericYear || !numericQuarter) return false;
    return numericYear < currentYear ||
        (numericYear === currentYear && numericQuarter < currentQuarter);
};

// Historical quarter backfill is intentionally allowed during the rollout: Q1/Q2
// can be encoded now, but once that snapshot is submitted/reviewed it becomes
// immutable unless the Department Head explicitly returns it for correction.
const encoderQuarterIsFrozen = (report) => {
    if (!report) return false;

    // A report explicitly returned/denied for correction remains editable by
    // its assigned encoder even when the calendar quarter has already ended.
    // Otherwise, historical non-editable snapshots stay frozen after the
    // quarter closes or once the report reaches a terminal approval state.
    if (["RETURNED", "DENIED", "DRAFT"].includes(String(report.status || "").toUpperCase())) {
        return String(report.status || "").toUpperCase() !== "DRAFT"
            ? false
            : isQuarterClosed(report.year, report.quarter);
    }

    if (freezeStatus(report.status)) return true;
    return isQuarterClosed(report.year, report.quarter);
};

export const editableStatus = (status) =>
    ["DRAFT", "RETURNED", "DENIED"].includes(status);

export const activeReviewStatus = (status) =>
    ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "PENDING"].includes(status);

const structureOnlyRows = (rows = []) =>
    rows.map((row) => ({
        rowKey: cleanText(row?.rowKey || row?._id || row?.id) || `lbac3-structure-${randomUUID()}`,
        rowType: isHierarchyHeading(row) ? "GROUP" : "ITEM",
        headingLevel: isHierarchyHeading(row) ? normalizeHeadingLevel(row?.headingLevel, 1) : 4,
        groupKey: cleanText(row?.groupKey) || (isHierarchyHeading(row) ? `lbac3-structure-${randomUUID()}` : ""),
        parentGroupKey: cleanText(row?.parentGroupKey),
        budgetType: row.budgetType || "REGULAR",
        ppaCode: row.ppaCode || "",
        ppaName: row.ppaName || row.majorFinalOutput || "",
        majorFinalOutput: row.majorFinalOutput || "",
        categoryName: row.categoryName || "General Service",
        performanceIndicator: row.performanceIndicator || "",
        targetOutput: { q1: null, q2: null, q3: null, q4: null, total: 0 },
        actualPerformance: { q1: null, q2: null, q3: null, q4: null, total: 0 },
        variance: 0,
        remarks: row.remarks || "",
    }));

const buildQuarterSnapshotRows = (rows, quarter, templateRows = []) => {
    const key = String(quarter || "").toLowerCase();
    const incoming = Array.isArray(rows) ? rows : [];
    const existing = Array.isArray(templateRows) ? templateRows : [];
    const used = new Set();

    const identity = (row) => {
        const rowType = isHierarchyHeading(row) ? "GROUP" : "ITEM";
        const rowKey = cleanText(row?.rowKey || row?._id || row?.id);
        if (rowKey) return `${rowType}:${rowKey}`;
        if (rowType === "GROUP") return `GROUP:${cleanText(row?.groupKey || row?.parentGroupKey)}:${cleanText(row?.categoryName)}`;
        return `ITEM:${cleanText(row?.ppaCode)}:${cleanText(row?.ppaName)}:${cleanText(row?.performanceIndicator)}`;
    };

    const findIncoming = (base) => {
        const exact = incoming.findIndex((candidate, index) => {
            if (used.has(index)) return false;
            return identity(candidate) === identity(base);
        });
        if (exact >= 0) {
            used.add(exact);
            return incoming[exact];
        }
        return null;
    };

    const mergeRow = (base, current) => {
        const rowType = String((current || base)?.rowType || "ITEM").toUpperCase() === "SERVICE" ? "SERVICE" : "ITEM";
        if (rowType === "GROUP") {
            return {
                ...base,
                rowKey: cleanText(current?.rowKey || base?.rowKey) || `lbac3-service-${randomUUID()}`,
                rowType: "SERVICE",
                categoryName: cleanText(current?.categoryName || base?.categoryName || "Service"),
                budgetType: "REGULAR",
                ppaCode: "",
                ppaName: "",
                majorFinalOutput: "",
                performanceIndicator: "",
                targetOutput: base?.targetOutput || { q1: null, q2: null, q3: null, q4: null, total: 0 },
                actualPerformance: base?.actualPerformance || { q1: null, q2: null, q3: null, q4: null, total: 0 },
                variance: 0,
                remarks: base?.remarks || "",
            };
        }

        const target = {
            q1: numberOrNull(base?.targetOutput?.q1),
            q2: numberOrNull(base?.targetOutput?.q2),
            q3: numberOrNull(base?.targetOutput?.q3),
            q4: numberOrNull(base?.targetOutput?.q4),
        };
        const actual = {
            q1: numberOrNull(base?.actualPerformance?.q1),
            q2: numberOrNull(base?.actualPerformance?.q2),
            q3: numberOrNull(base?.actualPerformance?.q3),
            q4: numberOrNull(base?.actualPerformance?.q4),
        };

        if (current) {
            target[key] = numberOrNull(current?.targetOutput?.[key]);
            actual[key] = numberOrNull(current?.actualPerformance?.[key]);
        }

        const targetTotal = Number(Object.values(target).filter((value) => value !== null).reduce((sum, value) => sum + Number(value || 0), 0).toFixed(2));
        const actualTotal = Number(Object.values(actual).filter((value) => value !== null).reduce((sum, value) => sum + Number(value || 0), 0).toFixed(2));

        return {
            ...base,
            ...(current || {}),
            rowKey: cleanText(current?.rowKey || base?.rowKey) || `lbac3-item-${randomUUID()}`,
            rowType: "ITEM",
            budgetType: cleanText(current?.budgetType || base?.budgetType).toUpperCase() === "SUPPLEMENTAL" ? "SUPPLEMENTAL" : "REGULAR",
            targetOutput: { ...target, total: targetTotal },
            actualPerformance: { ...actual, total: actualTotal },
            variance: Number((actualTotal - targetTotal).toFixed(2)),
        };
    };

    const merged = existing.map((base) => mergeRow(base, findIncoming(base)));

    // New services/PPA rows are appended without clearing any previously captured quarter.
    incoming.forEach((candidate, index) => {
        if (used.has(index)) return;
        const blank = { q1: null, q2: null, q3: null, q4: null };
        const rowType = String(candidate?.rowType || "ITEM").toUpperCase() === "SERVICE" ? "SERVICE" : "ITEM";
        if (rowType === "GROUP") {
            merged.push({
                ...candidate,
                rowKey: cleanText(candidate?.rowKey) || `lbac3-service-${randomUUID()}`,
                rowType: "SERVICE",
                categoryName: cleanText(candidate.categoryName || "Service"),
                budgetType: "REGULAR",
                targetOutput: { ...blank, total: 0 },
                actualPerformance: { ...blank, total: 0 },
                variance: 0,
            });
            return;
        }
        const target = { ...blank, [key]: numberOrNull(candidate?.targetOutput?.[key]) };
        const actual = { ...blank, [key]: numberOrNull(candidate?.actualPerformance?.[key]) };
        const targetTotal = Number((target[key] || 0).toFixed(2));
        const actualTotal = Number((actual[key] || 0).toFixed(2));
        merged.push({
            ...candidate,
            rowKey: cleanText(candidate?.rowKey) || `lbac3-item-${randomUUID()}`,
            rowType: "ITEM",
            targetOutput: { ...target, total: targetTotal },
            actualPerformance: { ...actual, total: actualTotal },
            variance: Number((actualTotal - targetTotal).toFixed(2)),
        });
    });

    return merged;
};

const cumulativeQuarterValue = (values, quarter) => {
    // Normal case: LBAC 3 stores a per-quarter breakdown object
    // ({ q1, q2, q3, q4, total }) and this sums it up to the selected
    // quarter. Some callers (older/pre-migration records, or rows built
    // directly from an already-cumulative total) pass a plain finite
    // number instead - treat that as the cumulative value as-is rather
    // than silently collapsing it to 0.
    if (typeof values === "number" && Number.isFinite(values)) {
        return values;
    }

    const order = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
    const end = order[String(quarter || "Q4").toUpperCase()] || 4;
    return ["q1", "q2", "q3", "q4"].slice(0, end).reduce((sum, key) => sum + Number(values?.[key] || 0), 0);
};

// LBAC 3 source rows normally carry their physical values as a per-quarter
// breakdown object (targetOutput / actualPerformance). If a source row is
// missing/malformed that breakdown but does carry a flat numeric value
// (e.g. a legacy record, or a row built directly with a flat targetOutput/
// actualOutput), fall back to that flat value instead of silently
// collapsing a saved office's accomplishment to 0.
const resolveSourcePhysicalValue = (sourceRow, quarterObjectField, flatField, quarter) => {
    const fromQuarterBreakdown = cumulativeQuarterValue(sourceRow?.[quarterObjectField], quarter);
    if (fromQuarterBreakdown) return fromQuarterBreakdown;

    const flat = Number(sourceRow?.[flatField]);
    return Number.isFinite(flat) ? flat : fromQuarterBreakdown;
};

const physicalItemKey = (row, occurrence = 0) => {
    // PPA Code is a report/header identifier in LBAC 3 and is NOT unique per
    // activity row. Never use it by itself as an LBAC 5 row identity.
    const sourceKey = cleanText(row?.sourceLbac3RowKey);
    if (sourceKey) return `source-key:${sourceKey}`;
    const sourceId = cleanText(row?.sourceLbac3RowId);
    if (sourceId) return `source:${sourceId}`;
    const rowKey = cleanText(row?.rowKey);
    if (rowKey) return `row:${rowKey}`;
    return [
        cleanText(row?.categoryName),
        cleanText(row?.ppaName || row?.majorFinalOutput),
        cleanText(row?.performanceIndicator),
        cleanText(row?.ppaCode),
        occurrence,
    ].join("|").toLowerCase();
};

const prepareLbac5FromLbac3 = (source, quarter, financialSourceRows = []) => {
    if (!source) return [];

    const financialRows = (Array.isArray(financialSourceRows) ? financialSourceRows : [])
        .filter((row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM");

    const financialBySourceId = new Map(
        financialRows
            .map((row) => [cleanText(row?.sourceLbac3RowId), row])
            .filter(([key]) => key)
    );

    const financialMap = new Map(
        financialRows
            .map((row) => [physicalItemKey(row), row])
            .filter(([key]) => key)
    );

    // Prefer the explicit LBAC3 source row key when available. This is the
    // strongest identity between a physical PPA and its LBAC5 financial data.
    const financialBySourceKey = new Map(
        financialRows
            .map((row) => [cleanText(row?.sourceLbac3RowKey), row])
            .filter(([key]) => key)
    );

    const output = [];
    const headingMap = new Map();
    const stack = [];
    const matchedSourceKeys = new Set();
    let fallbackLevel = 0;

    output.push({
        rowType: "MAIN",
        groupKey: "",
        parentGroupKey: "",
        headingLevel: 0,
        budgetType: "REGULAR",
        ppaCode: Array.isArray(source) ? "" : source.majorPpaCode || "",
        majorFinalOutput: Array.isArray(source) ? "" : source.majorFinalOutput || "",
        categoryName: "",
        cost: 0,
        weight: 0,
        targetOutput: 0,
        actualOutput: 0,
        allotmentReleased: 0,
        obligationsIncurred: 0,
        remarks: "",
    });

    for (const sourceRow of source.rows || []) {
        const type = String(sourceRow?.rowType || "ITEM").toUpperCase();

        if (type === "MAIN") {
            continue;
        }

        if (type !== "ITEM") {
            const level = normalizeHeadingLevel(sourceRow.headingLevel, Math.min(fallbackLevel, 3));
            while (stack.length > level) stack.pop();

            const parentGroupKey = level > 0 ? (stack[level - 1]?.groupKey || "") : "";
            const label = cleanText(sourceRow.categoryName || sourceRow.majorFinalOutput || sourceRow.ppaName || `Heading ${level + 1}`);
            const rawKey = cleanText(sourceRow.groupKey);
            const groupKey = rawKey || `lbac3-group:${level}:${label.toLowerCase()}:${stack.map((item) => item.groupKey).join("/")}`;

            const group = {
                rowType: "GROUP",
                groupKey,
                parentGroupKey,
                headingLevel: level,
                budgetType: sourceRow.budgetType || "REGULAR",
                categoryName: label,
                ppaCode: "",
                majorFinalOutput: label,
                cost: 0,
                weight: 0,
                targetOutput: 0,
                actualOutput: 0,
                allotmentReleased: 0,
                obligationsIncurred: 0,
                remarks: "",
            };

            // Prevent duplicate headings when legacy rows repeat a heading.
            const headingIdentity = `${level}|${parentGroupKey}|${label.toLowerCase()}`;
            const existing = headingMap.get(headingIdentity);
            if (existing) {
                stack[level] = existing;
            } else {
                output.push(group);
                headingMap.set(headingIdentity, group);
                stack[level] = group;
            }

            stack.length = level + 1;
            fallbackLevel = Math.min(level + 1, 3);
            continue;
        }

        const key = physicalItemKey(sourceRow);
        const sourceRowId = cleanText(sourceRow?._id || sourceRow?.id);
        const sourceRowKey = cleanText(sourceRow?.rowKey);
        const financial =
            financialBySourceId.get(sourceRowId) ||
            financialBySourceKey.get(sourceRowKey) ||
            financialMap.get(key) ||
            {};
        if (sourceRowId) matchedSourceKeys.add(`id:${sourceRowId}`);
        if (key) matchedSourceKeys.add(`key:${key}`);

        const parentGroup = [...stack].reverse().find(Boolean);
        const parentGroupKey = parentGroup?.groupKey || "";

        output.push({
            rowType: "ITEM",
            groupKey: "",
            parentGroupKey,
            headingLevel: 4,
            budgetType: sourceRow.budgetType || "REGULAR",
            sourceLbac3RowId: sourceRow?._id || financial?.sourceLbac3RowId || null,
            sourceLbac3RowKey: cleanText(sourceRow?.rowKey || financial?.sourceLbac3RowKey),
            ppaCode: sourceRow.ppaCode || financial.ppaCode || "",
            majorFinalOutput: sourceRow.ppaName || sourceRow.majorFinalOutput || financial.majorFinalOutput || "",
            cost: financial.cost ?? "",
            weight: financial.weight ?? "",
            targetOutput: resolveSourcePhysicalValue(sourceRow, "targetOutput", "targetOutput", quarter),
            actualOutput: resolveSourcePhysicalValue(sourceRow, "actualPerformance", "actualOutput", quarter),
            coaPct: financial.coaPct ?? "",
            allotmentReleased: financial.allotmentReleased ?? "",
            obligationsIncurred: financial.obligationsIncurred ?? "",
            remarks: financial.remarks ?? sourceRow.remarks ?? "",
        });
    }

    // LBAC 3 is the structural source. Do not append orphan LBAC 5 rows here;
    // existing financial values are merged only when their source PPA exists.
    // Group totals are derived from their descendant ITEM rows. They are
    // informational only and are never used as weighted evaluation rows.
    const groupTotals = new Map();
    for (const row of output) {
        if (String(row?.rowType || "").toUpperCase() !== "GROUP") continue;
        groupTotals.set(row.groupKey, { target: 0, actual: 0 });
    }

    const groupByKey = new Map(
        output
            .filter((row) => String(row?.rowType || "").toUpperCase() === "GROUP")
            .map((row) => [row.groupKey, row])
    );

    const addToAncestors = (groupKey, target, actual) => {
        const visited = new Set();
        let currentKey = cleanText(groupKey);
        while (currentKey && !visited.has(currentKey)) {
            visited.add(currentKey);
            const total = groupTotals.get(currentKey);
            const group = groupByKey.get(currentKey);
            if (!total || !group) break;
            total.target += Number(target || 0);
            total.actual += Number(actual || 0);
            currentKey = cleanText(group.parentGroupKey);
        }
    };

    for (const row of output) {
        if (String(row?.rowType || "").toUpperCase() !== "ITEM") continue;
        addToAncestors(row.parentGroupKey, row.targetOutput, row.actualOutput);
    }

    for (const row of output) {
        if (String(row?.rowType || "").toUpperCase() !== "GROUP") continue;
        const total = groupTotals.get(row.groupKey) || { target: 0, actual: 0 };
        row.targetOutput = Number(total.target.toFixed(2));
        row.actualOutput = Number(total.actual.toFixed(2));
        row.variance = Number((total.actual - total.target).toFixed(2));
    }

    const mainRow = output.find((row) => String(row?.rowType || "").toUpperCase() === "MAIN");
    if (mainRow) {
        const itemTotals = output
            .filter((row) => String(row?.rowType || "").toUpperCase() === "ITEM")
            .reduce((totals, row) => ({
                target: totals.target + Number(row.targetOutput || 0),
                actual: totals.actual + Number(row.actualOutput || 0),
            }), { target: 0, actual: 0 });
        mainRow.targetOutput = Number(itemTotals.target.toFixed(2));
        mainRow.actualOutput = Number(itemTotals.actual.toFixed(2));
        mainRow.variance = Number((itemTotals.actual - itemTotals.target).toFixed(2));
    }

    return output;
};
const getLinkedQuarterTotals = (source, quarter) => {
    const rows = Array.isArray(source?.rows) ? source.rows : [];
    const items = rows.filter((row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM");
    const target = items.reduce((sum, row) => sum + resolveSourcePhysicalValue(row, "targetOutput", "targetOutput", quarter), 0);
    const actual = items.reduce((sum, row) => sum + resolveSourcePhysicalValue(row, "actualPerformance", "actualOutput", quarter), 0);

    return {
        quarter,
        target: Number(target.toFixed(2)),
        actual: Number(actual.toFixed(2)),
        variance: Number((actual - target).toFixed(2)),
    };
};

const synchronizeLbac5PhysicalValues = (rows, sourceRows, quarter, lockPhysicalFields = true) => {
    if (!Array.isArray(rows) || !Array.isArray(sourceRows) || !quarter || !lockPhysicalFields) return Array.isArray(rows) ? rows : [];

    return rows.map((row) => {
        if (String(row?.rowType || "ITEM").toUpperCase() !== "ITEM") return row;

        const majorFinalOutput = cleanText(row?.majorFinalOutput || row?.ppaName || row?.categoryName);
        const sourceMatch = sourceRows.find((sourceRow) =>
            (cleanText(row?.sourceLbac3RowKey) && cleanText(sourceRow?.rowKey) === cleanText(row?.sourceLbac3RowKey)) ||
            (cleanText(row?.sourceLbac3RowId) && String(sourceRow?._id || sourceRow?.id || "") === String(row?.sourceLbac3RowId)) ||
            (cleanText(sourceRow?.ppaName || sourceRow?.majorFinalOutput) === majorFinalOutput &&
                cleanText(sourceRow?.performanceIndicator) === cleanText(row?.performanceIndicator))
        );

        if (!sourceMatch) return row;

        const targetOutput = resolveSourcePhysicalValue(sourceMatch, "targetOutput", "targetOutput", quarter);
        const actualOutput = resolveSourcePhysicalValue(sourceMatch, "actualPerformance", "actualOutput", quarter);
        const recalculated = calculateEvaluationRow({ ...row, targetOutput, actualOutput });

        return {
            ...row,
            sourceLbac3RowId: row.sourceLbac3RowId || sourceMatch._id || sourceMatch.id || null,
            sourceLbac3RowKey: cleanText(row.sourceLbac3RowKey || sourceMatch.rowKey),
            targetOutput: recalculated.targetOutput,
            actualOutput: recalculated.actualOutput,
            variance: recalculated.variance,
            accomplishmentPct: recalculated.accomplishmentPct,
            physicalPoints: recalculated.physicalPoints,
            physicalWeightedScore: recalculated.physicalWeightedScore,
            coaPct: recalculated.coaPct,
        };
    });
};

const signatureFiles = (req, required = false) => {
    const files = {};

    for (const field of APPROVAL_SIGNATURE_FIELDS) {
        const file = req.files?.[field]?.[0];

        if (!file) {
            if (required) {
                return {
                    error: `${field} is required during approval.`,
                };
            }
            continue;
        }

        if (!/^image\/(png|jpeg|webp)$/.test(file.mimetype)) {
            return {
                error: `${field} must be a PNG, JPG, or WebP image.`,
            };
        }

        if (file.size > 2 * 1024 * 1024) {
            return {
                error: `${field} must be 2 MB or smaller.`,
            };
        }

        const key = field === "signatureOfficeHead"
            ? "officeHead"
            : "localPlanningCoordinator";

        files[key] = {
            data: file.buffer,
            mimeType: file.mimetype,
            fileName: file.originalname,
            uploadedAt: new Date(),
        };
    }

    return { value: files };
};

const serializeSignature = (signature) =>
    signature
        ? {
              fileName: signature.fileName || "",
              mimeType: signature.mimeType || "",
              uploadedAt: signature.uploadedAt || null,
          }
        : null;

const serialize = (report) => {
    const item = report?.toObject ? report.toObject() : report;

    if (!item) return null;

    return {
        ...item,
        id: item._id?.toString?.() || item.id,
        rows: Array.isArray(item.rows) ? item.rows.filter(Boolean) : [],
        evaluationRows: Array.isArray(item.evaluationRows) ? item.evaluationRows.filter(Boolean) : [],
        formType: item.formType || "LBAC3",
        submittedBy:
            item.submittedBy?._id?.toString?.() ||
            item.submittedBy?.toString?.() ||
            null,
        createdBy:
            item.createdBy?._id?.toString?.() ||
            item.createdBy?.toString?.() ||
            item.submittedBy?._id?.toString?.() ||
            item.submittedBy?.toString?.() ||
            null,
        createdByName:
            `${item.createdBy?.firstName || ""} ${item.createdBy?.lastName || ""}`.trim() ||
            item.createdBy?.email ||
            "",
        reviewedBy:
            item.reviewedBy?._id?.toString?.() ||
            item.reviewedBy?.toString?.() ||
            null,
        validatedBy:
            item.validatedBy?._id?.toString?.() ||
            item.validatedBy?.toString?.() ||
            null,
        carriedForwardFromReport:
            item.carriedForwardFromReport?._id?.toString?.() ||
            item.carriedForwardFromReport?.toString?.() ||
            null,
        carriedForwardFromQuarter: item.carriedForwardFromQuarter || "",
        carriedForwardAt: item.carriedForwardAt || null,
        carriedForwardBy:
            item.carriedForwardBy?._id?.toString?.() ||
            item.carriedForwardBy?.toString?.() ||
            null,
        carriedForwardByName: item.carriedForwardByName || "",
        signatures: {
            officeHead: serializeSignature(
                item.signatures?.officeHead
            ),
            localPlanningCoordinator: serializeSignature(
                item.signatures?.localPlanningCoordinator
            ),
        },
        quarterClosed: isQuarterClosed(item.year, item.quarter),
        encoderFrozen: encoderQuarterIsFrozen(item),
    };
};

const canAccess = (req, report, office) => {
    if (req.session.role === "ADMIN") return true;
    if (!office || report.office !== office) return false;
    // Physical Report data belongs to the assigned OFFICE, not to the
    // individual encoder who originally created the record.
    // Department Heads and Office Encoders can therefore view the same
    // office history, including records backfilled by PPDO/Admin.
    if (["DEPARTMENT_HEAD", ...ENCODER_ROLES].includes(req.session.role)) return true;
    return false;
};

const duplicateFilter = (values, excludeId = null) => {
    const filter = {
        office: values.office,
        year: values.year,
        formType: values.formType,
        quarter: values.quarter,
    };
    if (values.reportGroupId) filter.reportGroupId = values.reportGroupId;

    if (excludeId) {
        filter._id = { $ne: excludeId };
    }

    return filter;
};

export const listPhysicalReports = async (req, res) => {
    try {
        const isAdmin = req.session.role === "ADMIN";
        const isHead = req.session.role === "DEPARTMENT_HEAD";
        const filter = {};

        if (!isAdmin) {
            const office = await getAssignedOfficeForSession(req.session.id);

            if (!office) {
                return res.status(404).json({
                    success: false,
                    error: "Your account has no assigned office.",
                });
            }

            filter.office = office;
            // IMPORTANT: do not filter by submittedBy here. Q1/Q2 may have
            // been backfilled by PPDO/Admin, but the assigned office must
            // still see those records. Ownership is office-based;
            // submittedBy remains audit/history information only.
            // The existing edit/quarter rules still control what an Encoder
            // is allowed to change.

        } else {
            if (req.query.office && DEPARTMENTS.includes(req.query.office)) {
                filter.office = req.query.office;
            }
        }

        if (FORM_TYPES.includes(req.query.formType)) {
            filter.formType = req.query.formType;
        }

        if (
            req.query.actionQueue === "true" &&
            isHead
        ) {
            filter.status = { $in: ["SUBMITTED", "RESUBMITTED", "PENDING", "UNDER_REVIEW"] };
        } else if (
            req.query.status &&
            [
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
            ].includes(req.query.status)
        ) {
            filter.status = req.query.status;
        }

        if (QUARTERS.includes(req.query.quarter)) {
            filter.quarter = req.query.quarter;
        }

        if (req.query.year) {
            const year = Number(req.query.year);
            if (Number.isInteger(year)) filter.year = year;
        }

        if (cleanText(req.query.reportGroupId)) {
            filter.reportGroupId = cleanText(req.query.reportGroupId);
        }

        const search = cleanText(req.query.search || req.query.q);
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = new RegExp(escaped, "i");
            filter.$or = [
                { office: pattern },
                { majorPpaCode: pattern },
                { majorFinalOutput: pattern },
                { reportTitle: pattern },
                { preparedBy: pattern },
                { periodLabel: pattern },
                { status: pattern },
            ];
        }

        // IMPORTANT: signatures contain binary image data. Never fetch that data
        // for a table/list request. The previous implementation loaded every
        // signature into Node memory and only removed it afterwards, which made
        // the Admin page extremely slow (and could present as a white screen).
        const reports = await PhysicalReport.find(filter)
            .select("-signatures.officeHead.data -signatures.localPlanningCoordinator.data")
            .populate("createdBy", "firstName lastName email")
            .sort({ year: -1, quarter: 1, createdAt: -1 })
            .lean();

        const data = reports.map((report) => serialize(report));

        return res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        console.error("LIST PHYSICAL REPORTS:", error);

        // Keep the client-facing reason useful during development without exposing
        // database internals in production.
        const details =
            process.env.NODE_ENV === "development"
                ? String(error?.message || error)
                : undefined;

        return res.status(500).json({
            success: false,
            error: "Failed to load Physical Reports.",
            details,
        });
    }
};

export const getLbac3Source = async (req, res) => {
    try {
        const year = Number(req.query.year);
        let office = cleanText(req.query.office);

        if (!Number.isInteger(year)) {
            return res.status(400).json({ success: false, error: "Valid year is required." });
        }

        if (req.session.role !== "ADMIN") office = await getAssignedOfficeForSession(req.session.id);
        if (!office) return res.status(400).json({ success: false, error: "Office is required." });

        const quarter = cleanText(req.query.quarter);
        if (!QUARTERS.includes(quarter)) {
            return res.status(400).json({ success: false, error: "Quarter is required for LBAC Form 3 source data." });
        }

        const reportGroupId = cleanText(req.query.reportGroupId);
        const annual = await findLbac3AnnualSource(office, year, quarter, reportGroupId);
        const template = annual || await findLbac3Template(office, year, reportGroupId);

        if (!template) {
            return res.status(404).json({ success: false, error: `No LBAC Form 3 structure was found for ${office}, ${year}. Encode the first LBAC 3 report first.` });
        }

        const rows = annual?.rows || structureOnlyRows(template.rows || []);
        const quarterTotals = calculateLbac3QuarterTotals(rows);
        const activeReport = annual?.activeReport || null;

        res.json({
            success: true,
            data: {
                id: activeReport?._id?.toString() || null,
                office: template.office,
                sector: template.sector,
                year: template.year,
                quarter,
                reportGroupId: annual?.reportGroupId || reportGroupId || "",
                reportTitle: annual?.reportTitle || template.reportTitle || "",
                majorPpaCode: template.majorPpaCode || rows.find((row) => String(row?.rowType || "ITEM").toUpperCase() !== "SERVICE")?.ppaCode || "",
                majorFinalOutput: template.majorFinalOutput || rows.find((row) => String(row?.rowType || "ITEM").toUpperCase() !== "SERVICE")?.majorFinalOutput || "",
                mode: annual ? "ANNUAL_MERGED" : "TEMPLATE",
                rows,
                quarterTotals,
                sourceReportId: activeReport?._id?.toString() || annual?.sourceReportId || template?._id?.toString() || null,
                activeReportId: activeReport?._id?.toString() || null,
                frozen: Boolean(activeReport && freezeStatus(activeReport.status)),
                status: activeReport?.status || null,
            },
        });
    } catch (error) {
        console.error("GET LBAC3 SOURCE:", error);
        res.status(500).json({ success: false, error: "Failed to load LBAC Form 3 source data." });
    }
};

export const getPhysicalReport = async (req, res) => {
    try {
        const report = await PhysicalReport.findById(req.params.id)
            .select(
                "-signatures.officeHead.data -signatures.localPlanningCoordinator.data"
            )
            .populate("submittedBy", "email firstName lastName")
            .populate("createdBy", "email firstName lastName")
            .populate("reviewedBy", "email firstName lastName")
            .populate("validatedBy", "email firstName lastName")
            .lean();

        if (!report) {
            return res.status(404).json({
                success: false,
                error: "Physical report not found.",
            });
        }

        const office =
            req.session.role === "ADMIN"
                ? ""
                : await getAssignedOfficeForSession(req.session.id);

        if (!canAccess(req, report, office)) {
            return res.status(403).json({
                success: false,
                error: "You cannot access this physical report.",
            });
        }

        res.json({
            success: true,
            data: serialize(report),
        });
    } catch (error) {
        console.error("GET PHYSICAL REPORT:", error);
        res.status(500).json({
            success: false,
            error: "Failed to load physical report.",
        });
    }
};

export const downloadPhysicalSignature = async (req, res) => {
    try {
        const key =
            req.params.signer === "office-head"
                ? "officeHead"
                : req.params.signer === "coordinator"
                ? "localPlanningCoordinator"
                : null;

        if (!key) {
            return res.status(400).json({
                success: false,
                error: "Invalid signature.",
            });
        }

        const report = await PhysicalReport.findById(req.params.id)
            .select(`office submittedBy status signatures.${key}`)
            .lean();

        if (!report) {
            return res.status(404).json({
                success: false,
                error: "Physical report not found.",
            });
        }

        const office =
            req.session.role === "ADMIN"
                ? ""
                : await getAssignedOfficeForSession(req.session.id);

        if (!canAccess(req, report, office)) {
            return res.status(403).json({
                success: false,
                error: "Access denied.",
            });
        }

        const signature = report.signatures?.[key];

        if (!signature?.data) {
            return res.status(404).json({
                success: false,
                error: "No e-signature uploaded.",
            });
        }

        res.setHeader(
            "Content-Type",
            signature.mimeType || "image/png"
        );
        res.setHeader("Cache-Control", "private, max-age=300");
        res.send(signature.data);
    } catch (error) {
        console.error("DOWNLOAD SIGNATURE:", error);
        res.status(500).json({
            success: false,
            error: "Failed to load e-signature.",
        });
    }
};

const dedupeLbac5EvaluationRows = (rows = []) => {
    const output = [];
    const indexByKey = new Map();

    for (const raw of Array.isArray(rows) ? rows : []) {
        const type = String(raw?.rowType || "ITEM").toUpperCase();
        if (type !== "ITEM") {
            output.push(raw);
            continue;
        }

        const key = cleanText(raw?.sourceLbac3RowKey) || cleanText(raw?.sourceLbac3RowId) || physicalItemKey(raw);
        if (!key) {
            output.push(raw);
            continue;
        }

        const existingIndex = indexByKey.get(key);
        if (existingIndex === undefined) {
            indexByKey.set(key, output.length);
            output.push(raw);
            continue;
        }

        // Keep one row. If an accidental duplicate contains financial values that
        // the first copy does not, merge those values instead of losing the input.
        const current = output[existingIndex];
        output[existingIndex] = {
            ...current,
            sourceLbac3RowId: current.sourceLbac3RowId || raw.sourceLbac3RowId || null,
            sourceLbac3RowKey: current.sourceLbac3RowKey || raw.sourceLbac3RowKey || "",
            ppaCode: current.ppaCode || raw.ppaCode || "",
            majorFinalOutput: current.majorFinalOutput || raw.majorFinalOutput || "",
            cost: Number(current.cost || 0) || Number(raw.cost || 0) || 0,
            weight: Number(current.weight || 0) || Number(raw.weight || 0) || 0,
            coaPct: Number(current.coaPct || 0) || Number(raw.coaPct || 0) || 0,
            allotmentReleased: Number(current.allotmentReleased || 0) || Number(raw.allotmentReleased || 0) || 0,
            obligationsIncurred: Number(current.obligationsIncurred || 0) || Number(raw.obligationsIncurred || 0) || 0,
            remarks: current.remarks || raw.remarks || "",
        };
    }

    return output;
};

const syncLinkedLbac5FromLbac3 = async (lbac3Report) => {
    if (!lbac3Report?._id) return;

    const annualSource = await findLbac3AnnualSource(lbac3Report.office, lbac3Report.year, lbac3Report.quarter, lbac3Report.reportGroupId);
    const physicalSource = annualSource || lbac3Report;

    // Only synchronize the LBAC 5 records belonging to this exact report
    // group. The previous quarter-only fallback could update an unrelated
    // report when one office has multiple independent reports in the same
    // quarter.
    const linkedReports = await PhysicalReport.find({
        formType: "LBAC5",
        office: lbac3Report.office,
        year: lbac3Report.year,
        reportGroupId: lbac3Report.reportGroupId,
        $or: [
            { linkedLbac3Report: lbac3Report._id },
            { quarter: lbac3Report.quarter },
        ],
    });

    for (const lbac5 of linkedReports) {
        const physicalRows = prepareLbac5FromLbac3(physicalSource, lbac5.quarter, lbac5.evaluationRows || []);
        const linkedTotals = getLinkedQuarterTotals(physicalSource, lbac5.quarter);

        const mergedRows = (lbac5.evaluationRows || []).map((oldRow) => {
            if (String(oldRow?.rowType || "ITEM").toUpperCase() !== "ITEM") return oldRow;
            const replacement = physicalRows.find((row) =>
                String(row?.rowType || "ITEM").toUpperCase() === "ITEM" &&
                ((oldRow.sourceLbac3RowKey && row.sourceLbac3RowKey && String(oldRow.sourceLbac3RowKey) === String(row.sourceLbac3RowKey)) ||
                 (oldRow.sourceLbac3RowId && row.sourceLbac3RowId && String(oldRow.sourceLbac3RowId) === String(row.sourceLbac3RowId)) ||
                 (physicalItemKey(oldRow) && physicalItemKey(oldRow) === physicalItemKey(row)))
            );
            if (!replacement) return oldRow;
            const preserved = oldRow.toObject ? oldRow.toObject() : { ...oldRow };
            const recalculated = calculateEvaluationRow({
                ...preserved,
                ppaCode: replacement.ppaCode,
                majorFinalOutput: replacement.majorFinalOutput,
                targetOutput: replacement.targetOutput,
                actualOutput: replacement.actualOutput,
            });
            return {
                ...preserved,
                sourceLbac3RowId: replacement.sourceLbac3RowId || oldRow.sourceLbac3RowId || null,
                sourceLbac3RowKey: replacement.sourceLbac3RowKey || oldRow.sourceLbac3RowKey || "",
                ppaCode: replacement.ppaCode,
                majorFinalOutput: replacement.majorFinalOutput,
                targetOutput: replacement.targetOutput,
                actualOutput: replacement.actualOutput,
                variance: recalculated.variance,
                accomplishmentPct: recalculated.accomplishmentPct,
                physicalPoints: recalculated.physicalPoints,
                physicalWeightedScore: recalculated.physicalWeightedScore,
                coaPct: recalculated.coaPct,
                financialVariance: recalculated.financialVariance,
                absorptiveCapacityPct: recalculated.absorptiveCapacityPct,
                financialPoints: recalculated.financialPoints,
                financialWeightedScore: recalculated.financialWeightedScore,
            };
        });

        const existingKeys = new Set(mergedRows.filter((r) => r?.rowType === "ITEM").map((r) => String(r.sourceLbac3RowKey || r.sourceLbac3RowId || physicalItemKey(r) || "")));
        for (const replacement of physicalRows) {
            if (replacement.rowType !== "ITEM") continue;
            const key = String(replacement.sourceLbac3RowKey || replacement.sourceLbac3RowId || physicalItemKey(replacement) || "");
            if (!existingKeys.has(key)) mergedRows.push(replacement);
        }

        const dedupedRows = dedupeLbac5EvaluationRows(mergedRows);

        await PhysicalReport.updateOne(
            { _id: lbac5._id },
            { $set: {
                majorPpaCode: physicalSource.majorPpaCode || "",
                majorFinalOutput: physicalSource.majorFinalOutput || "",
                evaluationRows: dedupedRows,
                linkedLbac3Totals: linkedTotals,
                lbac5Totals: calculateLbac5Totals(dedupedRows),
                linkedLbac3Report: lbac3Report._id,
            }}
        );
    }
};

export const createPhysicalReport = async (req, res) => {
    req.body = bodyOf(req);
    try {
        const isAdmin = req.session.role === "ADMIN";
        const isEncoder = ENCODER_ROLES.has(req.session.role);

        if (!isAdmin && !isEncoder) {
            return res.status(403).json({
                success: false,
                error: "You do not have permission to create a Physical Report.",
            });
        }

        const encoderOffice = isEncoder
            ? await getAssignedOfficeForSession(req.session.id)
            : "";

        if (isEncoder && !encoderOffice) {
            return res.status(400).json({
                success: false,
                error: "Your account has no assigned office.",
            });
        }

        const formType = FORM_TYPES.includes(cleanText(req.body.formType))
            ? cleanText(req.body.formType)
            : "LBAC3";

        // Admin may create a report for any valid PPDO office. Encoders are
        // always restricted to their assigned office.
        const office = isAdmin
            ? cleanText(req.body.office)
            : encoderOffice;
        const sector = sectorForOffice(office);
        const year = Number(req.body.year);
        const quarter = cleanText(req.body.quarter);
        // Generate the report identity before loading/merging data so every
        // operation is scoped to this specific report, not merely the office.
        let reportGroupId = cleanText(req.body.reportGroupId);
        const reportTitle = cleanText(req.body.reportTitle);

        // A title is the human-readable identity of a report. If the encoder
        // starts another quarter using the same office/year/title, reuse the
        // existing report group so Q1-Q4 remain one annual report. A genuinely
        // new title receives a new group, allowing multiple reports per office.
        if (!reportGroupId && reportTitle) {
            const titledReport = await PhysicalReport.findOne({
                office,
                year,
                formType,
                reportTitle,
            }).sort({ updatedAt: -1, createdAt: -1 }).select("reportGroupId").lean();
            reportGroupId = titledReport?.reportGroupId || "";
        }
        reportGroupId ||= randomUUID();

        if (!DEPARTMENTS.includes(office)) {
            return res.status(400).json({
                success: false,
                error: "Your assigned office is invalid.",
            });
        }

        if (!SECTORS.includes(sector)) {
            return res.status(400).json({
                success: false,
                error: "Your office is not assigned to a valid sector.",
            });
        }

        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({
                success: false,
                error: "Please enter a valid reporting year.",
            });
        }

        if (!QUARTERS.includes(quarter)) {
            return res.status(400).json({
                success: false,
                error: "Please select a valid quarter for LBAC Form 5.",
            });
        }

        if (formType === "LBAC3" && !reportTitle) {
            return res.status(400).json({ success: false, error: "Report Title is required." });
        }

        const quarterWindowError = await assertEncoderQuarterWriteWindow(req, year, quarter);
        if (quarterWindowError) {
            return res.status(quarterWindowError.status).json(quarterWindowError.body);
        }

        let source = null;
        let linkedTotals = null;
        let evaluationRows = [];
        let rows = [];
        let lbac3QuarterTotals = {
            Q1: { target: 0, actual: 0, variance: 0 },
            Q2: { target: 0, actual: 0, variance: 0 },
            Q3: { target: 0, actual: 0, variance: 0 },
            Q4: { target: 0, actual: 0, variance: 0 },
        };
        let annualReports = [];

        if (formType === "LBAC3") {
            const parsed = parseLbac3Rows(req.body.rows, req.body.majorFinalOutput, req.body.majorPpaCode);

            if (parsed.error) {
                return res.status(400).json({ success: false, error: parsed.error });
            }

            annualReports = await PhysicalReport.find({
                office,
                year,
                formType: "LBAC3",
                reportGroupId,
            }).sort({ quarter: 1, updatedAt: 1, createdAt: 1 }).lean();

            rows = mergeLbac3ForSave({
                annualReports,
                incomingRows: parsed.value,
                quarter,
                isAdmin,
                deletedRowKeys: req.body.deletedRowKeys || [],
            });
            lbac3QuarterTotals = calculateLbac3QuarterTotals(rows);
            source = annualReports.length ? mergeAnnualLbac3Reports(annualReports) : null;
        } else {
            source = await findLbac3AnnualSource(office, year, quarter, reportGroupId);

            // LBAC 5 is never a standalone form. Its PPA rows come from the
            // saved LBAC 3 structure for the same office and year.
            if (!source || !Array.isArray(source.rows) || !source.rows.some(
                (row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM"
            )) {
                return res.status(400).json({
                    success: false,
                    code: "LBAC3_SOURCE_REQUIRED",
                    error: "LBAC Form 5 requires a saved LBAC Form 3 first. Encode and save LBAC Form 3 before opening the evaluation sheet.",
                });
            }

            lbac3QuarterTotals = source
                ? (source.lbac3QuarterTotals &&
                    Object.values(source.lbac3QuarterTotals).some(
                        (item) => Number(item.target || 0) > 0 || Number(item.actual || 0) > 0
                    )
                        ? source.lbac3QuarterTotals
                        : calculateLbac3QuarterTotals(source.rows || []))
                : calculateLbac3QuarterTotals([]);

            linkedTotals = source ? getLinkedQuarterTotals(source, quarter) : null;

            const generatedRows = source
                ? prepareLbac5FromLbac3(source, quarter, req.body.evaluationRows || req.body.rows)
                : (req.body.evaluationRows || req.body.rows);
            const parsed = parseLbac5Rows(
                generatedRows,
                linkedTotals,
                source.rows || [],
                quarter,
                !isAdmin
            );

            if (parsed.error) {
                return res.status(400).json({
                    success: false,
                    error: parsed.error,
                });
            }

            evaluationRows = parsed.value;
        }

        const encoderName = await getEncoderName(req.session.id);
        const priorQuarterSource = formType === "LBAC3"
            ? await findPriorQuarterForReportGroup(office, year, quarter, reportGroupId)
            : null;
        const values = {
            formType,
            office,
            sector,
            year,
            quarter,
            reportGroupId: reportGroupId || source?.reportGroupId || randomUUID(),
            reportTitle: reportTitle || cleanText(source?.reportTitle),
            periodEndDate: req.body.periodEndDate
                ? new Date(req.body.periodEndDate)
                : null,
            periodLabel: cleanText(req.body.periodLabel),
            // LBAC 5 inherits the paper-level identity from LBAC 3.
            majorPpaCode: formType === "LBAC5"
                ? cleanText(source?.majorPpaCode || req.body.majorPpaCode)
                : cleanText(req.body.majorPpaCode || rows.find((row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM")?.ppaCode),
            majorFinalOutput: formType === "LBAC5"
                ? cleanText(source?.majorFinalOutput || req.body.majorFinalOutput)
                : cleanText(req.body.majorFinalOutput || rows.find((row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM")?.ppaName || rows.find((row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM")?.majorFinalOutput),
            varianceAsOf: req.body.varianceAsOf
                ? new Date(req.body.varianceAsOf)
                : null,
            rows,
            deletedLbac3RowKeys: formType === "LBAC3" ? (mergeAnnualLbac3Reports(annualReports || [])?.deletedLbac3RowKeys || []).concat(req.body.deletedRowKeys || []).filter((value, index, array) => array.indexOf(value) === index) : [],
            evaluationRows,
            lbac3QuarterTotals,
            lbac5Totals: calculateLbac5Totals(evaluationRows),
            linkedLbac3Report: formType === "LBAC5" ? source?._id || null : null,
            structureSourceReport: formType === "LBAC3" ? source?._id || null : null,
            linkedLbac3Totals: linkedTotals || {
                quarter: "",
                target: 0,
                actual: 0,
                variance: 0,
            },
            preparedBy: cleanText(req.body.preparedBy) || encoderName,
            preparedDate: req.body.preparedDate ? new Date(req.body.preparedDate) : new Date(),
            editedBy: req.session.id,
            editedByName: encoderName,
            editedAt: new Date(),
            carriedForwardFromReport: priorQuarterSource?._id || null,
            carriedForwardFromQuarter: priorQuarterSource?.quarter || "",
            carriedForwardAt: priorQuarterSource ? new Date() : null,
            carriedForwardBy: priorQuarterSource ? req.session.id : null,
            carriedForwardByName: priorQuarterSource ? encoderName : "",
            officeHead: "",
            officeHeadDate: null,
            localPlanningCoordinator: "",
            localPlanningCoordinatorDate: null,
            submittedBy: req.session.id,
            createdBy: req.session.id,
            status: cleanText(req.body.submissionAction).toUpperCase() === "DRAFT" ? "DRAFT" : "SUBMITTED",
            submissionHistory: [{
                status: cleanText(req.body.submissionAction).toUpperCase() === "DRAFT" ? "DRAFT" : "SUBMITTED",
                by: req.session.id,
                at: new Date(),
            }],
        };

        // LBAC 3 is the physical source record. It is deliberately saved as DRAFT
        // first; the actual submission/approval workflow happens on LBAC 5.
        if (formType === "LBAC3") {
            values.status = "DRAFT";
            values.submissionHistory = [{
                status: "DRAFT",
                by: req.session.id,
                at: new Date(),
                remarks: "LBAC Form 3 physical source saved; complete LBAC Form 5 to submit for review.",
            }];
        }

        const duplicate = await PhysicalReport.findOne(
            duplicateFilter(values)
        );

        if (duplicate) {
            // Admin/PPDO maintenance is intentionally idempotent: re-opening a
            // report for the same office/year/form/quarter updates that existing
            // record rather than dropping the user's encoded values with a 409.
            if (isAdmin) {
                // Idempotent admin saves must retain the record's original
                // officer owner; otherwise an admin refresh steals ownership.
                values.createdBy = duplicate.createdBy || duplicate.submittedBy || req.session.id;
                const updated = await PhysicalReport.findByIdAndUpdate(
                    duplicate._id,
                    values,
                    { returnDocument: "after", runValidators: true }
                );

                if (formType === "LBAC3") await syncLinkedLbac5FromLbac3(updated);
                else await syncQuarterPairStatus(updated, updated.status, req.session.id);

                await writeAudit(req, {
                    action: "PHYSICAL_REPORT_UPDATED",
                    entityType: "PhysicalReport",
                    entityId: updated._id.toString(),
                    office: updated.office,
                    formType: updated.formType,
                    year: updated.year,
                    quarter: updated.quarter,
                    details: { reportTitle: updated.reportTitle, reportGroupId: updated.reportGroupId, previousStatus: duplicate.status, newStatus: updated.status, editedBy: updated.editedByName, carriedForwardFromQuarter: updated.carriedForwardFromQuarter || "" },
                });

                return res.status(200).json({
                    success: true,
                    message: `${formType} updated for ${office}, ${quarter} ${year}.`,
                    data: serialize(updated),
                    existingId: updated._id,
                });
            }

            return res.status(409).json({
                success: false,
                existingId: duplicate._id,
                error:
                    `A ${formType} report already exists for ${office}, ${quarter} ${year} under this report title/group. Open the existing report if you meant to edit it.`,
            });
        }

        const report = await PhysicalReport.create(values);

        if (formType === "LBAC3") await syncLinkedLbac5FromLbac3(report);
        else await syncQuarterPairStatus(report, report.status, req.session.id);

        await writeAudit(req, {
            action: "PHYSICAL_REPORT_CREATED",
            entityType: "PhysicalReport",
            entityId: report._id.toString(),
            office: report.office,
            formType: report.formType,
            year: report.year,
            quarter: report.quarter,
            details: { reportTitle: report.reportTitle, reportGroupId: report.reportGroupId, status: report.status, carriedForwardFromQuarter: report.carriedForwardFromQuarter || "", carriedForwardFromReport: report.carriedForwardFromReport?.toString?.() || null },
        });

        if (report.carriedForwardFromReport) {
            await writeAudit(req, {
                action: "PHYSICAL_REPORT_CARRIED_FORWARD",
                entityType: "PhysicalReport",
                entityId: report._id.toString(),
                office: report.office,
                formType: report.formType,
                year: report.year,
                quarter: report.quarter,
                details: {
                    reportTitle: report.reportTitle,
                    reportGroupId: report.reportGroupId,
                    fromQuarter: report.carriedForwardFromQuarter,
                    fromReportId: report.carriedForwardFromReport?.toString?.() || null,
                    carriedForwardBy: report.carriedForwardByName || "",
                },
            });
        }

        res.status(201).json({
            success: true,
            message:
                formType === "LBAC5"
                    ? `LBAC Form 5 saved and submitted using the ${quarter} LBAC Form 3 physical data.`
                    : "LBAC Form 3 physical data saved. Continue to LBAC Form 5 for submission.",
            data: serialize(report),
            nextFormType: formType === "LBAC3" ? "LBAC5" : null,
        });
    } catch (error) {
        console.error("CREATE PHYSICAL REPORT:", error);

        if (error?.code === 11000) {
            // A second tab or a delayed first request can pass the pre-create
            // duplicate check at the same time. Return the winning record so
            // the client can open it instead of leaving the user on a broken
            // "New LBAC5" screen.
            const existing = await PhysicalReport.findOne({
                office: cleanText(req.body?.office),
                year: Number(req.body?.year),
                formType: FORM_TYPES.includes(cleanText(req.body?.formType)) ? cleanText(req.body.formType) : "LBAC3",
                quarter: cleanText(req.body?.quarter),
                reportGroupId: cleanText(req.body?.reportGroupId),
            }).select("_id").lean();
            return res.status(409).json({
                success: false,
                existingId: existing?._id?.toString() || null,
                error:
                    "This report already exists for the selected office, form, year, quarter, and report group.",
            });
        }

        res.status(500).json({
            success: false,
            error: "Failed to save physical report.",
            details: error.message,
        });
    }
};

export const updatePhysicalReport = async (req, res) => {
    req.body = bodyOf(req);
    try {
        const isAdmin = req.session.role === "ADMIN";
        const isEncoder = ENCODER_ROLES.has(req.session.role);

        if (!isAdmin && !isEncoder) {
            return res.status(403).json({
                success: false,
                error: "You do not have permission to edit Physical Reports.",
            });
        }

        const existing = await PhysicalReport.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: "Physical report not found.",
            });
        }

        // Existing reports must carry the version the editor last loaded.
        // The final database update below also compares updatedAt atomically,
        // preventing two users from overwriting each other's newer changes.
        const expectedUpdatedAt = parseExpectedUpdatedAt(req.body.expectedUpdatedAt);
        if (!expectedUpdatedAt.provided) {
            return res.status(400).json({
                success: false,
                code: "REPORT_VERSION_REQUIRED",
                error:
                    "The report version is required when updating an existing report. Reload the report and try again.",
            });
        }

        if (expectedUpdatedAt.error) {
            return res.status(400).json({
                success: false,
                code: "INVALID_REPORT_VERSION",
                error: expectedUpdatedAt.error,
            });
        }

        if (!sameTimestamp(existing.updatedAt, expectedUpdatedAt.date)) {
            return staleUpdateResponse(res);
        }

        if (isEncoder) {
            const office = await getAssignedOfficeForSession(req.session.id);
            if (!office) {
                return res.status(404).json({
                    success: false,
                    error: "Your account has no assigned office.",
                });
            }
            if (existing.office !== office) {
                return res.status(403).json({
                    success: false,
                    error: "You can only update reports belonging to your assigned office.",
                });
            }
        }

        // Snapshot identity is immutable after creation. The user edits the
        // contents of the existing office/year/form/quarter record only.
        const formType = existing.formType;
        const office = existing.office;
        const sector = sectorForOffice(office);
        const year = existing.year;
        const quarter = existing.quarter;

        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({
                success: false,
                error: "Please enter a valid reporting year.",
            });
        }

        let source = null;
        let linkedTotals = existing.linkedLbac3Totals || null;
        let rows = [];
        let evaluationRows = [];
        let lbac3QuarterTotals = existing.lbac3QuarterTotals || {};

        if (!QUARTERS.includes(quarter)) {
            return res.status(400).json({ success: false, error: "A quarter is required." });
        }

        // Historical/terminal snapshots are immutable for office encoders.
        // Returned/denied reports are the explicit correction exception so the
        // encoder can repair and resubmit them without reopening the calendar
        // quarter. Admins retain full maintenance access.
        if (isEncoder && encoderQuarterIsFrozen(existing)) {
            return res.status(409).json({
                success: false,
                code: "QUARTER_SNAPSHOT_FROZEN",
                error: `The ${quarter} ${year} Physical Report is already frozen and cannot be changed by an encoder.`,
                quarter,
                year: Number(year),
                status: existing.status,
            });
        }

        const quarterWindowError = await assertEncoderQuarterWriteWindow(req, year, quarter);
        if (quarterWindowError && !(isEncoder && ["RETURNED", "DENIED"].includes(String(existing.status || "").toUpperCase()))) {
            return res.status(quarterWindowError.status).json(quarterWindowError.body);
        }

        if (formType === "LBAC3") {
            const parsed = parseLbac3Rows(req.body.rows, req.body.majorFinalOutput, req.body.majorPpaCode);

            if (parsed.error) {
                return res.status(400).json({ success: false, error: parsed.error });
            }

            // Spreadsheet rule: a quarterly save updates the annual table. Load
            // every existing quarter first, then merge the current input into that
            // annual state. This prevents Q2/Q3/Q4 saves from replacing Q1 data.
            const annualReports = await PhysicalReport.find({
                office,
                year,
                formType: "LBAC3",
                reportGroupId: existing.reportGroupId,
            }).sort({ quarter: 1, updatedAt: 1, createdAt: 1 }).lean();

            rows = mergeLbac3ForSave({
                annualReports,
                incomingRows: parsed.value,
                quarter,
                isAdmin,
                deletedRowKeys: req.body.deletedRowKeys || [],
            });

            lbac3QuarterTotals = calculateLbac3QuarterTotals(rows);
        } else {
            if (!QUARTERS.includes(quarter)) {
                return res.status(400).json({
                    success: false,
                    error: "Please select a valid quarter for LBAC Form 5.",
                });
            }

            source = await findLbac3AnnualSource(office, year, quarter, existing.reportGroupId);

            // LBAC 5 is never a standalone form. Its PPA rows come from the
            // saved LBAC 3 structure for the same office and year.
            if (!source || !Array.isArray(source.rows) || !source.rows.some(
                (row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM"
            )) {
                return res.status(400).json({
                    success: false,
                    code: "LBAC3_SOURCE_REQUIRED",
                    error: "LBAC Form 5 requires a saved LBAC Form 3 first. Encode and save LBAC Form 3 before opening the evaluation sheet.",
                });
            }

            lbac3QuarterTotals = source
                ? (source.lbac3QuarterTotals &&
                    Object.values(source.lbac3QuarterTotals).some(
                        (item) => Number(item.target || 0) > 0 || Number(item.actual || 0) > 0
                    )
                        ? source.lbac3QuarterTotals
                        : calculateLbac3QuarterTotals(source.rows || []))
                : calculateLbac3QuarterTotals([]);

            linkedTotals = source ? getLinkedQuarterTotals(source, quarter) : null;

            const generatedRows = source
                ? prepareLbac5FromLbac3(source, quarter, req.body.evaluationRows || req.body.rows)
                : (req.body.evaluationRows || req.body.rows);
            const parsed = parseLbac5Rows(
                generatedRows,
                linkedTotals,
                source.rows || [],
                quarter,
                !isAdmin
            );

            if (parsed.error) {
                return res.status(400).json({
                    success: false,
                    error: parsed.error,
                });
            }

            evaluationRows = parsed.value;
        }

        const encoderName = await getEncoderName(req.session.id);
        let annualDeletedLbac3RowKeys = Array.isArray(existing.deletedLbac3RowKeys) ? existing.deletedLbac3RowKeys : [];
        if (formType === "LBAC3") {
            const annualDeletionReports = await PhysicalReport.find({ office, year, formType: "LBAC3", reportGroupId: existing.reportGroupId }).select("deletedLbac3RowKeys").lean();
            annualDeletedLbac3RowKeys = [...new Set([
                ...annualDeletionReports.flatMap((item) => Array.isArray(item.deletedLbac3RowKeys) ? item.deletedLbac3RowKeys : []),
                ...(Array.isArray(req.body.deletedRowKeys) ? req.body.deletedRowKeys : []),
            ].map(cleanText).filter(Boolean))];
        }


        const values = {
            formType,
            office,
            sector,
            year,
            quarter,
            reportGroupId: existing.reportGroupId || cleanText(req.body.reportGroupId) || source?.reportGroupId || randomUUID(),
            reportTitle: cleanText(req.body.reportTitle) || existing.reportTitle || cleanText(source?.reportTitle),
            periodEndDate: req.body.periodEndDate
                ? new Date(req.body.periodEndDate)
                : null,
            periodLabel: cleanText(req.body.periodLabel),
            majorPpaCode: formType === "LBAC5"
                ? cleanText(source?.majorPpaCode || existing.majorPpaCode || req.body.majorPpaCode)
                : cleanText(req.body.majorPpaCode || existing.majorPpaCode || rows.find((row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM")?.ppaCode),
            majorFinalOutput: formType === "LBAC5"
                ? cleanText(source?.majorFinalOutput || existing.majorFinalOutput || req.body.majorFinalOutput)
                : cleanText(req.body.majorFinalOutput || existing.majorFinalOutput || rows.find((row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM")?.ppaName || rows.find((row) => String(row?.rowType || "ITEM").toUpperCase() === "ITEM")?.majorFinalOutput),
            varianceAsOf: req.body.varianceAsOf
                ? new Date(req.body.varianceAsOf)
                : existing.varianceAsOf || null,
            rows,
            deletedLbac3RowKeys: formType === "LBAC3" ? annualDeletedLbac3RowKeys : (existing.deletedLbac3RowKeys || []),
            evaluationRows,
            lbac3QuarterTotals,
            lbac5Totals: calculateLbac5Totals(evaluationRows),
            linkedLbac3Report: formType === "LBAC5" ? source?._id || existing.linkedLbac3Report || null : null,
            structureSourceReport: formType === "LBAC3" ? existing.structureSourceReport || existing._id : existing.structureSourceReport,
            linkedLbac3Totals: linkedTotals || {
                quarter: "",
                target: 0,
                actual: 0,
                variance: 0,
            },
            preparedBy: isAdmin ? (cleanText(req.body.preparedBy) || encoderName) : existing.preparedBy,
            preparedDate: existing.preparedDate || new Date(),
            editedBy: req.session.id,
            editedByName: encoderName,
            editedAt: new Date(),
            carriedForwardFromReport: existing.carriedForwardFromReport || null,
            carriedForwardFromQuarter: existing.carriedForwardFromQuarter || "",
            carriedForwardAt: existing.carriedForwardAt || null,
            carriedForwardBy: existing.carriedForwardBy || null,
            carriedForwardByName: existing.carriedForwardByName || "",
            submittedBy: existing.submittedBy,
            createdBy: existing.createdBy || existing.submittedBy,
            status: formType === "LBAC3"
                ? "DRAFT"
                : (cleanText(req.body.submissionAction).toUpperCase() === "DRAFT"
                    ? "DRAFT"
                    : isAdmin
                        ? (["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(existing.status)
                            ? "SUBMITTED"
                            : (existing.status === "RETURNED" || existing.status === "DENIED" ? "RESUBMITTED" : "SUBMITTED"))
                        : (existing.status === "RETURNED" || existing.status === "DENIED" ? "RESUBMITTED" : "SUBMITTED")),
            officeHead:
                existing.status === "DENIED" ||
                (isAdmin && ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(existing.status))
                    ? ""
                    : existing.officeHead,
            officeHeadDate:
                existing.status === "DENIED" ||
                (isAdmin && ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(existing.status))
                    ? null
                    : existing.officeHeadDate,
            localPlanningCoordinator:
                existing.status === "DENIED" ||
                (isAdmin && ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(existing.status))
                    ? ""
                    : existing.localPlanningCoordinator,
            localPlanningCoordinatorDate:
                existing.status === "DENIED" ||
                (isAdmin && ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(existing.status))
                    ? null
                    : existing.localPlanningCoordinatorDate,
            signatures:
                existing.status === "DENIED" ||
                (isAdmin && ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(existing.status))
                    ? {
                          officeHead: null,
                          localPlanningCoordinator: null,
                      }
                    : existing.signatures,
            adminRemarks:
                existing.status === "DENIED" ||
                (isAdmin && ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(existing.status))
                    ? ""
                    : existing.adminRemarks,
            reviewedBy: null,
            reviewedAt: null,
            validatedBy: null,
            validatedAt: null,
            returnedAt: null,
            returnReason: "",
            frozenAt: null,
            frozenBy: null,
            submissionHistory: [
                ...(existing.submissionHistory || []),
                {
                    status: formType === "LBAC3"
                        ? "DRAFT"
                        : (cleanText(req.body.submissionAction).toUpperCase() === "DRAFT"
                            ? "DRAFT"
                            : isAdmin
                                ? (["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(existing.status)
                                    ? "SUBMITTED"
                                    : (existing.status === "RETURNED" || existing.status === "DENIED" ? "RESUBMITTED" : "SUBMITTED"))
                                : (existing.status === "RETURNED" || existing.status === "DENIED" ? "RESUBMITTED" : "SUBMITTED")),
                    by: req.session.id,
                    at: new Date(),
                },
            ],
        };

        const duplicate = await PhysicalReport.findOne(
            duplicateFilter(values, existing._id)
        )
            .select("_id")
            .lean();

        if (duplicate) {
            return res.status(409).json({
                success: false,
                error:
                    "Another report already exists for this office, form, year, and quarter.",
            });
        }

        // Compare-and-swap: the update succeeds only when the database
        // still has the exact version that the editor loaded.
        const report = await PhysicalReport.findOneAndUpdate(
            {
                _id: req.params.id,
                updatedAt: expectedUpdatedAt.date,
            },
            values,
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!report) {
            return staleUpdateResponse(res);
        }

        if (formType === "LBAC3") await syncLinkedLbac5FromLbac3(report);
        else await syncQuarterPairStatus(report, report.status, req.session.id);

        await writeAudit(req, {
            action: "PHYSICAL_REPORT_UPDATED",
            entityType: "PhysicalReport",
            entityId: report._id.toString(),
            office: report.office,
            formType: report.formType,
            year: report.year,
            quarter: report.quarter,
            details: { reportTitle: report.reportTitle, reportGroupId: report.reportGroupId, previousStatus: existing.status, newStatus: report.status, editedBy: report.editedByName },
        });

        res.json({
            success: true,
            message: formType === "LBAC3"
                ? "LBAC Form 3 physical data saved. Continue to LBAC Form 5 for submission."
                : "LBAC Form 5 updated and submitted to the approval workflow.",
            data: serialize(report),
            nextFormType: formType === "LBAC3" ? "LBAC5" : null,
        });
    } catch (error) {
        console.error("UPDATE PHYSICAL REPORT:", error);

        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                error:
                    "This report already exists for the selected office, form, year, and quarter.",
            });
        }

        res.status(500).json({
            success: false,
            error: "Failed to update physical report.",
            details: error.message,
        });
    }
};

const syncQuarterPairStatus = async (report, status, actorId, remarks = "") => {
    if (!report?._id) return;

    const normalizedStatus = String(status || "").toUpperCase();
    const synchronizedStatuses = new Set([
        "SUBMITTED",
        "UNDER_REVIEW",
        "RETURNED",
        "RESUBMITTED",
        "APPROVED",
        "APPROVED_BY_ADMIN",
        "VALIDATED",
        "COMPLETED",
    ]);
    if (!synchronizedStatuses.has(normalizedStatus)) return;

    const siblings = await PhysicalReport.find({
        office: report.office,
        year: report.year,
        quarter: report.quarter,
        reportGroupId: report.reportGroupId,
        formType: { $in: ["LBAC3", "LBAC5"] },
        _id: { $ne: report._id },
    });

    for (const sibling of siblings) {
        // A sibling in a terminal state should not be silently reopened by an
        // unrelated form save. Return/resubmission is the only intentional
        // backwards movement in the workflow.
        if (normalizedStatus === "RETURNED" && freezeStatus(sibling.status)) {
            continue;
        }

        sibling.status = normalizedStatus;
        sibling.submissionHistory.push({
            status: normalizedStatus,
            by: actorId,
            at: new Date(),
            remarks,
        });

        if (normalizedStatus === "UNDER_REVIEW" || normalizedStatus === "APPROVED" || normalizedStatus === "APPROVED_BY_ADMIN") {
            sibling.reviewedBy = actorId;
            sibling.reviewedAt = new Date();
        }

        if (normalizedStatus === "RETURNED" || normalizedStatus === "RESUBMITTED") {
            sibling.adminRemarks = normalizedStatus === "RETURNED" ? remarks : "";
            sibling.returnReason = normalizedStatus === "RETURNED" ? remarks : "";
            sibling.returnedAt = normalizedStatus === "RETURNED" ? new Date() : sibling.returnedAt;
            sibling.frozenAt = null;
            sibling.frozenBy = null;
        }

        if (["APPROVED", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"].includes(normalizedStatus)) {
            sibling.frozenAt = normalizedStatus === "VALIDATED" || normalizedStatus === "COMPLETED" ? (sibling.frozenAt || new Date()) : sibling.frozenAt;
            sibling.frozenBy = normalizedStatus === "VALIDATED" || normalizedStatus === "COMPLETED" ? (sibling.frozenBy || actorId) : sibling.frozenBy;
        }

        await sibling.save();
    }
};

export const reviewPhysicalReport = async (req, res) => {
    try {
        if (req.session.role !== "DEPARTMENT_HEAD") {
            return res.status(403).json({ success: false, error: "Department Head / Approval Body access required." });
        }

        const office = await getAssignedOfficeForSession(req.session.id);
        const report = await PhysicalReport.findById(req.params.id);

        if (!report) return res.status(404).json({ success: false, error: "Physical report not found." });
        if (!office || report.office !== office) {
            return res.status(403).json({ success: false, error: "You can only review reports from your assigned office." });
        }
        if (!["SUBMITTED", "RESUBMITTED", "PENDING"].includes(report.status)) {
            return res.status(400).json({ success: false, error: "This report is not ready for review." });
        }

        report.status = "UNDER_REVIEW";
        report.reviewedBy = req.session.id;
        report.reviewedAt = new Date();
        report.submissionHistory.push({ status: "UNDER_REVIEW", by: req.session.id, at: new Date() });
        await report.save();
        await syncQuarterPairStatus(report, "UNDER_REVIEW", req.session.id);
        await writeAudit(req, { action: "PHYSICAL_REPORT_UNDER_REVIEW", entityType: "PhysicalReport", entityId: report._id.toString(), office: report.office, formType: report.formType, year: report.year, quarter: report.quarter, details: { reportTitle: report.reportTitle, reportGroupId: report.reportGroupId } });

        res.json({ success: true, message: "Physical Report is now under review.", data: serialize(report) });
    } catch (error) {
        console.error("REVIEW PHYSICAL REPORT:", error);
        res.status(500).json({ success: false, error: "Failed to place physical report under review." });
    }
};

export const approvePhysicalReport = async (req, res) => {
    try {
        if (req.session.role !== "DEPARTMENT_HEAD") {
            return res.status(403).json({
                success: false,
                error: "Department Head / Approval Body access required.",
            });
        }

        const office = await getAssignedOfficeForSession(req.session.id);
        const report = await PhysicalReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: "Physical report not found.",
            });
        }

        if (!office || report.office !== office) {
            return res.status(403).json({
                success: false,
                error: "You can only approve reports from your assigned office.",
            });
        }

        if (!activeReviewStatus(report.status)) {
            return res.status(400).json({
                success: false,
                error: "This report is not waiting for Department Head approval.",
            });
        }

        const signatures = signatureFiles(req, true);
        if (signatures.error) {
            return res.status(400).json({
                success: false,
                error: signatures.error,
            });
        }

        const officeHead = cleanText(req.body.officeHead);
        const localPlanningCoordinator = cleanText(
            req.body.localPlanningCoordinator
        );

        if (!officeHead || !localPlanningCoordinator) {
            return res.status(400).json({
                success: false,
                error:
                    "Department/Office Head and Local Planning and Development Coordinator names are required for approval.",
            });
        }

        report.officeHead = officeHead;
        report.officeHeadDate = new Date();
        report.localPlanningCoordinator = localPlanningCoordinator;
        report.localPlanningCoordinatorDate = new Date();
        report.signatures = signatures.value;
        report.status = "APPROVED";
        report.submissionHistory.push({ status: "APPROVED", by: req.session.id, at: new Date() });
        report.reviewedBy = req.session.id;
        report.reviewedAt = new Date();
        report.adminRemarks = "";

        await report.save();
        await syncQuarterPairStatus(report, "APPROVED", req.session.id);
        await writeAudit(req, { action: "PHYSICAL_REPORT_APPROVED", entityType: "PhysicalReport", entityId: report._id.toString(), office: report.office, formType: report.formType, year: report.year, quarter: report.quarter, details: { reportTitle: report.reportTitle, reportGroupId: report.reportGroupId } });

        res.json({
            success: true,
            message:
                "Physical Report approved by Department Head with e-signatures. It is now available to PPDO/Admin for validation.",
            data: serialize(report),
        });
    } catch (error) {
        console.error("APPROVE PHYSICAL REPORT:", error);
        res.status(500).json({
            success: false,
            error: "Failed to approve physical report.",
        });
    }
};


export const adminApprovePhysicalReport = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "PPDO/Admin access required.",
            });
        }

        const report = await PhysicalReport.findById(req.params.id);
        if (!report) {
            return res.status(404).json({
                success: false,
                error: "Physical report not found.",
            });
        }

        if (!activeReviewStatus(report.status) && report.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                error: "Only submitted reports waiting for review can be approved by Admin.",
            });
        }

        const note = cleanText(req.body?.remarks) ||
            "Admin approved this Physical Report. Department/Office Head and/or Local Planning and Development Coordinator e-signatures are still incomplete and must be provided for complete certification.";

        report.status = "APPROVED_BY_ADMIN";
        report.adminRemarks = note;
        report.reviewedBy = req.session.id;
        report.reviewedAt = new Date();
        report.submissionHistory.push({
            status: "APPROVED_BY_ADMIN",
            by: req.session.id,
            at: new Date(),
            remarks: note,
        });

        await report.save();
        await syncQuarterPairStatus(report, "APPROVED_BY_ADMIN", req.session.id, note);
        await writeAudit(req, { action: "PHYSICAL_REPORT_ADMIN_APPROVED", entityType: "PhysicalReport", entityId: report._id.toString(), office: report.office, formType: report.formType, year: report.year, quarter: report.quarter, details: { reportTitle: report.reportTitle, reportGroupId: report.reportGroupId, remarks: note } });

        res.json({
            success: true,
            message: "Physical Report approved by Admin. E-signature requirements remain pending.",
            data: serialize(report),
        });
    } catch (error) {
        console.error("ADMIN APPROVE PHYSICAL REPORT:", error);
        res.status(500).json({
            success: false,
            error: "Failed to approve Physical Report as Admin.",
            details: error.message,
        });
    }
};

export const denyPhysicalReport = async (req, res) => {
    try {
        if (req.session.role !== "DEPARTMENT_HEAD") {
            return res.status(403).json({
                success: false,
                error: "Department Head / Approval Body access required.",
            });
        }

        const office = await getAssignedOfficeForSession(req.session.id);
        const report = await PhysicalReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: "Physical report not found.",
            });
        }

        if (!office || report.office !== office) {
            return res.status(403).json({
                success: false,
                error: "You can only return reports from your assigned office.",
            });
        }

        const remarks = cleanText(req.body.remarks);

        if (!remarks) {
            return res.status(400).json({
                success: false,
                error: "Correction remarks are required.",
            });
        }

        if (!activeReviewStatus(report.status)) {
            return res.status(400).json({ success: false, error: "Only submitted or under-review reports can be returned." });
        }

        report.status = "RETURNED";
        report.adminRemarks = remarks;
        report.returnReason = remarks;
        report.returnedAt = new Date();
        report.submissionHistory.push({ status: "RETURNED", by: req.session.id, at: new Date(), remarks });
        report.reviewedBy = req.session.id;
        report.reviewedAt = new Date();

        await report.save();
        await syncQuarterPairStatus(report, "RETURNED", req.session.id, remarks);
        await writeAudit(req, { action: "PHYSICAL_REPORT_RETURNED", entityType: "PhysicalReport", entityId: report._id.toString(), office: report.office, formType: report.formType, year: report.year, quarter: report.quarter, details: { reportTitle: report.reportTitle, reportGroupId: report.reportGroupId, remarks } });

        res.json({
            success: true,
            message: "Physical Report returned to the Encoder for correction.",
            data: serialize(report),
        });
    } catch (error) {
        console.error("DENY PHYSICAL REPORT:", error);
        res.status(500).json({
            success: false,
            error: "Failed to return physical report.",
        });
    }
};

export const validatePhysicalReport = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "PPDO/Admin access required.",
            });
        }

        const report = await PhysicalReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: "Physical report not found.",
            });
        }

        if (!["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN"].includes(report.status)) {
            return res.status(400).json({
                success: false,
                error:
                    "Only Department Head-approved reports can be validated.",
            });
        }

        report.status = "VALIDATED";
        report.frozenAt = new Date();
        report.frozenBy = req.session.id;
        report.submissionHistory.push({ status: "VALIDATED", by: req.session.id, at: new Date() });
        report.validatedBy = req.session.id;
        report.validatedAt = new Date();
        report.reviewedBy = req.session.id;
        report.reviewedAt = new Date();

        await report.save();
        await syncQuarterPairStatus(report, "VALIDATED", req.session.id);
        await writeAudit(req, { action: "PHYSICAL_REPORT_VALIDATED", entityType: "PhysicalReport", entityId: report._id.toString(), office: report.office, formType: report.formType, year: report.year, quarter: report.quarter, details: { reportTitle: report.reportTitle, reportGroupId: report.reportGroupId } });

        res.json({
            success: true,
            message:
                "Physical Report validated. The original Encoder data will be used in summaries; no re-encoding is required.",
            data: serialize(report),
        });
    } catch (error) {
        console.error("VALIDATE PHYSICAL REPORT:", error);
        res.status(500).json({
            success: false,
            error: "Failed to validate physical report.",
        });
    }
};

export const carryForwardPhysicalReport = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "PPDO/Admin access required to carry a report forward.",
            });
        }

        const source = await PhysicalReport.findById(req.params.id).lean();
        if (!source) {
            return res.status(404).json({ success: false, error: "Physical report not found." });
        }
        if (source.formType !== "LBAC3") {
            return res.status(400).json({ success: false, error: "Only an LBAC 3 report can be carried forward." });
        }

        const currentNumber = quarterNumber(source.quarter);
        if (!currentNumber || currentNumber >= 4) {
            return res.status(400).json({ success: false, error: "Q4 cannot be carried forward to another quarter." });
        }

        const nextQuarter = QUARTERS[currentNumber];
        const existingNext = await PhysicalReport.findOne({
            office: source.office,
            year: source.year,
            formType: "LBAC3",
            quarter: nextQuarter,
            reportGroupId: source.reportGroupId,
        });

        if (existingNext) {
            return res.status(200).json({
                success: true,
                existing: true,
                message: `${nextQuarter} already exists for ${source.reportTitle || source.office}. Open the existing report instead.`,
                data: serialize(existingNext),
            });
        }

        const actorName = await getEncoderName(req.session.id);
        const now = new Date();
        const report = await PhysicalReport.create({
            formType: "LBAC3",
            office: source.office,
            sector: source.sector || sectorForOffice(source.office),
            reportTitle: source.reportTitle || "",
            year: source.year,
            quarter: nextQuarter,
            reportGroupId: source.reportGroupId,
            majorPpaCode: source.majorPpaCode || "",
            majorFinalOutput: source.majorFinalOutput || "",
            periodEndDate: null,
            periodLabel: "",
            varianceAsOf: null,
            rows: Array.isArray(source.rows) ? source.rows : [],
            deletedLbac3RowKeys: Array.isArray(source.deletedLbac3RowKeys) ? source.deletedLbac3RowKeys : [],
            evaluationRows: [],
            lbac3QuarterTotals: source.lbac3QuarterTotals || {},
            lbac5Totals: {
                totalCost: 0, totalWeight: 0, totalTargetOutput: 0, totalActualOutput: 0,
                totalVariance: 0, physicalWeightedScore: 0, totalAllotmentReleased: 0,
                totalObligationsIncurred: 0, financialVariance: 0, financialWeightedScore: 0,
                totalWeightedScore: 0, averageCoa: 0,
            },
            linkedLbac3Report: null,
            structureSourceReport: source._id,
            linkedLbac3Totals: { quarter: "", target: 0, actual: 0, variance: 0 },
            preparedBy: actorName,
            preparedDate: now,
            editedBy: req.session.id,
            editedByName: actorName,
            editedAt: now,
            carriedForwardFromReport: source._id,
            carriedForwardFromQuarter: source.quarter,
            carriedForwardAt: now,
            carriedForwardBy: req.session.id,
            carriedForwardByName: actorName,
            officeHead: "",
            officeHeadDate: null,
            localPlanningCoordinator: "",
            localPlanningCoordinatorDate: null,
            signatures: { officeHead: null, localPlanningCoordinator: null },
            status: "DRAFT",
            adminRemarks: "",
            returnReason: "",
            returnedAt: null,
            frozenAt: null,
            frozenBy: null,
            submissionHistory: [{
                status: "DRAFT",
                by: req.session.id,
                at: now,
                remarks: `Carried forward from ${source.quarter} ${source.year} by PPDO/Admin for ${nextQuarter} encoding.`,
            }],
            submittedBy: req.session.id,
            createdBy: req.session.id,
            reviewedBy: null,
            reviewedAt: null,
            validatedBy: null,
            validatedAt: null,
        });

        await writeAudit(req, {
            action: "PHYSICAL_REPORT_CARRIED_FORWARD",
            entityType: "PhysicalReport",
            entityId: report._id.toString(),
            office: report.office,
            formType: report.formType,
            year: report.year,
            quarter: report.quarter,
            details: {
                reportTitle: report.reportTitle,
                reportGroupId: report.reportGroupId,
                fromQuarter: source.quarter,
                fromReportId: source._id.toString(),
                carriedForwardBy: actorName,
            },
        });

        res.status(201).json({
            success: true,
            message: `${source.quarter} ${source.year} data was carried forward to ${nextQuarter} for ${source.office}. The assigned office encoder may now review and edit it.`,
            data: serialize(report),
        });
    } catch (error) {
        console.error("CARRY FORWARD PHYSICAL REPORT:", error);
        if (error?.code === 11000) {
            return res.status(409).json({ success: false, error: "The next-quarter report already exists for this report group." });
        }
        res.status(500).json({ success: false, error: "Failed to carry Physical Report forward.", details: error.message });
    }
};

export const deletePhysicalReport = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "Admin access required.",
            });
        }

        const existing = await PhysicalReport.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: "Physical report not found." });
        }
        // Admin has explicit maintenance authority over Physical Reports.
        // Deletion is still protected by the authenticated ADMIN role and a
        // confirmation in the UI. Do not silently cascade-delete the paired
        // LBAC form; the other form may contain a valid historical record.
        const report = await PhysicalReport.findByIdAndDelete(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: "Physical report not found.",
            });
        }

        await writeAudit(req, { action: "PHYSICAL_REPORT_DELETED", entityType: "PhysicalReport", entityId: report._id.toString(), office: report.office, formType: report.formType, year: report.year, quarter: report.quarter, details: { reportTitle: report.reportTitle, reportGroupId: report.reportGroupId } });

        res.json({
            success: true,
            message: "Physical Report deleted successfully.",
        });
    } catch (error) {
        console.error("DELETE PHYSICAL REPORT:", error);
        res.status(500).json({
            success: false,
            error: "Failed to delete physical report.",
        });
    }
};

export { parseLbac3Rows, parseLbac5Rows, mergeAnnualLbac3Reports, prepareLbac5FromLbac3 };
