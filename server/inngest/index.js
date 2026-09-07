import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "ems-monitoring" });

// ======================================================
// NOTE
// ======================================================
//
// The Attendance module (model, controller, routes, and
// frontend pages) has been fully retired, so the
// attendance-specific Inngest functions that used to live
// here (auto-check-out reminder, daily attendance cron)
// were removed along with it.
//
// The Inngest client is kept wired into server.js so future
// background jobs (e.g. deadline reminder emails for
// SubmissionTask) can be added here without re-plumbing the
// /api/inngest route.
// ======================================================

export const functions = [];
