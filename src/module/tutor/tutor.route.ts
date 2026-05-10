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

// ── Tutor-only (authenticated) static routes — MUST come before /:id ────────
// GET /api/v1/tutors/profile/me
router.get("/profile/me", verifyToken, verifyTrainer, getTutorProfileController);

// PUT /api/v1/tutors/profile/me
router.put("/profile/me", verifyToken, verifyTrainer, updateTutorProfileController);

// GET /api/v1/tutors/slots/mine
router.get("/slots/mine", verifyToken, verifyTrainer, getTutorOwnSlotsController);

// GET /api/v1/tutors/sessions/mine
router.get("/sessions/mine", verifyToken, verifyTrainer, getTutorSessionsController);

// ── Public routes (dynamic — registered AFTER static paths) ──────────────────
// GET /api/v1/tutors
router.get("/", getTutors);

// GET /api/v1/tutors/:id/slots  - available slots for booking
router.get("/:id/slots", getPublicTutorSlotsController);

// GET /api/v1/tutors/:id
router.get("/:id", getTutorByIdController);

export default router;
