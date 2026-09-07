import express from "express";
import { sendApiError } from "./utils/apiResponse.js";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";

dotenv.config({ path: new URL(".env", import.meta.url) });

import connectDB from "./config/db.js";

// ======================================================
// ROUTES
// ======================================================

import authRouter from "./routes/authRoutes.js";
import employeesRouter from "./routes/employeesRoutes.js";
import profileRouter from "./routes/profileRoutes.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import documentRouter from "./routes/documentRoutes.js";
import monitoringSummaryRoutes from "./routes/monitoringSummaryRoutes.js";

// CENTRAL PERFORMANCE ROUTE
import officePerformanceRoutes from "./routes/officePerformanceRoutes.js";
import physicalReportRoutes from "./routes/physicalReportRoutes.js";
import physicalReportAdminRoutes from "./routes/physicalReportAdminRoutes.js";
import submissionTaskRoutes from "./routes/submissionTaskRoutes.js";
import calendarActivityRoutes from "./routes/calendarActivityRoutes.js";

// ======================================================
// INNGEST
// ======================================================

import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";

// ======================================================
// APP
// ======================================================

const app = express();

const PORT = process.env.PORT || 4000;

// ======================================================
// SECURITY HEADERS
// ======================================================
//
// This is a pure JSON/file API (no server-rendered HTML), so the
// default HTML-oriented Content-Security-Policy is disabled to
// avoid affecting API responses or file downloads. Cross-Origin
// Resource Policy is relaxed to "cross-origin" since the frontend
// is deployed separately from the API and downloads documents via
// authenticated requests.

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// ======================================================
// MIDDLEWARE
// ======================================================
//
// CORS is restricted to CLIENT_URL in production. If
// CLIENT_URL is not set (e.g. local development), all
// origins are allowed so `npm run dev` keeps working
// without extra setup.

const configuredOrigins = String(process.env.CLIENT_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || configuredOrigins.length === 0 || configuredOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Origin is not allowed by CORS."));
        },
        credentials: true,
    })
);

app.use(express.json());

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "PPDO Monitoring System API is running.",
    });
});

app.get("/health", (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({
        success: ready,
        api: "ok",
        database: ready ? "connected" : "disconnected",
    });
});

// ======================================================
// API ROUTES
// ======================================================

app.use(
    "/api/auth",
    authRouter
);

app.use(
    "/api/employees",
    employeesRouter
);

app.use(
    "/api/profile",
    profileRouter
);

app.use(
    "/api/dashboard",
    dashboardRouter
);

app.use(
    "/api/documents",
    documentRouter
);

app.use(
    "/api/monitoringSummary",
    monitoringSummaryRoutes
);

// ======================================================
// CENTRAL PERFORMANCE API
// ======================================================
//
// USER + ADMIN USE THE SAME PERFORMANCE SYSTEM.
//
// Base URL:
//
// /api/officePerformance
//
// Examples:
//
// GET
// /api/officePerformance
//
// POST
// /api/officePerformance
//
// GET
// /api/officePerformance/:id
//
// PUT
// /api/officePerformance/:id
//
// PATCH
// /api/officePerformance/:id/approve
//
// PATCH
// /api/officePerformance/:id/deny
//
// DELETE
// /api/officePerformance/:id
//
// USER:
//
// GET
// /api/officePerformance/my-office
//
// GET
// /api/officePerformance/mine/summary
//
// ADMIN:
//
// GET
// /api/officePerformance/summary
//
// ======================================================

app.use(
    "/api/officePerformance",
    officePerformanceRoutes
);

app.use(
    "/api/physical-reports",
    physicalReportRoutes
);

app.use(
    "/api/physical-report-admin",
    physicalReportAdminRoutes
);

app.use(
    "/api/submission-tasks",
    submissionTaskRoutes
);

app.use(
    "/api/calendar-activities",
    calendarActivityRoutes
);

// ======================================================
// INNGEST
// ======================================================

app.use(
    "/api/inngest",
    serve({
        client: inngest,
        functions,
    })
);

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);

    const status = Number(err?.status) || 500;
    const code = err?.code && typeof err.code === "string" && !/^\d+$/.test(err.code)
        ? err.code
        : undefined;

    return sendApiError(res, status, err?.message, {
        code,
        details: process.env.NODE_ENV === "production" ? undefined : err?.details,
    });
});

// ======================================================
// DATABASE + SERVER STARTUP
// ======================================================

const startServer = async () => {
    try {
        await connectDB();

        app.listen(
            PORT,
            () => {
                console.log(
                    `Server is running on port ${PORT}`
                );
            }
        );
    } catch (error) {
        console.error(
            "Failed to start server:",
            error
        );

        process.exit(1);
    }
};

startServer();