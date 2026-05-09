import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyStudent } from "../../middlewares/role";
import { ReviewController } from "./review.controller";

const router = Router();

// POST /api/v1/reviews - student leaves a review for a tutor
router.post(
  "/",
  verifyToken,
  verifyStudent,
  ReviewController.addReviewController
);

// GET /api/v1/reviews/tutor/:tutorId - public - get all reviews for a tutor
router.get("/tutor/:tutorId", ReviewController.getReviewsByTutorController);

export default router;
