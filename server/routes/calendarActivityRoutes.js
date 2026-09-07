import express from "express";
import { protect } from "../middleware/auth.js";
import {
    listActivities,
    createActivity,
    updateActivity,
    deleteActivity,
} from "../controllers/calendarActivityController.js";

const router = express.Router();

router.use(protect);
router.get("/", listActivities);
router.post("/", createActivity);
router.put("/:id", updateActivity);
router.delete("/:id", deleteActivity);

export default router;
