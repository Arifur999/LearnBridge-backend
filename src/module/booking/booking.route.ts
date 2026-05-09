import { Router } from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyTrainer, verifyStudent } from "../../middlewares/role";
import { BookingController } from "./booking.controller";

const router = Router();

// Tutor creates an availability slot
router.post("/slots", verifyToken, verifyTrainer, BookingController.createSlotController);

// Student books a slot
router.post("/bookings", verifyToken, verifyStudent, BookingController.createBookingController);

// Student views their own bookings
router.get("/bookings", verifyToken, verifyStudent, BookingController.getMyBookingsController);

// Student or tutor views a single booking
router.get("/bookings/:id", verifyToken, BookingController.getBookingByIdController);

// Tutor marks COMPLETED, student or tutor cancels
router.patch("/bookings/:id", verifyToken, BookingController.updateBookingStatusController);

export default router;
