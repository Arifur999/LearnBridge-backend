import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { login, register, getMe } from "./auth.controller";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/me", verifyToken, getMe);

export default authRouter;
