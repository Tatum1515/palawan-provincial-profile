import express from "express";
import { getMonitoringSummary } from "../controllers/monitoringSummaryController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.get("/", protect, getMonitoringSummary);
export default router;
