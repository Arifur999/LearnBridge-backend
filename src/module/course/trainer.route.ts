import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyTrainer } from "../../middlewares/role";
import { createCourseController } from "./course.controller";


const router = Router();

router.post(
  "/courses",
  verifyToken,
  verifyTrainer,
  createCourseController
);

export default router;
