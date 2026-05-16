import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/verifyToken";
import { PaymentService } from "./payment.service";

// POST /api/v1/payments/booking/:bookingId
const createBookingPaymentController = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.userId;
    const { bookingId } = req.params;

    const result = await PaymentService.createBookingCheckoutSession(studentId, bookingId!);

    res.status(201).json({
      success: true,
      message: "Checkout session created",
      data: result,
    });
  } catch (error: any) {
    if (error.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (error.message === "BOOKING_CANCELLED") {
      return res.status(400).json({ success: false, message: "Cannot pay for a cancelled booking" });
    }
    if (error.message === "ALREADY_PAID") {
      return res.status(409).json({ success: false, message: "This booking has already been paid" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/payments/verify/:sessionId
const verifyPaymentSessionController = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.userId;
    const { sessionId } = req.params;

    const result = await PaymentService.verifyPaymentSession(sessionId!, studentId);

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === "PAYMENT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Payment session not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/v1/payments/webhook  (raw body — no JSON parsing)
const handleStripeWebhookController = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    return res.status(400).json({ success: false, message: "Missing stripe-signature header" });
  }

  try {
    await PaymentService.handleStripeWebhook(req.body as Buffer, signature);
    res.status(200).json({ received: true });
  } catch (error: any) {
    if (error.message === "INVALID_WEBHOOK_SIGNATURE") {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

// GET /api/v1/payments  — student sees their own payments
const getMyPaymentsController = async (req: AuthRequest, res: Response) => {
  try {
    const result = await PaymentService.getMyPaymentsFromDB(req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/payments/tutor  — tutor sees payments for their sessions
const getTutorPaymentsController = async (req: AuthRequest, res: Response) => {
  try {
    const result = await PaymentService.getTutorPaymentsFromDB(req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/v1/admin/payments  — admin sees all payments
const getAllPaymentsController = async (req: Request, res: Response) => {
  try {
    const { status, page, limit } = req.query;

    const result = await PaymentService.getAllPaymentsFromDB({
      status: status as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const PaymentController = {
  createBookingPaymentController,
  verifyPaymentSessionController,
  handleStripeWebhookController,
  getMyPaymentsController,
  getTutorPaymentsController,
  getAllPaymentsController,
};
