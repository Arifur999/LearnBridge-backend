import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyAdmin } from "../../middlewares/role";
import {
  approveTrainerController,
  getPendingTrainersController,
  getAllUsersController,
  updateUserStatusController,
  updateUserRoleController,
  getAllBookingsController,
  deleteUserController,
  getFeaturedTutorsController,
  addFeaturedTutorController,
  removeFeaturedTutorController,
} from "./admin.controller";
import { PaymentController } from "../payment/payment.controller";


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
  "/users/:userId/status",
  verifyToken,
  verifyAdmin,
  updateUserStatusController
);

// Update user role (admin only)
router.patch(
  "/users/:userId/role",
  verifyToken,
  verifyAdmin,
  updateUserRoleController
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

// Delete user (admin only)
router.delete(
  "/users/:userId",
  verifyToken,
  verifyAdmin,
  deleteUserController
);

// Featured tutors
router.get("/featured-tutors", verifyToken, verifyAdmin, getFeaturedTutorsController);
router.post("/featured-tutors", verifyToken, verifyAdmin, addFeaturedTutorController);
router.post("/featured-tutors/:tutorId", verifyToken, verifyAdmin, addFeaturedTutorController);
router.patch("/featured-tutors/:tutorId", verifyToken, verifyAdmin, addFeaturedTutorController);
router.delete("/featured-tutors/:tutorId", verifyToken, verifyAdmin, removeFeaturedTutorController);

// Get all payments (admin only)
router.get(
  "/payments",
  verifyToken,
  verifyAdmin,
  PaymentController.getAllPaymentsController
);

export default router;
