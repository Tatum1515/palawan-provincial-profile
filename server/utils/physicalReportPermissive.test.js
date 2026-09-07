import test from "node:test";
import assert from "node:assert/strict";
import { parseLbac5Rows } from "../controllers/physicalReportController.js";

test("LBAC5 accepts a different number of PPA items than LBAC3", () => {
    const sourceRows = [
        { rowType: "ITEM", rowKey: "a", ppaName: "One", targetOutput: { q1: 1 }, actualPerformance: { q1: 2 } },
        { rowType: "ITEM", rowKey: "b", ppaName: "Two", targetOutput: { q1: 1 }, actualPerformance: { q1: 1 } },
        { rowType: "ITEM", rowKey: "c", ppaName: "Three", targetOutput: { q1: 1 }, actualPerformance: { q1: 0 } },
    ];

    const result = parseLbac5Rows(
        [{ rowType: "ITEM", ppaName: "One", sourceLbac3RowKey: "a", targetOutput: 0, actualOutput: 0 }],
        { quarter: "Q1", target: 3, actual: 3, variance: 0 },
        sourceRows,
        "Q1",
        true
    );

    assert.equal(result.error, undefined);
    assert.equal(result.value.length, 1);
    assert.equal(result.value[0].targetOutput, 1);
    assert.equal(result.value[0].actualOutput, 2);
});

test("LBAC5 can be saved without an LBAC3 source", () => {
    const result = parseLbac5Rows(
        [{ rowType: "ITEM", ppaName: "Manual PPA", targetOutput: 10, actualOutput: 8, weight: 10 }],
        null,
        [],
        "Q1",
        true
    );

    assert.equal(result.error, undefined);
    assert.equal(result.value.length, 1);
    assert.equal(result.value[0].targetOutput, 10);
    assert.equal(result.value[0].actualOutput, 8);
});
