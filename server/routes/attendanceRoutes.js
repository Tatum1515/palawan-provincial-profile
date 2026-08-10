import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { clockInout, getAttendance } from "../controllers/attendanceController.js";

const attendanceRouter = Router();

attendanceRouter.post('/', protect, clockInout);
attendanceRouter.get('/', protect, getAttendance);

export default attendanceRouter;
