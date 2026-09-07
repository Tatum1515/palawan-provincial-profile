import {Router} from "express";
import { login, changePassword, getSession } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { loginRateLimit } from "../middleware/rateLimit.js";

const authRouter = Router();

authRouter.post("/login", loginRateLimit, login);
authRouter.get("/session", protect, getSession);
authRouter.post("/change-password", protect, changePassword);

export default authRouter;
