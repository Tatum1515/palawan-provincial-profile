import { Router } from "express";
import { protect } from "../middleware/auth";
import { clockInout, getAttendance } from "../controllers/attendanceController";

const attendanceRouter = Router();

attendanceRouter.post('/', protect, clockInout)
attendanceRouter.post('/', protect, getAttendance)

export default attendanceRouter;
