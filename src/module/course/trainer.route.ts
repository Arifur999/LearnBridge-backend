import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyTrainer } from "../../middlewares/role";
import { createCourseController, getSingleCourseController,  } from "./course.controller";


const router = Router();

router.post(
  "/courses",
  verifyToken,
  verifyTrainer,
  createCourseController
);
router.get("/:id", getSingleCourseController);

export default router;
