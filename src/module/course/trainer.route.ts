import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyTrainer } from "../../middlewares/role";
import {
  createCourseController,
  getTrainerCoursesController,
  updateCourseController,
  deleteCourseController,
  getSingleCourseController,
} from "./course.controller";

const router = Router();

// Static routes first
router.get("/courses", verifyToken, verifyTrainer, getTrainerCoursesController);
router.post("/courses", verifyToken, verifyTrainer, createCourseController);
router.patch("/courses/:id", verifyToken, verifyTrainer, updateCourseController);
router.delete("/courses/:id", verifyToken, verifyTrainer, deleteCourseController);

// Dynamic route last (public — no auth required)
router.get("/:id", getSingleCourseController);

export default router;
