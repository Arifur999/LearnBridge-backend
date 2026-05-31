import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyTrainer } from "../../middlewares/role";
import {
  getTutors,
  getTutorByIdController,
  getPublicTutorSlotsController,
  getTutorProfileController,
  updateTutorProfileController,
  getTutorOwnSlotsController,
  getTutorSessionsController,
} from "./tutor.controller";

const router = Router();

// Authenticated static routes — must come before /:id
router.get("/profile/me", verifyToken, verifyTrainer, getTutorProfileController);
router.put("/profile/me", verifyToken, verifyTrainer, updateTutorProfileController);
router.get("/slots/mine", verifyToken, verifyTrainer, getTutorOwnSlotsController);
router.get("/sessions/mine", verifyToken, verifyTrainer, getTutorSessionsController);

// Public routes (dynamic — after static paths)
router.get("/", getTutors);
router.get("/:id/slots", getPublicTutorSlotsController);
router.get("/:id", getTutorByIdController);

export default router;
