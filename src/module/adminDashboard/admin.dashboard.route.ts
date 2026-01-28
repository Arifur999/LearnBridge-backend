import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyAdmin } from "../../middlewares/role";
import { getAdminDashboardStatsController } from "./admin.dashboard.controller";


const router = Router();

router.get(
  "/dashboard",
  verifyToken,
  verifyAdmin,
  getAdminDashboardStatsController
);

export default router;
