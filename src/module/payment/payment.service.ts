import Stripe from "stripe";
import { stripe } from "../../config/stripe.config";
import { prisma } from "../../lib/prisma";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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

  if (amountInCents < 50) throw new Error("INVALID_AMOUNT");

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
    metadata: { bookingId, studentId },
    success_url: `${FRONTEND_URL}/dashboard/bookings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/dashboard/bookings?payment=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
  });

  await (prisma.payment as any).upsert({
    where: { bookingId },
    update: { stripeSessionId: session.id, amount, status: "PENDING" },
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

      const existing = await (prisma.payment as any).findUnique({ where: { bookingId } });
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

const getTutorPaymentsFromDB = async (tutorId: string) => {
  return (prisma.payment as any).findMany({
    where: {
      status: "COMPLETED",
      booking: { slot: { trainerId: tutorId } },
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      booking: { include: { slot: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

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

const STRIPE_TEST_TOKENS: Record<string, string> = {
  "4242424242424242": "tok_visa",
  "4000056655665556": "tok_visa_debit",
  "5555555555554444": "tok_mastercard",
  "2223003122003222": "tok_mastercard",
  "5200828282828210": "tok_mastercard_debit",
  "5105105105105100": "tok_mastercard_prepaid",
  "378282246310005":  "tok_amex",
  "371449635398431":  "tok_amex",
  "6011111111111117": "tok_discover",
  "6011000990139424": "tok_discover",
  "3056930009020004": "tok_diners",
  "36227206271667":   "tok_diners",
  "3566002020360505": "tok_jcb",
  "6200000000000005": "tok_unionpay",
  "4000000000000002": "tok_chargeDeclined",
  "4000000000009995": "tok_chargeDeclinedInsufficientFunds",
  "4000000000009987": "tok_chargeDeclinedLostCard",
  "4000000000009979": "tok_chargeDeclinedStolenCard",
  "4100000000000019": "tok_chargeDeclinedFraudulent",
};

const chargeCard = async (
  studentId: string,
  slotId: string,
  card: { number: string; exp_month: number; exp_year: number; cvc: string }
) => {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: {
      trainer: { include: { trainerProfile: { select: { hourlyRate: true } } } },
    },
  });
  if (!slot) throw new Error("Slot not found");
  if (slot.isBooked) throw new Error("This slot is already booked");

  const amount = slot.trainer.trainerProfile?.hourlyRate ?? 0;

  if (amount <= 0) {
    const booking = await prisma.booking.create({
      data: { slotId, studentId, price: 0, status: "CONFIRMED" },
    });
    await prisma.slot.update({ where: { id: slotId }, data: { isBooked: true } });
    return { bookingId: booking.id };
  }

  const amountInCents = Math.round(amount * 100);
  const rawNumber = card.number.replace(/\s/g, "");

  const token = STRIPE_TEST_TOKENS[rawNumber];
  if (!token) {
    throw new Error("Invalid card number. Please check your card details and try again.");
  }

  let charge: Stripe.Charge;
  try {
    charge = await stripe.charges.create({
      amount: amountInCents,
      currency: "usd",
      source: token,
      description: "LearnBridge tutoring session",
    });
  } catch (err: any) {
    throw new Error(err?.message ?? "Card was declined.");
  }

  if (charge.status !== "succeeded") {
    throw new Error("Payment failed. Card was declined.");
  }

  const booking = await prisma.booking.create({
    data: { slotId, studentId, price: amount, status: "CONFIRMED" },
  });
  await prisma.slot.update({ where: { id: slotId }, data: { isBooked: true } });

  await (prisma.payment as any).create({
    data: {
      studentId,
      bookingId: booking.id,
      amount,
      currency: "usd",
      stripePaymentIntentId: charge.payment_intent as string ?? charge.id,
      status: "COMPLETED",
    },
  });

  return { bookingId: booking.id };
};

export const PaymentService = {
  createBookingCheckoutSession,
  verifyPaymentSession,
  handleStripeWebhook,
  getMyPaymentsFromDB,
  getTutorPaymentsFromDB,
  getAllPaymentsFromDB,
  chargeCard,
};
