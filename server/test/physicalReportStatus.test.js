import test from "node:test";
import assert from "node:assert/strict";
import {
    freezeStatus,
    editableStatus,
    activeReviewStatus,
} from "../controllers/physicalReportController.js";
import {
    isWindowOpen,
    scheduleState,
    quarterWindowAllowsWrite,
} from "../utils/quarterSchedule.js";
import {
    parseExpectedUpdatedAt,
    sameTimestamp,
} from "../utils/optimisticConcurrency.js";

test("freezeStatus identifies terminal/frozen report states", () => {
    for (const status of ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN"]) {
        assert.equal(freezeStatus(status), true, status);
    }
    for (const status of ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "DENIED"]) {
        assert.equal(freezeStatus(status), false, status);
    }
});

test("editableStatus allows only draft and returned/denied reports", () => {
    assert.equal(editableStatus("DRAFT"), true);
    assert.equal(editableStatus("RETURNED"), true);
    assert.equal(editableStatus("DENIED"), true);

    for (const status of ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "VALIDATED", "COMPLETED"]) {
        assert.equal(editableStatus(status), false, status);
    }
});

test("activeReviewStatus identifies statuses eligible for review actions", () => {
    for (const status of ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "PENDING"]) {
        assert.equal(activeReviewStatus(status), true, status);
    }
    for (const status of ["DRAFT", "RETURNED", "DENIED", "APPROVED", "VALIDATED", "COMPLETED"]) {
        assert.equal(activeReviewStatus(status), false, status);
    }
});


test("quarter schedule allows writes only inside an enabled window", () => {
    const schedule = {
        enabled: true,
        openAt: new Date("2026-07-01T00:00:00.000Z"),
        closeAt: new Date("2026-09-30T23:59:59.000Z"),
    };

    assert.equal(isWindowOpen(schedule, new Date("2026-07-01T00:00:00.000Z")), true);
    assert.equal(isWindowOpen(schedule, new Date("2026-09-30T23:59:59.000Z")), true);
    assert.equal(quarterWindowAllowsWrite(schedule, new Date("2026-06-30T23:59:59.000Z")), false);
    assert.equal(quarterWindowAllowsWrite(schedule, new Date("2026-10-01T00:00:00.000Z")), false);
});

test("disabled, invalid, or missing quarter schedules are never treated as open", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");

    assert.equal(isWindowOpen(null, now), false);
    assert.equal(isWindowOpen({ enabled: false, openAt: now, closeAt: new Date("2026-09-01T00:00:00.000Z") }, now), false);
    assert.equal(isWindowOpen({ enabled: true, openAt: "invalid", closeAt: new Date("2026-09-01T00:00:00.000Z") }, now), false);

    assert.equal(scheduleState(null, now), "NOT_CONFIGURED");
    assert.equal(scheduleState({ enabled: false, openAt: now, closeAt: new Date("2026-09-01T00:00:00.000Z") }, now), "NOT_CONFIGURED");
});


test("optimistic concurrency accepts the exact report version", () => {
    const version = "2026-08-31T10:15:30.000Z";
    const parsed = parseExpectedUpdatedAt(version);

    assert.equal(parsed.provided, true);
    assert.equal(parsed.error, undefined);
    assert.equal(sameTimestamp(version, parsed.date), true);
});

test("optimistic concurrency rejects a stale report version", () => {
    const current = "2026-08-31T10:15:30.000Z";
    const stale = "2026-08-31T10:14:30.000Z";

    assert.equal(sameTimestamp(current, stale), false);
});

test("optimistic concurrency rejects missing or invalid report versions", () => {
    const missing = parseExpectedUpdatedAt("");
    const invalid = parseExpectedUpdatedAt("not-a-date");

    assert.equal(missing.provided, false);
    assert.equal(invalid.provided, true);
    assert.equal(invalid.error, "Invalid report version timestamp.");
});
