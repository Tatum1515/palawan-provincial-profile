import test from "node:test";
import assert from "node:assert/strict";
import { prepareLbac5FromLbac3 } from "../controllers/physicalReportController.js";

test("LBAC5 group totals aggregate descendant PPA target and actual values", () => {
  const source = {
    majorFinalOutput: "GENERAL MANAGEMENT & ADMINISTRATION",
    rows: [
      { rowType: "MAIN", headingLevel: 0, majorFinalOutput: "GENERAL MANAGEMENT & ADMINISTRATION" },
      { rowType: "GROUP", headingLevel: 1, groupKey: "medical", parentGroupKey: "", categoryName: "Medical Services" },
      { rowType: "ITEM", rowKey: "admission", parentGroupKey: "medical", ppaName: "Admission", targetOutput: { q1: 375, q2: 375 }, actualPerformance: { q1: 278, q2: 288 } },
      { rowType: "ITEM", rowKey: "consultation", parentGroupKey: "medical", ppaName: "Consultation", targetOutput: { q1: 500, q2: 500 }, actualPerformance: { q1: 753, q2: 667 } },
      { rowType: "GROUP", headingLevel: 1, groupKey: "nursing", parentGroupKey: "", categoryName: "Nursing Services" },
      { rowType: "ITEM", rowKey: "dependent", parentGroupKey: "nursing", ppaName: "Dependent Nursing", targetOutput: { q1: 3500, q2: 3500 }, actualPerformance: { q1: 2743, q2: 3136 } },
    ],
  };

  const rows = prepareLbac5FromLbac3(source, "Q2", []);
  const medical = rows.find((row) => row.rowType === "GROUP" && row.groupKey === "medical");
  const nursing = rows.find((row) => row.rowType === "GROUP" && row.groupKey === "nursing");

  assert.ok(medical);
  assert.equal(medical.targetOutput, 1750);
  assert.equal(medical.actualOutput, 1986);
  assert.equal(medical.variance, 236);

  assert.ok(nursing);
  assert.equal(nursing.targetOutput, 7000);
  assert.equal(nursing.actualOutput, 5879);
  assert.equal(nursing.variance, -1121);
});

test("LBAC5 MAIN total aggregates all leaf PPAs and remains excluded from evaluation weighting", () => {
  const source = {
    majorFinalOutput: "GENERAL MANAGEMENT & ADMINISTRATION",
    rows: [
      { rowType: "GROUP", headingLevel: 1, groupKey: "g1", parentGroupKey: "", categoryName: "Medical Services" },
      { rowType: "ITEM", rowKey: "i1", parentGroupKey: "g1", ppaName: "Admission", targetOutput: { q1: 10, q2: 20 }, actualPerformance: { q1: 5, q2: 15 } },
      { rowType: "ITEM", rowKey: "i2", parentGroupKey: "g1", ppaName: "Consultation", targetOutput: { q1: 30, q2: 40 }, actualPerformance: { q1: 25, q2: 35 } },
    ],
  };

  const rows = prepareLbac5FromLbac3(source, "Q2", []);
  const main = rows.find((row) => row.rowType === "MAIN");
  const items = rows.filter((row) => row.rowType === "ITEM");

  assert.ok(main);
  assert.equal(main.targetOutput, 100);
  assert.equal(main.actualOutput, 80);
  assert.equal(main.variance, -20);
  assert.equal(items.length, 2);
});
