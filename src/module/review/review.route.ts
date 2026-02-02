import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyStudent } from "../../middlewares/role";
import { ReviewController } from "./review.controller";

const router = Router();

router.post(
  "/",
  verifyToken,
  verifyStudent,
  ReviewController.addReviewController
);

export default router;