import test from "node:test";
import assert from "node:assert/strict";

import { resolveSubmissionStatus } from "../utils/physicalReportWorkflow.js";
import { parseLbac5Rows } from "../controllers/physicalReportController.js";

test("LBAC5 accepts rows supplied from the confirmed LBAC3 source", () => {
    const parsed = parseLbac5Rows(
        [
            {
                rowType: "MAIN",
                majorFinalOutput: "GENERAL MANAGEMENT & ADMINISTRATION",
            },
            {
                rowType: "GROUP",
                majorFinalOutput: "Medical Services",
                categoryName: "Medical Services",
            },
            {
                rowType: "ITEM",
                majorFinalOutput: "PPA One",
                ppaName: "PPA One",
                targetOutput: 10,
                actualOutput: 8,
                weight: 10,
            },
            {
                rowType: "ITEM",
                majorFinalOutput: "PPA Two",
                ppaName: "PPA Two",
                targetOutput: 20,
                actualOutput: 18,
                weight: 10,
            },
        ],
        null,
        [
            {
                rowType: "MAIN",
                majorFinalOutput: "GENERAL MANAGEMENT & ADMINISTRATION",
            },
            {
                rowType: "GROUP",
                majorFinalOutput: "Medical Services",
                categoryName: "Medical Services",
            },
            {
                rowType: "ITEM",
                majorFinalOutput: "PPA One",
                ppaName: "PPA One",
                targetOutput: 10,
                actualOutput: 8,
            },
            {
                rowType: "ITEM",
                majorFinalOutput: "PPA Two",
                ppaName: "PPA Two",
                targetOutput: 20,
                actualOutput: 18,
            },
        ],
        "Q3",
        true
    );

    assert.equal(parsed.error, undefined);
    assert.ok(Array.isArray(parsed.value));

    assert.equal(
        parsed.value.filter((row) => row.rowType === "ITEM").length,
        2
    );

    assert.equal(
        parsed.value.find((row) => row.majorFinalOutput === "PPA One")?.actualOutput,
        8
    );

    assert.equal(
        parsed.value.find((row) => row.majorFinalOutput === "PPA Two")?.actualOutput,
        18
    );
});

test("LBAC5 preserves MAIN and GROUP rows supplied by LBAC3", () => {
    const parsed = parseLbac5Rows(
        [
            {
                rowType: "MAIN",
                majorFinalOutput: "GENERAL MANAGEMENT & ADMINISTRATION",
            },
            {
                rowType: "GROUP",
                majorFinalOutput: "Medical Services",
                categoryName: "Medical Services",
            },
            {
                rowType: "ITEM",
                majorFinalOutput: "Admission",
                ppaName: "Admission",
                targetOutput: 750,
                actualOutput: 566,
                weight: 10,
            },
        ],
        null,
        [],
        "Q3",
        true
    );

    assert.equal(parsed.error, undefined);

    assert.deepEqual(
        parsed.value.map((row) => row.rowType),
        ["MAIN", "GROUP", "ITEM"]
    );
});

test("LBAC5 submission status remains unchanged by the source-of-truth rule", () => {
    assert.equal(
        resolveSubmissionStatus({
            currentStatus: "DRAFT",
            submissionAction: "SUBMIT",
            isAdmin: false,
        }),
        "SUBMITTED"
    );

    assert.equal(
        resolveSubmissionStatus({
            currentStatus: "RETURNED",
            submissionAction: "SUBMIT",
            isAdmin: false,
        }),
        "RESUBMITTED"
    );
});