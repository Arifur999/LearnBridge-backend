import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyStudent } from "../../middlewares/role";
import { enrollCourseController } from "./enrollment.controller";


const router = Router();

router.post(
  "/courses/:courseId/enroll",
  verifyToken,
  verifyStudent,
  enrollCourseController
);

export default router;
