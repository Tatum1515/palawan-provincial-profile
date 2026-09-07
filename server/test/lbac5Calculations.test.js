import test from "node:test";
import assert from "node:assert/strict";
import {
    physicalPoints,
    financialPoints,
    calculateEvaluationRow,
    calculateLbac5Totals,
} from "../utils/lbac5Calculations.js";

test("physicalPoints uses all LBAC5 thresholds", () => {
    assert.equal(physicalPoints(79.99), 1);
    assert.equal(physicalPoints(80), 2);
    assert.equal(physicalPoints(90), 3);
    assert.equal(physicalPoints(100), 4);
    assert.equal(physicalPoints(110), 5);
});

test("financialPoints uses all LBAC5 thresholds", () => {
    assert.equal(financialPoints(79.99), 1);
    assert.equal(financialPoints(80), 2);
    assert.equal(financialPoints(90), 3);
    assert.equal(financialPoints(95), 4);
    assert.equal(financialPoints(100), 5);
});

test("calculateEvaluationRow calculates physical and financial scores consistently", () => {
    const row = calculateEvaluationRow({
        rowType: "ITEM",
        weight: 20,
        targetOutput: 100,
        actualOutput: 110,
        allotmentReleased: 1000,
        obligationsIncurred: 950,
    });

    assert.equal(row.variance, 10);
    assert.equal(row.accomplishmentPct, 110);
    assert.equal(row.physicalPoints, 5);
    assert.equal(row.physicalWeightedScore, 1);
    assert.equal(row.financialVariance, -50);
    assert.equal(row.absorptiveCapacityPct, 95);
    assert.equal(row.financialPoints, 4);
    assert.equal(row.financialWeightedScore, 0.8);
});

test("calculateEvaluationRow safely handles zero targets and allotments", () => {
    const row = calculateEvaluationRow({
        weight: 25,
        targetOutput: 0,
        actualOutput: 10,
        allotmentReleased: 0,
        obligationsIncurred: 10,
    });

    assert.equal(row.accomplishmentPct, 0);
    assert.equal(row.absorptiveCapacityPct, 0);
    assert.equal(row.coaPct, 0);
    assert.equal(row.physicalPoints, 1);
    assert.equal(row.financialPoints, 1);
});

test("calculateLbac5Totals recalculates and aggregates the supplied rows", () => {
    const totals = calculateLbac5Totals([
        { weight: 50, cost: 100, targetOutput: 100, actualOutput: 100, variance: 0, physicalWeightedScore: 2, allotmentReleased: 100, obligationsIncurred: 100, financialVariance: 0, financialWeightedScore: 2, coaPct: 100 },
        { weight: 50, cost: 200, targetOutput: 200, actualOutput: 160, variance: -40, physicalWeightedScore: 1.5, allotmentReleased: 200, obligationsIncurred: 180, financialVariance: -20, financialWeightedScore: 1.5, coaPct: 80 },
    ]);

    assert.equal(totals.totalWeight, 100);
    assert.equal(totals.totalTargetOutput, 300);
    assert.equal(totals.totalActualOutput, 260);
    assert.equal(totals.totalVariance, -40);
    // Totals are intentionally recalculated from raw row values on the server.
    // Client-supplied calculated score fields must not be trusted.
    assert.equal(totals.physicalWeightedScore, 3);
    assert.equal(totals.financialWeightedScore, 4);
    assert.equal(totals.totalWeightedScore, 7);
    assert.equal(totals.averageCoa, 90);
});
