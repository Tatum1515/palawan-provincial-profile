import { Router } from "express";
import {
    listSubmissionTasks,
    createSubmissionTask,
    updateSubmissionTask,
    deleteSubmissionTask,
} from "../controllers/submissionTaskController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/", listSubmissionTasks);
router.post("/", createSubmissionTask);
router.put("/:id", updateSubmissionTask);
router.delete("/:id", deleteSubmissionTask);

export default router;
