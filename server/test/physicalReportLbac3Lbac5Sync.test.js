import test from "node:test";
import assert from "node:assert/strict";
import { mergeAnnualLbac3Reports, prepareLbac5FromLbac3 } from "../controllers/physicalReportController.js";

test("annual LBAC3 merge preserves hierarchy groups and transfers leaf items to LBAC5", () => {
  const reports = [
    {
      office: "Test Office", year: 2026, quarter: "Q1",
      majorPpaCode: "8000-500-1", majorFinalOutput: "GENERAL MANAGEMENT & ADMINISTRATION",
      rows: [
        { rowType: "GROUP", headingLevel: 1, groupKey: "g1", parentGroupKey: "", categoryName: "Medical Services", majorFinalOutput: "Medical Services" },
        { rowType: "ITEM", headingLevel: 4, rowKey: "i1", parentGroupKey: "g1", ppaCode: "8000-500-1-01", ppaName: "Admission (Inpatient)", performanceIndicator: "No. admitted", targetOutput: { q1: 375, q2: 375, q3: null, q4: null }, actualPerformance: { q1: 278, q2: null, q3: null, q4: null } },
      ],
    },
    {
      office: "Test Office", year: 2026, quarter: "Q2",
      rows: [
        { rowType: "GROUP", headingLevel: 1, groupKey: "g1", parentGroupKey: "", categoryName: "Medical Services", majorFinalOutput: "Medical Services" },
        { rowType: "ITEM", headingLevel: 4, rowKey: "i1", parentGroupKey: "g1", ppaCode: "8000-500-1-01", ppaName: "Admission (Inpatient)", performanceIndicator: "No. admitted", targetOutput: { q1: null, q2: 375, q3: null, q4: null }, actualPerformance: { q1: null, q2: 288, q3: null, q4: null } },
      ],
    },
  ];
  const merged = mergeAnnualLbac3Reports(reports);
  assert.equal(merged.rows[0].rowType, "GROUP");
  assert.equal(merged.rows[0].headingLevel, 1);
  const item = merged.rows.find((row) => row.rowType === "ITEM");
  assert.ok(item);
  assert.equal(item.targetOutput.q1, 375);
  assert.equal(item.targetOutput.q2, 375);
  assert.equal(item.actualPerformance.q1, 278);
  assert.equal(item.actualPerformance.q2, 288);
  const lbac5 = prepareLbac5FromLbac3(merged, "Q2", []);
  const lbac5Item = lbac5.find((row) => row.rowType === "ITEM");
  assert.ok(lbac5Item);
  assert.equal(lbac5Item.targetOutput, 750);
  assert.equal(lbac5Item.actualOutput, 566);
  assert.equal(lbac5Item.sourceLbac3RowKey, "i1");
});

test("LBAC5 generation preserves MAIN and GROUP hierarchy and excludes headings from source item count", () => {
  const source = {
    office: "Test Office", year: 2026, quarter: "Q2",
    majorPpaCode: "8000-500-1", majorFinalOutput: "GENERAL MANAGEMENT & ADMINISTRATION",
    rows: [
      { rowType: "MAIN", rowKey: "main", headingLevel: 0, categoryName: "GENERAL MANAGEMENT & ADMINISTRATION", majorFinalOutput: "GENERAL MANAGEMENT & ADMINISTRATION" },
      { rowType: "GROUP", rowKey: "g-med", headingLevel: 1, groupKey: "g-med", parentGroupKey: "", categoryName: "Medical Services", majorFinalOutput: "Medical Services" },
      { rowType: "ITEM", rowKey: "i-adm", headingLevel: 4, parentGroupKey: "g-med", ppaCode: "P1", ppaName: "Admission", performanceIndicator: "No. admitted", targetOutput: { q1: 375, q2: 375 }, actualPerformance: { q1: 278, q2: 288 } },
      { rowType: "GROUP", rowKey: "g-nurse", headingLevel: 1, groupKey: "g-nurse", parentGroupKey: "", categoryName: "Nursing Services", majorFinalOutput: "Nursing Services" },
      { rowType: "ITEM", rowKey: "i-dep", headingLevel: 4, parentGroupKey: "g-nurse", ppaCode: "P2", ppaName: "Dependent Nursing", performanceIndicator: "No. patients", targetOutput: { q1: 3500, q2: 3500 }, actualPerformance: { q1: 2743, q2: 3136 } },
    ],
  };
  const generated = prepareLbac5FromLbac3(source, "Q2", []);
  assert.deepEqual(generated.map((row) => row.rowType), ["MAIN", "GROUP", "ITEM", "GROUP", "ITEM"]);
  assert.equal(generated[0].majorFinalOutput, "GENERAL MANAGEMENT & ADMINISTRATION");
  assert.equal(generated[1].categoryName, "Medical Services");
  assert.equal(generated[2].parentGroupKey, "g-med");
  assert.equal(generated[2].targetOutput, 750);
  assert.equal(generated[2].actualOutput, 566);
  assert.equal(generated[4].parentGroupKey, "g-nurse");
});

test("LBAC5 generation uses LBAC3 as the structural source and does not append orphan financial rows", () => {
  const source = {
    office: "Test Office", year: 2026, quarter: "Q2",
    rows: [
      { rowType: "GROUP", headingLevel: 1, groupKey: "g1", categoryName: "Medical Services" },
      { rowType: "ITEM", rowKey: "i1", parentGroupKey: "g1", ppaName: "Admission", performanceIndicator: "Patients", targetOutput: { q1: 10, q2: 10 }, actualPerformance: { q1: 5, q2: 5 } },
    ],
  };
  const generated = prepareLbac5FromLbac3(source, "Q2", [
    { rowType: "ITEM", sourceLbac3RowKey: "i1", majorFinalOutput: "Admission", weight: 10 },
    { rowType: "ITEM", sourceLbac3RowKey: "orphan", majorFinalOutput: "Old PPA", weight: 20 },
  ]);
  assert.equal(generated.filter((row) => row.rowType === "ITEM").length, 1);
  assert.equal(generated.find((row) => row.rowType === "ITEM").weight, 10);
});
