import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyTrainer } from "../../middlewares/role";
import { getTrainerDashboardController } from "./trainer.dashboard.controller";


const router = Router();

router.get(
  "/dashboard",
  verifyToken,
  verifyTrainer,
  getTrainerDashboardController
);

export default router;
