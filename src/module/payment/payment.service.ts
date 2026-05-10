import Stripe from "stripe";
import { stripe } from "../../config/stripe.config";
import { prisma } from "../../lib/prisma";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ── Create Stripe checkout session for a booking ──────────────────────────────
const createBookingCheckoutSession = async (
  studentId: string,
  bookingId: string
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      slot: {
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              trainerProfile: { select: { hourlyRate: true, subjects: true } },
            },
          },
        },
      },
      student: { select: { name: true, email: true } },
    },
  });

  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (booking.studentId !== studentId) throw new Error("FORBIDDEN");
  if (booking.status === "CANCELLED") throw new Error("BOOKING_CANCELLED");

  // Check if already paid
  const existingPayment = await (prisma.payment as any).findUnique({
    where: { bookingId },
  });
  if (existingPayment && existingPayment.status === "COMPLETED") {
    throw new Error("ALREADY_PAID");
  }

  const tutorName = booking.slot.trainer.name;
  const hourlyRate = booking.slot.trainer.trainerProfile?.hourlyRate ?? 0;
  const amount = booking.price > 0 ? booking.price : hourlyRate;
  const amountInCents = Math.round(amount * 100);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: booking.student.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountInCents,
          product_data: {
            name: `Tutoring Session with ${tutorName}`,
            description: `Date: ${booking.slot.date} | Time: ${booking.slot.startTime} - ${booking.slot.endTime}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId,
      studentId,
    },
    success_url: `${FRONTEND_URL}/dashboard/bookings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/dashboard/bookings?payment=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 35 * 60, // 35 minutes
  });

  // Upsert payment record
  await (prisma.payment as any).upsert({
    where: { bookingId },
    update: {
      stripeSessionId: session.id,
      amount,
      status: "PENDING",
    },
    create: {
      studentId,
      bookingId,
      amount,
      currency: "usd",
      stripeSessionId: session.id,
      status: "PENDING",
    },
  });

  return { url: session.url, sessionId: session.id };
};

// ── Verify a checkout session ─────────────────────────────────────────────────
const verifyPaymentSession = async (sessionId: string, studentId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const payment = await (prisma.payment as any).findUnique({
    where: { stripeSessionId: sessionId },
    include: { booking: true },
  });

  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.studentId !== studentId) throw new Error("FORBIDDEN");

  if (session.payment_status === "paid" && payment.status !== "COMPLETED") {
    await (prisma.payment as any).update({
      where: { stripeSessionId: sessionId },
      data: {
        status: "COMPLETED",
        stripePaymentIntentId: session.payment_intent as string,
      },
    });
  }

  return {
    paymentStatus: payment.status === "COMPLETED" ? "COMPLETED" : session.payment_status,
    booking: payment.booking,
  };
};

// ── Stripe webhook handler ────────────────────────────────────────────────────
const handleStripeWebhook = async (rawBody: Buffer, signature: string) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new Error("INVALID_WEBHOOK_SIGNATURE");
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { bookingId } = session.metadata ?? {};

      if (!bookingId) break;

      // Idempotency check
      const existing = await (prisma.payment as any).findUnique({
        where: { bookingId },
      });
      if (existing?.status === "COMPLETED") break;

      await (prisma.payment as any).update({
        where: { bookingId },
        data: {
          status: "COMPLETED",
          stripePaymentIntentId: session.payment_intent as string,
        },
      });
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { bookingId } = session.metadata ?? {};
      if (!bookingId) break;

      await (prisma.payment as any).updateMany({
        where: { bookingId, status: "PENDING" },
        data: { status: "FAILED" },
      });
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await (prisma.payment as any).updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: "FAILED" },
      });
      break;
    }
  }
};

// ── Student: get own payments ─────────────────────────────────────────────────
const getMyPaymentsFromDB = async (studentId: string) => {
  return (prisma.payment as any).findMany({
    where: { studentId },
    include: {
      booking: {
        include: {
          slot: {
            include: {
              trainer: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// ── Tutor: get payments for their sessions ────────────────────────────────────
const getTutorPaymentsFromDB = async (tutorId: string) => {
  return (prisma.payment as any).findMany({
    where: {
      status: "COMPLETED",
      booking: {
        slot: { trainerId: tutorId },
      },
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      booking: {
        include: { slot: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// ── Admin: get all payments with pagination ───────────────────────────────────
const getAllPaymentsFromDB = async (filters: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const { status, page = 1, limit = 10 } = filters;
  const where: any = {};
  if (status) where.status = status;

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    (prisma.payment as any).findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true } },
        booking: {
          include: {
            slot: {
              include: {
                trainer: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    (prisma.payment as any).count({ where }),
  ]);

  return {
    payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const PaymentService = {
  createBookingCheckoutSession,
  verifyPaymentSession,
  handleStripeWebhook,
  getMyPaymentsFromDB,
  getTutorPaymentsFromDB,
  getAllPaymentsFromDB,
};
