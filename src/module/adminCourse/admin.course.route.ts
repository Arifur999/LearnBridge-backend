import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyAdmin } from "../../middlewares/role";
import { approveCourseController, getPendingCoursesController, rejectCourseController } from "./admin.course.controller";


const router = Router();

router.get(
  "/courses/pending",
  verifyToken,
  verifyAdmin,
  getPendingCoursesController
);

router.patch(
  "/courses/:courseId/approve",
  verifyToken,
  verifyAdmin,
  approveCourseController
);

router.patch(
  "/courses/:courseId/reject",
  verifyToken,
  verifyAdmin,
  rejectCourseController
);

export default router;
