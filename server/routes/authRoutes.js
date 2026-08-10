import {Router} from "express";
import {login, changePassword, session} from "../controllers/authController.js";

const authRouter = Router();

authRouter.get("/login", login);
authRouter.post("/session",protect, getSession);
authRouter.post("/change-password",protect, changePassword);

export default authRouter;
