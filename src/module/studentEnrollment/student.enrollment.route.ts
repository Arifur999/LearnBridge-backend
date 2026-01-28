import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyStudent } from "../../middlewares/role";
import { getMyEnrollmentsController } from "./student.enrollment.controller";


const router = Router();

router.get(
  "/enrollments",
  verifyToken,
  verifyStudent,
  getMyEnrollmentsController
);

export default router;
