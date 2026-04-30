import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyStudent } from "../../middlewares/role";
import { getStudentDashboardController } from "./student.dashboard.controller";

const router = Router();

// Get student dashboard
router.get(
  "/dashboard",
  verifyToken,
  verifyStudent,
  getStudentDashboardController
);

export default router;