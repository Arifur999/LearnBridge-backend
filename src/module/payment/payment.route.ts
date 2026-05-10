import { Router } from "express";
import express from "express";
import { verifyToken } from "../../middlewares/verifyToken";
import { verifyStudent, verifyTrainer, verifyAdmin } from "../../middlewares/role";
import { PaymentController } from "./payment.controller";

const router = Router();

// ⚠️ Webhook MUST use raw body — registered before express.json() in app.ts
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.handleStripeWebhookController
);

// Student: create Stripe checkout session for a booking
router.post(
  "/booking/:bookingId",
  verifyToken,
  verifyStudent,
  PaymentController.createBookingPaymentController
);

// Student: verify checkout session after redirect
router.get(
  "/verify/:sessionId",
  verifyToken,
  verifyStudent,
  PaymentController.verifyPaymentSessionController
);

// Student: view own payment history
router.get(
  "/",
  verifyToken,
  verifyStudent,
  PaymentController.getMyPaymentsController
);

// Tutor: view payments earned from their sessions
router.get(
  "/tutor",
  verifyToken,
  verifyTrainer,
  PaymentController.getTutorPaymentsController
);

export default router;
