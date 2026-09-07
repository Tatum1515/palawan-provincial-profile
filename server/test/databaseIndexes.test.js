import assert from "node:assert/strict";
import test from "node:test";

import PhysicalReport from "../models/PhysicalReport.js";
import OfficePerformance from "../models/OfficePerformance.js";
import Document from "../models/Document.js";
import SubmissionTask from "../models/SubmissionTask.js";
import CalendarActivity from "../models/CalendarActivity.js";

const indexKeys = (schema) =>
    schema.indexes().map(([keys]) => Object.keys(keys).join(","));

const hasIndex = (schema, expected) =>
    schema.indexes().some(([keys]) =>
        Object.entries(expected).every(([key, direction]) => keys[key] === direction)
    );

test("PhysicalReport has a period/status/office index for dashboard queries", () => {
    assert.equal(
        hasIndex(PhysicalReport.schema, {
            year: 1,
            quarter: 1,
            status: 1,
            office: 1,
            formType: 1,
            createdAt: -1,
        }),
        true
    );
});

test("OfficePerformance has a period/status/office index for dashboard queries", () => {
    assert.equal(
        hasIndex(OfficePerformance.schema, {
            year: 1,
            quarter: 1,
            status: 1,
            office: 1,
            createdAt: -1,
        }),
        true
    );
});

test("Document has a submission period/status/office index", () => {
    assert.equal(
        hasIndex(Document.schema, {
            kind: 1,
            year: 1,
            quarter: 1,
            status: 1,
            office: 1,
            createdAt: -1,
        }),
        true
    );
});

test("SubmissionTask has a due-date lookup index", () => {
    assert.equal(
        hasIndex(SubmissionTask.schema, {
            year: 1,
            active: 1,
            office: 1,
            dueDate: 1,
        }),
        true
    );
});

test("CalendarActivity has a visibility/start-time lookup index", () => {
    assert.equal(
        hasIndex(CalendarActivity.schema, {
            visibility: 1,
            startAt: 1,
        }),
        true
    );
});
