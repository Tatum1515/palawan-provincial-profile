import test from "node:test";
import assert from "node:assert/strict";
import { validatePhysicalReportBusinessRules } from "../utils/physicalReportValidation.js";

const base = {
    formType: "LBAC5",
    office: "Office of the Governor",
    sector: "Executive",
    year: 2026,
    quarter: "Q3",
    submissionAction: "SUBMIT",
    rows: [],
    evaluationRows: [
        { rowType: "ITEM", weight: 50, cost: 100, targetOutput: 10, actualOutput: 5, allotmentReleased: 1000, obligationsIncurred: 500 },
        { rowType: "ITEM", weight: 50, cost: 200, targetOutput: 20, actualOutput: 10, allotmentReleased: 2000, obligationsIncurred: 1000 },
    ],
};

test("business validation accepts a valid Physical Report payload", () => {
    assert.equal(validatePhysicalReportBusinessRules(base), "");
});

test("business validation rejects negative financial or output values instead of clamping them", () => {
    const error = validatePhysicalReportBusinessRules({
        ...base,
        evaluationRows: [{ ...base.evaluationRows[0], obligationsIncurred: -1 }],
    });
    assert.match(error, /cannot be negative/i);
});

test("business validation rejects non-finite numeric input", () => {
    const error = validatePhysicalReportBusinessRules({
        ...base,
        evaluationRows: [{ ...base.evaluationRows[0], weight: "not-a-number" }],
    });
    assert.match(error, /must be a valid number/i);
});

test("business validation allows submitted LBAC5 total weight above 100%", () => {
    const error = validatePhysicalReportBusinessRules({
        ...base,
        evaluationRows: [
            { ...base.evaluationRows[0], weight: 60 },
            { ...base.evaluationRows[1], weight: 60 },
        ],
    });
    assert.equal(error, "");
});

test("business validation permits overweight drafts so the encoder can continue editing", () => {
    const error = validatePhysicalReportBusinessRules({
        ...base,
        submissionAction: "DRAFT",
        evaluationRows: [
            { ...base.evaluationRows[0], weight: 60 },
            { ...base.evaluationRows[1], weight: 60 },
        ],
    });
    assert.equal(error, "");
});

test("business validation rejects oversized row payloads", () => {
    const error = validatePhysicalReportBusinessRules({
        ...base,
        rows: Array.from({ length: 1001 }, () => ({ rowType: "ITEM" })),
    });
    assert.match(error, /more than 1000 rows/i);
});
