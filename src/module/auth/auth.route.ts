import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { getMe, updateProfile } from "./auth.controller";

const authRouter = Router();

authRouter.get("/me", verifyToken, getMe);
authRouter.patch("/profile", verifyToken, updateProfile);

export default authRouter;
