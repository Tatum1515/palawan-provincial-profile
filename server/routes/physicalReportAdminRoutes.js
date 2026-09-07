import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
    listQuarterSchedules,
    upsertQuarterSchedule,
    getOfficeCompliance,
    getPhysicalDataQuality,
    getPhysicalAuditLogs,
    getValidationQueue,
} from "../controllers/physicalReportAdminController.js";

const router = Router();
router.use(protect);
router.get("/schedules", listQuarterSchedules);
router.put("/schedules/:year/:quarter", upsertQuarterSchedule);
router.get("/compliance", getOfficeCompliance);
router.get("/quality", getPhysicalDataQuality);
router.get("/audit", getPhysicalAuditLogs);
router.get("/validation-queue", getValidationQueue);
export default router;
