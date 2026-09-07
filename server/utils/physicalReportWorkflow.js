/**
 * Physical Report workflow/state rules.
 *
 * This module is the single source of truth for status names, frozen/editable
 * states, review eligibility, and the allowed workflow transitions used by
 * physicalReportController.js. Keep business rules here rather than copying
 * status arrays throughout controllers.
 */

export const PHYSICAL_REPORT_STATUSES = Object.freeze([
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "RETURNED",
    "RESUBMITTED",
    "APPROVED",
    "APPROVED_BY_HEAD",
    "APPROVED_BY_ADMIN",
    "VALIDATED",
    "COMPLETED",
    "PENDING",
    "DENIED",
]);

export const FROZEN_STATUSES = Object.freeze([
    "APPROVED",
    "VALIDATED",
    "COMPLETED",
    "APPROVED_BY_HEAD",
    "APPROVED_BY_ADMIN",
]);

export const EDITABLE_STATUSES = Object.freeze([
    "DRAFT",
    "RETURNED",
    "DENIED",
]);

export const REVIEWABLE_STATUSES = Object.freeze([
    "SUBMITTED",
    "UNDER_REVIEW",
    "RESUBMITTED",
    "PENDING",
]);

export const LBAC3_TEMPLATE_STATUSES = Object.freeze([
    "SUBMITTED",
    "UNDER_REVIEW",
    "RESUBMITTED",
    "APPROVED",
    "VALIDATED",
    "COMPLETED",
    "PENDING",
    "APPROVED_BY_HEAD",
]);

// Action-specific transition rules. These intentionally preserve the current
// application's workflow behavior while putting the allowed source states in
// one place.
export const WORKFLOW_TRANSITIONS = Object.freeze({
    SUBMIT: Object.freeze({
        DRAFT: "SUBMITTED",
        RETURNED: "RESUBMITTED",
        DENIED: "RESUBMITTED",
    }),
    REVIEW: Object.freeze({
        SUBMITTED: "UNDER_REVIEW",
        RESUBMITTED: "UNDER_REVIEW",
        PENDING: "UNDER_REVIEW",
    }),
    DEPARTMENT_HEAD_APPROVE: Object.freeze({
        SUBMITTED: "APPROVED",
        UNDER_REVIEW: "APPROVED",
        RESUBMITTED: "APPROVED",
        PENDING: "APPROVED",
    }),
    ADMIN_APPROVE: Object.freeze({
        SUBMITTED: "APPROVED_BY_ADMIN",
        UNDER_REVIEW: "APPROVED_BY_ADMIN",
        RESUBMITTED: "APPROVED_BY_ADMIN",
        PENDING: "APPROVED_BY_ADMIN",
    }),
    RETURN: Object.freeze({
        SUBMITTED: "RETURNED",
        UNDER_REVIEW: "RETURNED",
        RESUBMITTED: "RETURNED",
        PENDING: "RETURNED",
    }),
    VALIDATE: Object.freeze({
        APPROVED: "VALIDATED",
        APPROVED_BY_HEAD: "VALIDATED",
        APPROVED_BY_ADMIN: "VALIDATED",
    }),
});

const normalized = (status) => String(status || "").trim().toUpperCase();

export const freezeStatus = (status) =>
    FROZEN_STATUSES.includes(normalized(status));

export const editableStatus = (status) =>
    EDITABLE_STATUSES.includes(normalized(status));

export const activeReviewStatus = (status) =>
    REVIEWABLE_STATUSES.includes(normalized(status));

export const isKnownPhysicalReportStatus = (status) =>
    PHYSICAL_REPORT_STATUSES.includes(normalized(status));

export const transitionFor = (action, currentStatus) =>
    WORKFLOW_TRANSITIONS[action]?.[normalized(currentStatus)] || null;

export const canTransition = (currentStatus, nextStatus, action) =>
    transitionFor(action, currentStatus) === normalized(nextStatus);

export const resolveSubmissionStatus = ({ currentStatus, submissionAction, isAdmin = false }) => {
    const action = normalized(submissionAction);

    if (action === "DRAFT") return "DRAFT";

    const current = normalized(currentStatus);
    if (current === "RETURNED" || current === "DENIED") return "RESUBMITTED";

    // Preserve the existing admin maintenance behavior: an ADMIN may reopen
    // a frozen report for correction, and submitting that correction starts a
    // fresh SUBMITTED cycle. Normal office users cannot edit frozen reports.
    if (isAdmin && FROZEN_STATUSES.includes(current)) return "SUBMITTED";

    if (current === "DRAFT") return "SUBMITTED";
    if (REVIEWABLE_STATUSES.includes(current)) return "SUBMITTED";

    return "SUBMITTED";
};

export const statusListForQuery = () => [...PHYSICAL_REPORT_STATUSES];
