import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyTrainer, verifyStudent } from "../../middlewares/role";
import { BookingController } from "./booking.controller";

const router = Router();

router.post(
  "/slots",
  verifyToken,
  verifyTrainer,
  BookingController.createSlotController
);


router.post(
  "/bookings",
  verifyToken,
  verifyStudent,
  BookingController.createBookingController
);

export default router;