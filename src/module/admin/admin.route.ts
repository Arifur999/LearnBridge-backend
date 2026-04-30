import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyAdmin } from "../../middlewares/role";
import { 
  approveTrainerController, 
  getPendingTrainersController,
  getAllUsersController,
  updateUserStatusController,
  getAllBookingsController
} from "./admin.controller";


const router = Router();

// Get all users (admin only)
router.get(
  "/users",
  verifyToken,
  verifyAdmin,
  getAllUsersController
);

// Update user status - ban/unban (admin only)
router.patch(
  "/users/:userId",
  verifyToken,
  verifyAdmin,
  updateUserStatusController
);

// Get all bookings (admin only)
router.get(
  "/bookings",
  verifyToken,
  verifyAdmin,
  getAllBookingsController
);

// Get pending trainers
router.get(
  "/trainers/pending",
  verifyToken,
  verifyAdmin,
  getPendingTrainersController
);

// Approve trainer
router.patch(
  "/trainers/:trainerId/approve",
  verifyToken,
  verifyAdmin,
  approveTrainerController
);

export default router;
