import {Router} from "express";
import { login, changePassword, getSession } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/session", protect, getSession);
authRouter.post("/change-password", protect, changePassword);

export default authRouter;
