import test from "node:test";
import assert from "node:assert/strict";
import PhysicalReport from "../models/PhysicalReport.js";
import { parseLbac3Rows } from "../controllers/physicalReportController.js";

const USER_ID = "507f1f77bcf86cd799439011";

test("Physical Report supports a 4-level heading tree with leaf PPA items", async () => {
    const report = new PhysicalReport({
        formType: "LBAC3",
        office: "Test Office",
        sector: "Test Sector",
        year: 2026,
        createdBy: USER_ID,
        submittedBy: USER_ID,
        rows: [
            {
                rowType: "MAIN",
                headingLevel: 0,
                groupKey: "main",
                parentGroupKey: "",
                categoryName: "GENERAL MANAGEMENT & ADMINISTRATION",
            },
            {
                rowType: "GROUP",
                headingLevel: 1,
                groupKey: "g1",
                parentGroupKey: "main",
                categoryName: "Medical Services",
            },
            {
                rowType: "GROUP",
                headingLevel: 2,
                groupKey: "g2",
                parentGroupKey: "g1",
                categoryName: "Outpatient Services",
            },
            {
                rowType: "ITEM",
                headingLevel: 4,
                groupKey: "",
                parentGroupKey: "g2",
                ppaCode: "PPA-01",
                ppaName: "Conduct Road Survey",
            },
        ],
    });

    await report.validate();
    assert.deepEqual(
        report.rows.map((row) => ({
            rowType: row.rowType,
            headingLevel: row.headingLevel,
            groupKey: row.groupKey,
            parentGroupKey: row.parentGroupKey,
        })),
        [
            { rowType: "MAIN", headingLevel: 0, groupKey: "main", parentGroupKey: "" },
            { rowType: "GROUP", headingLevel: 1, groupKey: "g1", parentGroupKey: "main" },
            { rowType: "GROUP", headingLevel: 2, groupKey: "g2", parentGroupKey: "g1" },
            { rowType: "ITEM", headingLevel: 4, groupKey: "", parentGroupKey: "g2" },
        ]
    );
});

test("LBAC3 parser preserves MAIN and GROUP hierarchy rows", () => {
    const parsed = parseLbac3Rows([
        { rowType: "MAIN", headingLevel: 0, groupKey: "main", categoryName: "GENERAL MANAGEMENT" },
        { rowType: "GROUP", headingLevel: 1, groupKey: "medical", parentGroupKey: "main", categoryName: "Medical Services" },
        { rowType: "ITEM", parentGroupKey: "medical", ppaCode: "8000-5000-1-1", ppaName: "Admission", performanceIndicator: "Patients admitted", targetOutput: { q1: 375 }, actualPerformance: { q1: 288 } },
    ]);

    assert.equal(parsed.error, undefined);
    assert.deepEqual(parsed.value.map((row) => row.rowType), ["MAIN", "GROUP", "ITEM"]);
    assert.equal(parsed.value[0].headingLevel, 0);
    assert.equal(parsed.value[1].parentGroupKey, "main");
    assert.equal(parsed.value[2].parentGroupKey, "medical");
});

test("LBAC3 parser ignores accidental blank PPA rows", () => {
    const parsed = parseLbac3Rows([
        { rowType: "GROUP", headingLevel: 1, groupKey: "medical", categoryName: "Medical Services" },
        { rowType: "ITEM", parentGroupKey: "medical", ppaCode: "8000-5000-1-1", ppaName: "Admission", performanceIndicator: "Patients admitted", targetOutput: { q1: 375 }, actualPerformance: { q1: 288 } },
        { rowType: "ITEM", ppaName: "", performanceIndicator: "", targetOutput: {}, actualPerformance: {} },
    ]);

    assert.equal(parsed.error, undefined);
    assert.equal(parsed.value.length, 2);
    assert.deepEqual(parsed.value.map((row) => row.rowType), ["GROUP", "ITEM"]);
});

test("LBAC3 parser permits a structure-only payload containing no PPA items", () => {
    const parsed = parseLbac3Rows([
        { rowType: "ITEM", ppaName: "", performanceIndicator: "", targetOutput: {}, actualPerformance: {} },
        { rowType: "GROUP", categoryName: "" },
    ]);

    assert.equal(parsed.error, undefined);
    assert.equal(parsed.value.length, 1);
    assert.equal(parsed.value[0].rowType, "GROUP");
});
