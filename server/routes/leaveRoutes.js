import { createLeave, getLeaves, updateLeaveStatus } from "../controllers/leaveController.js";
import { protect, protectAdmin } from "../middleware/auth.js";
import { Router } from "express";

const leaveRouter = Router();

leaveRouter.post("/", protect, createLeave);
leaveRouter.get("/", protect, getLeaves);
leaveRouter.post("/:id", protect, protectAdmin, updateLeaveStatus);

export default leaveRouter;
