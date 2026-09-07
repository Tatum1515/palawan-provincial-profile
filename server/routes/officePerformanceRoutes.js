import express from "express";

import {
    createOfficePerformance,
    getOfficePerformance,
    getOfficePerformanceById,
    updateOfficePerformance,
    deleteOfficePerformance,
    listResponsiblePersons,
    getMyOffice,
    approveOfficePerformance,
    denyOfficePerformance,
    validateOfficePerformance,
    getPerformanceSummary,
} from "../controllers/officePerformanceController.js";

import {
    protect,
    protectAdmin,
    protectRoles,
} from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/my-office", getMyOffice);
router.get("/summary", getPerformanceSummary);
router.get("/mine/summary", getPerformanceSummary);

router.get(
    "/responsible-persons",
    protectAdmin,
    listResponsiblePersons
);

router.get("/", getOfficePerformance);
router.get("/:id", getOfficePerformanceById);

// Only the Encoder/User creates the performance data.
router.post(
    "/",
    protectRoles("EMPLOYEE"),
    createOfficePerformance
);

// Only the original Encoder/User may edit their own submission.
router.put(
    "/:id",
    protectRoles("EMPLOYEE"),
    updateOfficePerformance
);

// Department Head approves or returns the same user-submitted record.
router.patch(
    "/:id/approve",
    protectRoles("DEPARTMENT_HEAD"),
    approveOfficePerformance
);

router.patch(
    "/:id/deny",
    protectRoles("DEPARTMENT_HEAD"),
    denyOfficePerformance
);

// PPDO/Admin only validates an already approved submission.
// It does NOT create or re-encode the performance data.
router.patch(
    "/:id/validate",
    protectAdmin,
    validateOfficePerformance
);

router.delete(
    "/:id",
    protectAdmin,
    deleteOfficePerformance
);

export default router;
