import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { getMe, updateProfile } from "./auth.controller";

// Register → POST /api/auth/sign-up/email   (BetterAuth)
// Login    → POST /api/auth/sign-in/email   (BetterAuth)
// Logout   → POST /api/auth/sign-out        (BetterAuth)

const authRouter = Router();

authRouter.get("/me",      verifyToken, getMe);
authRouter.patch("/profile", verifyToken, updateProfile);

export default authRouter;
