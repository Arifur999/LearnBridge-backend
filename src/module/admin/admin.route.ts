import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyAdmin } from "../../middlewares/role";
import { approveTrainerController, getPendingTrainersController } from "./admin.controller";


const router = Router();

router.get(
  "/trainers/pending",
  verifyToken,
  verifyAdmin,
  getPendingTrainersController
);

router.patch(
  "/trainers/:trainerId/approve",
  verifyToken,
  verifyAdmin,
  approveTrainerController
);

export default router;
