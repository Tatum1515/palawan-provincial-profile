import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { clockInout, getAttendance } from "../controllers/attendanceController.js";

const attendanceRouter = Router();

attendanceRouter.post('/', protect, clockInout)
attendanceRouter.post('/', protect, getAttendance)

export default attendanceRouter;
