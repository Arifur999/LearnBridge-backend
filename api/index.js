// api/_handler.ts
import "dotenv/config";

// src/app.ts
import express2 from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";

// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";

// src/lib/prisma.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
var connectionString = `${process.env.DATABASE_URL}`;
var adapter = new PrismaPg({ connectionString });
var prisma = new PrismaClient({ adapter });

// src/lib/auth.ts
import { Role, Status } from "@prisma/client";

// src/utils/email.ts
import nodemailer from "nodemailer";
import path from "path";
import ejs from "ejs";

// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();
var env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: process.env.PORT ?? "5000",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:5000",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  EMAIL_SENDER: {
    SMTP_HOST: process.env.SMTP_HOST ?? "smtp.gmail.com",
    SMTP_PORT: process.env.SMTP_PORT ?? "465",
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASS: process.env.SMTP_PASS ?? "",
    SMTP_FROM: process.env.SMTP_FROM ?? "noreply@learnbridge.com"
  },
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? ""
};

// src/utils/email.ts
var transporter = nodemailer.createTransport({
  host: env.EMAIL_SENDER.SMTP_HOST,
  port: Number(env.EMAIL_SENDER.SMTP_PORT),
  secure: true,
  // port 465 = SSL
  auth: {
    user: env.EMAIL_SENDER.SMTP_USER,
    pass: env.EMAIL_SENDER.SMTP_PASS
  }
});
var sendEmail = async ({
  to,
  subject,
  templateName,
  templateData
}) => {
  try {
    const templatePath = path.resolve(
      process.cwd(),
      `src/templates/${templateName}.ejs`
    );
    const html = await ejs.renderFile(templatePath, templateData);
    const info = await transporter.sendMail({
      from: env.EMAIL_SENDER.SMTP_FROM,
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error("Email sending error:", error instanceof Error ? error.message : error);
  }
};

// src/lib/auth.ts
var auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  socialProviders: {
    google: {
      enabled: true,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      mapProfileToUser() {
        return {
          role: Role.STUDENT,
          status: Status.ACTIVE
        };
      }
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: true
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: Role.STUDENT,
        input: true
      },
      status: {
        type: "string",
        required: true,
        defaultValue: Status.ACTIVE
      }
    }
  },
  plugins: [
    bearer(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 5 * 60,
      async sendVerificationOTP({ email, otp, type }) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return;
        if (type === "email-verification") {
          if (!user.emailVerified) {
            sendEmail({
              to: email,
              subject: "Verify your LearnBridge email",
              templateName: "otp",
              templateData: { name: user.name, otp }
            });
          }
        } else if (type === "forget-password") {
          sendEmail({
            to: email,
            subject: "LearnBridge \u2014 Password Reset OTP",
            templateName: "otp",
            templateData: { name: user.name, otp }
          });
        }
      }
    })
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24
    }
  },
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    env.FRONTEND_URL
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookies: {
      sessionToken: {
        attributes: {
          sameSite: "none",
          secure: process.env.NODE_ENV === "production",
          httpOnly: true
        }
      }
    }
  }
});

// src/module/auth/auth.route.ts
import { Router } from "express";

// src/middlewares/verifyToken.ts
import { fromNodeHeaders } from "better-auth/node";
var verifyToken = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });
    if (!session?.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized \u2014 invalid or expired session"
      });
    }
    req.user = {
      userId: session.user.id,
      role: String(session.user.role ?? "STUDENT"),
      status: String(session.user.status ?? "ACTIVE")
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }
};

// src/module/auth/auth.service.ts
var updateUserProfile = async (userId, payload) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...payload.name ? { name: payload.name } : {},
      ...payload.image !== void 0 ? { image: payload.image } : {}
    },
    select: { id: true, name: true, email: true, role: true, status: true }
  });
  return user;
};
var getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      trainerProfile: true
    }
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
};

// src/module/auth/auth.controller.ts
var getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await getCurrentUser(userId);
    res.status(200).json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { name, image } = req.body;
    const user = await updateUserProfile(userId, {
      ...name ? { name } : {},
      ...image !== void 0 ? { image } : {}
    });
    res.status(200).json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// src/module/auth/auth.route.ts
var authRouter = Router();
authRouter.get("/me", verifyToken, getMe);
authRouter.patch("/profile", verifyToken, updateProfile);
var auth_route_default = authRouter;

// src/module/admin/admin.route.ts
import { Router as Router2 } from "express";

// src/middlewares/role.ts
var verifyAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Admin access only"
    });
  }
  next();
};
var verifyTrainer = (req, res, next) => {
  if (req.user?.role !== "TRAINER") {
    return res.status(403).json({
      success: false,
      message: "Trainer access only"
    });
  }
  next();
};
var verifyStudent = (req, res, next) => {
  if (req.user?.role !== "STUDENT") {
    return res.status(403).json({
      success: false,
      message: "Student access only"
    });
  }
  next();
};

// src/module/admin/admin.service.ts
var getPendingTrainers = async () => {
  return prisma.user.findMany({
    where: {
      role: "TRAINER",
      status: "PENDING"
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });
};
var approveTrainerById = async (trainerId) => {
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId }
  });
  if (!trainer || trainer.role !== "TRAINER") {
    throw new Error("NOT_TRAINER");
  }
  if (trainer.status !== "PENDING") {
    throw new Error("NOT_PENDING");
  }
  const updated = await prisma.user.update({
    where: { id: trainerId },
    data: { status: "ACTIVE" }
  });
  return updated;
};
var getAllUsers = async (filters) => {
  const { role, status, search, page = 1, limit = 10 } = filters;
  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } }
    ];
  }
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            courses: true,
            enrollments: true,
            bookings: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.count({ where })
  ]);
  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
var updateUserStatus = async (userId, newStatus) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");
  return prisma.user.update({
    where: { id: userId },
    data: { status: newStatus }
  });
};
var updateUserRole = async (userId, newRole) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");
  return prisma.user.update({
    where: { id: userId },
    data: { role: newRole }
  });
};
var deleteUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");
  await prisma.$transaction(async (tx) => {
    const [courses, slots] = await Promise.all([
      tx.course.findMany({
        where: { trainerId: userId },
        select: { id: true }
      }),
      tx.slot.findMany({
        where: { trainerId: userId },
        select: { id: true }
      })
    ]);
    const courseIds = courses.map((course) => course.id);
    const slotIds = slots.map((slot) => slot.id);
    const bookings = await tx.booking.findMany({
      where: {
        OR: [
          { studentId: userId },
          ...slotIds.length > 0 ? [{ slotId: { in: slotIds } }] : []
        ]
      },
      select: { id: true }
    });
    const bookingIds = bookings.map((booking) => booking.id);
    await tx.payment.deleteMany({
      where: {
        OR: [
          { studentId: userId },
          ...bookingIds.length > 0 ? [{ bookingId: { in: bookingIds } }] : []
        ]
      }
    });
    await tx.review.deleteMany({
      where: {
        OR: [
          { studentId: userId },
          { tutorId: userId },
          ...bookingIds.length > 0 ? [{ bookingId: { in: bookingIds } }] : []
        ]
      }
    });
    if (bookingIds.length > 0) {
      await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    if (slotIds.length > 0) {
      await tx.slot.deleteMany({ where: { id: { in: slotIds } } });
    }
    await tx.enrollment.deleteMany({
      where: {
        OR: [
          { studentId: userId },
          ...courseIds.length > 0 ? [{ courseId: { in: courseIds } }] : []
        ]
      }
    });
    if (courseIds.length > 0) {
      await tx.course.deleteMany({ where: { id: { in: courseIds } } });
    }
    await tx.user.delete({ where: { id: userId } });
  });
  return { id: userId };
};
var getFeaturedTutors = async () => {
  return prisma.trainerProfile.findMany({
    where: { isFeatured: true },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  });
};
var resolveTrainerProfile = async (idOrUserId) => {
  const byId = await prisma.trainerProfile.findUnique({ where: { id: idOrUserId } });
  if (byId) return byId;
  const byUser = await prisma.trainerProfile.findUnique({ where: { userId: idOrUserId } });
  if (byUser) return byUser;
  const user = await prisma.user.findUnique({ where: { id: idOrUserId } });
  if (!user || user.role !== "TRAINER") throw new Error("PROFILE_NOT_FOUND");
  return prisma.trainerProfile.create({ data: { userId: idOrUserId } });
};
var addFeaturedTutor = async (idOrUserId) => {
  const profile = await resolveTrainerProfile(idOrUserId);
  return prisma.trainerProfile.update({
    where: { id: profile.id },
    data: { isFeatured: true }
  });
};
var removeFeaturedTutor = async (idOrUserId) => {
  const profile = await resolveTrainerProfile(idOrUserId).catch(() => null);
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  return prisma.trainerProfile.update({
    where: { id: profile.id },
    data: { isFeatured: false }
  });
};
var getAllBookings = async (filters) => {
  const { status, page = 1, limit = 10 } = filters;
  const where = {};
  if (status) where.status = status;
  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        slot: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.booking.count({ where })
  ]);
  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// src/module/admin/admin.controller.ts
var getPendingTrainersController = async (_req, res) => {
  try {
    const trainers = await getPendingTrainers();
    res.status(200).json({
      success: true,
      data: trainers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
var approveTrainerController = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const trainer = await approveTrainerById(trainerId);
    res.status(200).json({
      success: true,
      message: "Trainer approved successfully",
      data: {
        id: trainer.id,
        email: trainer.email,
        status: trainer.status
      }
    });
  } catch (error) {
    if (error.message === "NOT_TRAINER") {
      return res.status(404).json({
        success: false,
        message: "Trainer not found"
      });
    }
    if (error.message === "NOT_PENDING") {
      return res.status(400).json({
        success: false,
        message: "Trainer is not pending"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
var getAllUsersController = async (req, res) => {
  try {
    const { role, status, search, page, limit } = req.query;
    const result = await getAllUsers({
      role,
      status,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    });
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
var updateUserStatusController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    if (!status || !["ACTIVE", "BLOCKED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be ACTIVE or BLOCKED"
      });
    }
    const user = await updateUserStatus(userId, status);
    res.status(200).json({
      success: true,
      message: `User ${status === "BLOCKED" ? "banned" : "unbanned"} successfully`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
var updateUserRoleController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!role || !["STUDENT", "TRAINER"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be STUDENT or TRAINER"
      });
    }
    const user = await updateUserRole(userId, role);
    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var deleteUserController = async (req, res) => {
  try {
    const { userId } = req.params;
    await deleteUser(userId);
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getFeaturedTutorsController = async (_req, res) => {
  try {
    const tutors = await getFeaturedTutors();
    res.status(200).json({ success: true, data: tutors });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var addFeaturedTutorController = async (req, res) => {
  try {
    const tutorId = req.params.tutorId ?? req.body.tutorId;
    if (!tutorId) {
      return res.status(400).json({ success: false, message: "tutorId is required" });
    }
    const profile = await addFeaturedTutor(tutorId);
    res.status(200).json({ success: true, message: "Tutor added to featured", data: profile });
  } catch (error) {
    if (error.message === "PROFILE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Tutor profile not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var removeFeaturedTutorController = async (req, res) => {
  try {
    const { tutorId } = req.params;
    await removeFeaturedTutor(tutorId);
    res.status(200).json({ success: true, message: "Tutor removed from featured" });
  } catch (error) {
    if (error.message === "PROFILE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Tutor profile not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getAllBookingsController = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await getAllBookings({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    });
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// src/config/stripe.config.ts
import Stripe from "stripe";
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia"
});

// src/module/payment/payment.service.ts
var FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
var createBookingCheckoutSession = async (studentId, bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      slot: {
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              trainerProfile: { select: { hourlyRate: true, subjects: true } }
            }
          }
        }
      },
      student: { select: { name: true, email: true } }
    }
  });
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (booking.studentId !== studentId) throw new Error("FORBIDDEN");
  if (booking.status === "CANCELLED") throw new Error("BOOKING_CANCELLED");
  const existingPayment = await prisma.payment.findUnique({
    where: { bookingId }
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
            description: `Date: ${booking.slot.date} | Time: ${booking.slot.startTime} - ${booking.slot.endTime}`
          }
        },
        quantity: 1
      }
    ],
    metadata: { bookingId, studentId },
    success_url: `${FRONTEND_URL}/dashboard/bookings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/dashboard/bookings?payment=cancelled`,
    expires_at: Math.floor(Date.now() / 1e3) + 35 * 60
  });
  await prisma.payment.upsert({
    where: { bookingId },
    update: { stripeSessionId: session.id, amount, status: "PENDING" },
    create: {
      studentId,
      bookingId,
      amount,
      currency: "usd",
      stripeSessionId: session.id,
      status: "PENDING"
    }
  });
  return { url: session.url, sessionId: session.id };
};
var verifyPaymentSession = async (sessionId, studentId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: sessionId },
    include: { booking: true }
  });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.studentId !== studentId) throw new Error("FORBIDDEN");
  if (session.payment_status === "paid" && payment.status !== "COMPLETED") {
    await prisma.payment.update({
      where: { stripeSessionId: sessionId },
      data: {
        status: "COMPLETED",
        stripePaymentIntentId: session.payment_intent
      }
    });
  }
  return {
    paymentStatus: payment.status === "COMPLETED" ? "COMPLETED" : session.payment_status,
    booking: payment.booking
  };
};
var handleStripeWebhook = async (rawBody, signature) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new Error("INVALID_WEBHOOK_SIGNATURE");
  }
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { bookingId } = session.metadata ?? {};
      if (!bookingId) break;
      const existing = await prisma.payment.findUnique({ where: { bookingId } });
      if (existing?.status === "COMPLETED") break;
      await prisma.payment.update({
        where: { bookingId },
        data: {
          status: "COMPLETED",
          stripePaymentIntentId: session.payment_intent
        }
      });
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      const { bookingId } = session.metadata ?? {};
      if (!bookingId) break;
      await prisma.payment.updateMany({
        where: { bookingId, status: "PENDING" },
        data: { status: "FAILED" }
      });
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: "FAILED" }
      });
      break;
    }
  }
};
var getMyPaymentsFromDB = async (studentId) => {
  return prisma.payment.findMany({
    where: { studentId },
    include: {
      booking: {
        include: {
          slot: {
            include: {
              trainer: { select: { id: true, name: true } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};
var getTutorPaymentsFromDB = async (tutorId) => {
  return prisma.payment.findMany({
    where: {
      status: "COMPLETED",
      booking: { slot: { trainerId: tutorId } }
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      booking: { include: { slot: true } }
    },
    orderBy: { createdAt: "desc" }
  });
};
var getAllPaymentsFromDB = async (filters) => {
  const { status, page = 1, limit = 10 } = filters;
  const where = {};
  if (status) where.status = status;
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true } },
        booking: {
          include: {
            slot: {
              include: {
                trainer: { select: { id: true, name: true } }
              }
            }
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.payment.count({ where })
  ]);
  return {
    payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};
var STRIPE_TEST_TOKENS = {
  "4242424242424242": "tok_visa",
  "4000056655665556": "tok_visa_debit",
  "5555555555554444": "tok_mastercard",
  "2223003122003222": "tok_mastercard",
  "5200828282828210": "tok_mastercard_debit",
  "5105105105105100": "tok_mastercard_prepaid",
  "378282246310005": "tok_amex",
  "371449635398431": "tok_amex",
  "6011111111111117": "tok_discover",
  "6011000990139424": "tok_discover",
  "3056930009020004": "tok_diners",
  "36227206271667": "tok_diners",
  "3566002020360505": "tok_jcb",
  "6200000000000005": "tok_unionpay",
  "4000000000000002": "tok_chargeDeclined",
  "4000000000009995": "tok_chargeDeclinedInsufficientFunds",
  "4000000000009987": "tok_chargeDeclinedLostCard",
  "4000000000009979": "tok_chargeDeclinedStolenCard",
  "4100000000000019": "tok_chargeDeclinedFraudulent"
};
var chargeCard = async (studentId, slotId, card) => {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: {
      trainer: { include: { trainerProfile: { select: { hourlyRate: true } } } }
    }
  });
  if (!slot) throw new Error("Slot not found");
  if (slot.isBooked) throw new Error("This slot is already booked");
  const amount = slot.trainer.trainerProfile?.hourlyRate ?? 0;
  if (amount <= 0) {
    const booking2 = await prisma.booking.create({
      data: { slotId, studentId, price: 0, status: "CONFIRMED" }
    });
    await prisma.slot.update({ where: { id: slotId }, data: { isBooked: true } });
    return { bookingId: booking2.id };
  }
  const amountInCents = Math.round(amount * 100);
  const rawNumber = card.number.replace(/\s/g, "");
  const token = STRIPE_TEST_TOKENS[rawNumber];
  if (!token) {
    throw new Error("Invalid card number. Please check your card details and try again.");
  }
  let charge;
  try {
    charge = await stripe.charges.create({
      amount: amountInCents,
      currency: "usd",
      source: token,
      description: "LearnBridge tutoring session"
    });
  } catch (err) {
    throw new Error(err?.message ?? "Card was declined.");
  }
  if (charge.status !== "succeeded") {
    throw new Error("Payment failed. Card was declined.");
  }
  const booking = await prisma.booking.create({
    data: { slotId, studentId, price: amount, status: "CONFIRMED" }
  });
  await prisma.slot.update({ where: { id: slotId }, data: { isBooked: true } });
  await prisma.payment.create({
    data: {
      studentId,
      bookingId: booking.id,
      amount,
      currency: "usd",
      stripePaymentIntentId: charge.payment_intent ?? charge.id,
      status: "COMPLETED"
    }
  });
  return { bookingId: booking.id };
};
var PaymentService = {
  createBookingCheckoutSession,
  verifyPaymentSession,
  handleStripeWebhook,
  getMyPaymentsFromDB,
  getTutorPaymentsFromDB,
  getAllPaymentsFromDB,
  chargeCard
};

// src/module/payment/payment.controller.ts
var createBookingPaymentController = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { bookingId } = req.params;
    const result = await PaymentService.createBookingCheckoutSession(studentId, bookingId);
    res.status(201).json({
      success: true,
      message: "Checkout session created",
      data: result
    });
  } catch (error) {
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
    if (error.message === "INVALID_AMOUNT") {
      return res.status(400).json({ success: false, message: "Tutor has not set their hourly rate. Please ask the tutor to update their profile." });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var verifyPaymentSessionController = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { sessionId } = req.params;
    const result = await PaymentService.verifyPaymentSession(sessionId, studentId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === "PAYMENT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Payment session not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var handleStripeWebhookController = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).json({ success: false, message: "Missing stripe-signature header" });
  }
  try {
    await PaymentService.handleStripeWebhook(req.body, signature);
    res.status(200).json({ received: true });
  } catch (error) {
    if (error.message === "INVALID_WEBHOOK_SIGNATURE") {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};
var getMyPaymentsController = async (req, res) => {
  try {
    const result = await PaymentService.getMyPaymentsFromDB(req.user.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getTutorPaymentsController = async (req, res) => {
  try {
    const result = await PaymentService.getTutorPaymentsFromDB(req.user.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getAllPaymentsController = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await PaymentService.getAllPaymentsFromDB({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var chargeCardController = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { slotId, cardNumber, expMonth, expYear, cvc } = req.body;
    if (!slotId || !cardNumber || !expMonth || !expYear || !cvc) {
      return res.status(400).json({ success: false, message: "Missing card or slot details" });
    }
    const result = await PaymentService.chargeCard(studentId, slotId, {
      number: String(cardNumber).replace(/\s/g, ""),
      exp_month: Number(expMonth),
      exp_year: Number(expYear),
      cvc: String(cvc)
    });
    res.status(200).json({ success: true, message: "Payment successful!", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err?.message ?? "Payment failed" });
  }
};
var PaymentController = {
  createBookingPaymentController,
  verifyPaymentSessionController,
  handleStripeWebhookController,
  getMyPaymentsController,
  getTutorPaymentsController,
  getAllPaymentsController,
  chargeCardController
};

// src/module/admin/admin.route.ts
var router = Router2();
router.get(
  "/users",
  verifyToken,
  verifyAdmin,
  getAllUsersController
);
router.patch(
  "/users/:userId/status",
  verifyToken,
  verifyAdmin,
  updateUserStatusController
);
router.patch(
  "/users/:userId/role",
  verifyToken,
  verifyAdmin,
  updateUserRoleController
);
router.get(
  "/bookings",
  verifyToken,
  verifyAdmin,
  getAllBookingsController
);
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
router.delete(
  "/users/:userId",
  verifyToken,
  verifyAdmin,
  deleteUserController
);
router.get("/featured-tutors", verifyToken, verifyAdmin, getFeaturedTutorsController);
router.post("/featured-tutors", verifyToken, verifyAdmin, addFeaturedTutorController);
router.post("/featured-tutors/:tutorId", verifyToken, verifyAdmin, addFeaturedTutorController);
router.patch("/featured-tutors/:tutorId", verifyToken, verifyAdmin, addFeaturedTutorController);
router.delete("/featured-tutors/:tutorId", verifyToken, verifyAdmin, removeFeaturedTutorController);
router.get(
  "/payments",
  verifyToken,
  verifyAdmin,
  PaymentController.getAllPaymentsController
);
var admin_route_default = router;

// src/module/adminCourse/admin.course.route.ts
import { Router as Router3 } from "express";

// src/module/adminCourse/admin.course.service.ts
var getPendingCourses = async () => {
  return prisma.course.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      image: true,
      status: true,
      createdAt: true,
      trainer: {
        select: { id: true, name: true, email: true }
      }
    }
  });
};
var getAllCoursesForAdmin = async () => {
  return prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      image: true,
      status: true,
      createdAt: true,
      trainer: {
        select: { id: true, name: true, email: true }
      },
      _count: { select: { enrollments: true } }
    }
  });
};
var updateCourseStatus = async (courseId, status) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId }
  });
  if (!course) {
    throw new Error("NOT_FOUND");
  }
  if (course.status !== "PENDING") {
    throw new Error("NOT_PENDING");
  }
  return prisma.course.update({
    where: { id: courseId },
    data: { status }
  });
};

// src/module/adminCourse/admin.course.controller.ts
var getPendingCoursesController = async (_req, res) => {
  try {
    const courses = await getPendingCourses();
    res.status(200).json({ success: true, data: courses });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getAllCoursesController = async (_req, res) => {
  try {
    const courses = await getAllCoursesForAdmin();
    res.status(200).json({ success: true, data: courses });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var approveCourseController = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await updateCourseStatus(courseId, "APPROVED");
    res.status(200).json({
      success: true,
      message: "Course approved",
      data: {
        id: course.id,
        status: course.status
      }
    });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    if (error.message === "NOT_PENDING") {
      return res.status(400).json({
        success: false,
        message: "Course is not pending"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
var rejectCourseController = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await updateCourseStatus(courseId, "REJECTED");
    res.status(200).json({
      success: true,
      message: "Course rejected",
      data: {
        id: course.id,
        status: course.status
      }
    });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    if (error.message === "NOT_PENDING") {
      return res.status(400).json({
        success: false,
        message: "Course is not pending"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// src/module/adminCourse/admin.course.route.ts
var router2 = Router3();
router2.get("/courses", verifyToken, verifyAdmin, getAllCoursesController);
router2.get("/courses/pending", verifyToken, verifyAdmin, getPendingCoursesController);
router2.patch(
  "/courses/:courseId/approve",
  verifyToken,
  verifyAdmin,
  approveCourseController
);
router2.patch(
  "/courses/:courseId/reject",
  verifyToken,
  verifyAdmin,
  rejectCourseController
);
var admin_course_route_default = router2;

// src/module/adminDashboard/admin.dashboard.route.ts
import { Router as Router4 } from "express";

// src/module/adminDashboard/admin.dashboard.service.ts
var getAdminDashboardStats = async () => {
  const [
    totalUsers,
    totalTrainers,
    pendingTrainers,
    totalCourses,
    pendingCourses,
    totalEnrollments
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "TRAINER" } }),
    prisma.user.count({ where: { role: "TRAINER", status: "PENDING" } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: "PENDING" } }),
    prisma.enrollment.count()
  ]);
  return {
    totalUsers,
    totalTrainers,
    pendingTrainers,
    totalCourses,
    pendingCourses,
    totalEnrollments
  };
};

// src/module/adminDashboard/admin.dashboard.controller.ts
var getAdminDashboardStatsController = async (req, res) => {
  try {
    const stats = await getAdminDashboardStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// src/module/adminDashboard/admin.dashboard.route.ts
var router3 = Router4();
router3.get(
  "/dashboard",
  verifyToken,
  verifyAdmin,
  getAdminDashboardStatsController
);
var admin_dashboard_route_default = router3;

// src/module/course/trainer.route.ts
import { Router as Router5 } from "express";

// src/module/course/course.service.ts
var createCourse = async (payload) => {
  const { title, description, category, price = 0, image, trainerId } = payload;
  if (!title || !description || !category) {
    throw new Error("INVALID_DATA");
  }
  const course = await prisma.course.create({
    data: {
      title,
      description,
      category,
      price,
      image: image ?? null,
      trainerId,
      status: "PENDING"
    }
  });
  return course;
};
var getTrainerCourses = async (trainerId) => {
  const courses = await prisma.course.findMany({
    where: { trainerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      image: true,
      status: true,
      createdAt: true,
      _count: { select: { enrollments: true } }
    }
  });
  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    price: c.price,
    image: c.image,
    status: c.status,
    createdAt: c.createdAt,
    totalEnrollments: c._count.enrollments
  }));
};
var updateCourse = async (id, trainerId, payload) => {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new Error("NOT_FOUND");
  if (course.trainerId !== trainerId) throw new Error("FORBIDDEN");
  return prisma.course.update({
    where: { id },
    data: { ...payload, status: "PENDING" }
  });
};
var deleteCourse = async (id, trainerId) => {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new Error("NOT_FOUND");
  if (course.trainerId !== trainerId) throw new Error("FORBIDDEN");
  return prisma.course.delete({ where: { id } });
};
var getCourseById = async (id) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      trainer: {
        select: { id: true, name: true, email: true }
      }
    }
  });
  return course;
};

// src/module/course/course.controller.ts
var createCourseController = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const course = await createCourse({ ...req.body, trainerId });
    res.status(201).json({
      success: true,
      message: "Course created and pending admin approval",
      data: course
    });
  } catch (error) {
    if (error.message === "INVALID_DATA") {
      return res.status(400).json({
        success: false,
        message: "Title, description and category are required"
      });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getTrainerCoursesController = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const courses = await getTrainerCourses(trainerId);
    res.status(200).json({ success: true, data: courses });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var updateCourseController = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const id = req.params.id;
    const course = await updateCourse(id, trainerId, req.body);
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Not your course" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var deleteCourseController = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const id = req.params.id;
    await deleteCourse(id, trainerId);
    res.status(200).json({ success: true, message: "Course deleted" });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Not your course" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getSingleCourseController = async (req, res) => {
  try {
    const { id } = req.params;
    const courseId = Array.isArray(id) ? id[0] : id;
    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course ID is required" });
    }
    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.status(200).json({ success: true, data: course });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// src/module/course/trainer.route.ts
var router4 = Router5();
router4.get("/courses", verifyToken, verifyTrainer, getTrainerCoursesController);
router4.post("/courses", verifyToken, verifyTrainer, createCourseController);
router4.patch("/courses/:id", verifyToken, verifyTrainer, updateCourseController);
router4.delete("/courses/:id", verifyToken, verifyTrainer, deleteCourseController);
router4.get("/:id", getSingleCourseController);
var trainer_route_default = router4;

// src/module/trainerDashboard/trainer.dashboard.route.ts
import { Router as Router6 } from "express";

// src/module/trainerDashboard/trainer.dashboard.service.ts
var getTrainerDashboard = async (trainerId) => {
  const courses = await prisma.course.findMany({
    where: { trainerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      price: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true
        }
      }
    }
  });
  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    category: course.category,
    price: course.price,
    status: course.status,
    createdAt: course.createdAt,
    totalEnrollments: course._count.enrollments
  }));
};

// src/module/trainerDashboard/trainer.dashboard.controller.ts
var getTrainerDashboardController = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const data = await getTrainerDashboard(trainerId);
    res.status(200).json({
      success: true,
      data
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// src/module/trainerDashboard/trainer.dashboard.route.ts
var router5 = Router6();
router5.get(
  "/dashboard",
  verifyToken,
  verifyTrainer,
  getTrainerDashboardController
);
var trainer_dashboard_route_default = router5;

// src/module/student/student.course.route.ts
import { Router as Router7 } from "express";

// src/module/student/student.course.service.ts
var getApprovedCourses = async ({
  page = 1,
  limit = 10
}) => {
  const skip = (page - 1) * limit;
  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where: { status: "APPROVED" },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        price: true,
        createdAt: true,
        trainer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.course.count({
      where: { status: "APPROVED" }
    })
  ]);
  return {
    data: courses,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// src/module/student/student.course.controller.ts
var getApprovedCoursesController = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await getApprovedCourses({ page, limit });
    res.status(200).json({
      success: true,
      ...result
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// src/module/student/student.course.route.ts
var router6 = Router7();
router6.get("/courses", getApprovedCoursesController);
var student_course_route_default = router6;

// src/module/enrollment/enrollment.route.ts
import { Router as Router8 } from "express";

// src/module/enrollment/enrollment.service.ts
var enrollCourse = async (studentId, courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId }
  });
  if (!course) {
    throw new Error("COURSE_NOT_FOUND");
  }
  if (course.status !== "APPROVED") {
    throw new Error("COURSE_NOT_APPROVED");
  }
  const alreadyEnrolled = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId
      }
    }
  });
  if (alreadyEnrolled) {
    throw new Error("ALREADY_ENROLLED");
  }
  return prisma.enrollment.create({
    data: {
      studentId,
      courseId
    }
  });
};

// src/module/enrollment/enrollment.controller.ts
var enrollCourseController = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId } = req.params;
    const enrollment = await enrollCourse(studentId, courseId);
    res.status(201).json({
      success: true,
      message: "Enrolled successfully",
      data: enrollment
    });
  } catch (error) {
    if (error.message === "COURSE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }
    if (error.message === "COURSE_NOT_APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Course is not approved"
      });
    }
    if (error.message === "ALREADY_ENROLLED") {
      return res.status(409).json({
        success: false,
        message: "Already enrolled in this course"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// src/module/enrollment/enrollment.route.ts
var router7 = Router8();
router7.post(
  "/courses/:courseId/enroll",
  verifyToken,
  verifyStudent,
  enrollCourseController
);
var enrollment_route_default = router7;

// src/module/studentEnrollment/student.enrollment.route.ts
import { Router as Router9 } from "express";

// src/module/studentEnrollment/student.enrollment.service.ts
var getMyEnrollments = async ({
  studentId,
  page = 1,
  limit = 10
}) => {
  const skip = (page - 1) * limit;
  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            price: true,
            trainer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }),
    prisma.enrollment.count({ where: { studentId } })
  ]);
  return {
    data: enrollments,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// src/module/studentEnrollment/student.enrollment.controller.ts
var getMyEnrollmentsController = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await getMyEnrollments({ studentId, page, limit });
    res.status(200).json({
      success: true,
      ...result
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// src/module/studentEnrollment/student.enrollment.route.ts
var router8 = Router9();
router8.get(
  "/enrollments",
  verifyToken,
  verifyStudent,
  getMyEnrollmentsController
);
var student_enrollment_route_default = router8;

// src/module/studentDashboard/student.dashboard.route.ts
import { Router as Router10 } from "express";

// src/module/studentDashboard/student.dashboard.service.ts
var getStudentDashboard = async (studentId) => {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, createdAt: true }
  });
  if (!student) throw new Error("STUDENT_NOT_FOUND");
  const [bookings, reviews] = await Promise.all([
    prisma.booking.findMany({
      where: { studentId },
      include: {
        slot: {
          include: {
            trainer: {
              select: { id: true, name: true, email: true, trainerProfile: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.review.findMany({
      where: { studentId },
      include: {
        tutor: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const upcomingBookings = bookings.filter(
    (b) => b.status === "CONFIRMED" && new Date(b.slot.date) >= /* @__PURE__ */ new Date()
  ).length;
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED").length;
  return {
    student,
    stats: {
      totalBookings: bookings.length,
      upcomingBookings,
      completedBookings,
      totalReviews: reviews.length
    },
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      date: b.slot.date,
      startTime: b.slot.startTime,
      endTime: b.slot.endTime,
      tutorName: b.slot.trainer.name,
      tutorId: b.slot.trainer.id
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      tutorName: r.tutor?.name,
      tutorId: r.tutorId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt
    }))
  };
};

// src/module/studentDashboard/student.dashboard.controller.ts
var getStudentDashboardController = async (req, res) => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    const dashboard = await getStudentDashboard(studentId);
    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    if (error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// src/module/studentDashboard/student.dashboard.route.ts
var router9 = Router10();
router9.get(
  "/dashboard",
  verifyToken,
  verifyStudent,
  getStudentDashboardController
);
var student_dashboard_route_default = router9;

// src/module/search/course.search.route.ts
import { Router as Router11 } from "express";

// src/module/search/course.search.service.ts
var searchCourses = async ({
  search,
  category,
  minPrice,
  maxPrice,
  sort,
  page = 1,
  limit = 10
}) => {
  const skip = (page - 1) * limit;
  const where = { status: "APPROVED" };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ];
  }
  if (category) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
    if (isUuid) {
      const cat = await prisma.category.findUnique({ where: { id: category }, select: { name: true } }).catch(() => null);
      if (cat?.name) where.category = { contains: cat.name, mode: "insensitive" };
    } else {
      where.category = { contains: category, mode: "insensitive" };
    }
  }
  if (minPrice !== void 0 || maxPrice !== void 0) {
    where.price = {};
    if (minPrice !== void 0) where.price.gte = minPrice;
    if (maxPrice !== void 0) where.price.lte = maxPrice;
  }
  const orderBy = sort === "price-asc" ? { price: "asc" } : sort === "price-desc" ? { price: "desc" } : sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };
  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        price: true,
        image: true,
        createdAt: true,
        trainer: { select: { id: true, name: true } }
      }
    }),
    prisma.course.count({ where })
  ]);
  return {
    data: courses,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
  };
};

// src/module/search/course.search.controller.ts
var searchCoursesController = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort, page, limit } = req.query;
    const result = await searchCourses({
      search,
      category,
      sort,
      ...minPrice && { minPrice: Number(minPrice) },
      ...maxPrice && { maxPrice: Number(maxPrice) },
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10
    });
    res.status(200).json({
      success: true,
      ...result
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// src/module/search/course.search.route.ts
var router10 = Router11();
router10.get("/courses/search", searchCoursesController);
var course_search_route_default = router10;

// src/module/booking/booking.route.ts
import { Router as Router12 } from "express";

// src/module/booking/booking.service.ts
var createSlotIntoDB = async (payload) => {
  const result = await prisma.slot.create({
    data: {
      trainerId: payload.trainerId,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      isBooked: false
    }
  });
  return result;
};
var createBookingIntoDB = async (studentId, slotId) => {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: {
      trainer: {
        include: { trainerProfile: { select: { hourlyRate: true } } }
      }
    }
  });
  if (!slot) throw new Error("SLOT_NOT_FOUND");
  if (slot.isBooked) throw new Error("SLOT_ALREADY_BOOKED");
  const price = slot.trainer?.trainerProfile?.hourlyRate ?? 0;
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: { studentId, slotId, status: "CONFIRMED", price },
      include: {
        slot: {
          include: {
            trainer: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
    await tx.slot.update({ where: { id: slotId }, data: { isBooked: true } });
    return booking;
  });
  return result;
};
var getMyBookingsFromDB = async (studentId, status) => {
  const where = { studentId };
  if (status) where.status = status;
  return prisma.booking.findMany({
    where,
    include: {
      slot: {
        include: {
          trainer: {
            select: { id: true, name: true, email: true, trainerProfile: true }
          }
        }
      },
      review: true
    },
    orderBy: { createdAt: "desc" }
  });
};
var getBookingByIdFromDB = async (bookingId, userId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      slot: {
        include: {
          trainer: {
            select: { id: true, name: true, email: true, trainerProfile: true }
          }
        }
      },
      student: { select: { id: true, name: true, email: true } },
      review: true
    }
  });
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  const isStudent = booking.studentId === userId;
  const isTutor = booking.slot.trainerId === userId;
  if (!isStudent && !isTutor) throw new Error("FORBIDDEN");
  return booking;
};
var updateBookingStatusIntoDB = async (bookingId, userId, userRole, newStatus) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: true }
  });
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (newStatus === "COMPLETED") {
    if (userRole !== "TRAINER") throw new Error("FORBIDDEN");
    if (booking.slot.trainerId !== userId) throw new Error("FORBIDDEN");
    if (booking.status !== "CONFIRMED") throw new Error("INVALID_STATUS_TRANSITION");
  }
  if (newStatus === "CANCELLED") {
    const isStudent = booking.studentId === userId;
    const isTutor = booking.slot.trainerId === userId;
    if (!isStudent && !isTutor) throw new Error("FORBIDDEN");
    if (booking.status === "COMPLETED") throw new Error("INVALID_STATUS_TRANSITION");
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: newStatus },
    include: {
      slot: {
        include: {
          trainer: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });
  if (newStatus === "CANCELLED") {
    await prisma.slot.update({
      where: { id: booking.slotId },
      data: { isBooked: false }
    });
  }
  return updated;
};
var getTutorBookingsFromDB = async (tutorId, status) => {
  const where = { slot: { trainerId: tutorId } };
  if (status) where.status = status;
  return prisma.booking.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, email: true } },
      slot: true,
      review: true
    },
    orderBy: { createdAt: "desc" }
  });
};
var getTutorSlotsFromDB = async (tutorId) => {
  return prisma.slot.findMany({
    where: { trainerId: tutorId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }]
  });
};
var getPublicTutorSlotsFromDB = async (tutorId) => {
  return prisma.slot.findMany({
    where: { trainerId: tutorId, isBooked: false },
    orderBy: [{ date: "asc" }, { startTime: "asc" }]
  });
};
var BookingService = {
  createSlotIntoDB,
  createBookingIntoDB,
  getMyBookingsFromDB,
  getBookingByIdFromDB,
  updateBookingStatusIntoDB,
  getTutorBookingsFromDB,
  getTutorSlotsFromDB,
  getPublicTutorSlotsFromDB
};

// src/module/booking/booking.controller.ts
var createSlotController = async (req, res) => {
  try {
    const trainerId = req.user.userId;
    const result = await BookingService.createSlotIntoDB({ ...req.body, trainerId });
    res.status(201).json({
      success: true,
      message: "Slot created successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var createBookingController = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { slotId } = req.body;
    const result = await BookingService.createBookingIntoDB(studentId, slotId);
    res.status(201).json({
      success: true,
      message: "Session booked successfully",
      data: result
    });
  } catch (error) {
    if (error.message === "SLOT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }
    if (error.message === "SLOT_ALREADY_BOOKED") {
      return res.status(409).json({ success: false, message: "Slot is already booked" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getMyBookingsController = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { status } = req.query;
    const result = await BookingService.getMyBookingsFromDB(studentId, status);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getBookingByIdController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = req.params.id;
    const result = await BookingService.getBookingByIdFromDB(id, userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var updateBookingStatusController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const id = req.params.id;
    const { status } = req.body;
    if (!["COMPLETED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Use COMPLETED or CANCELLED" });
    }
    const result = await BookingService.updateBookingStatusIntoDB(id, userId, userRole, status);
    res.status(200).json({
      success: true,
      message: `Booking marked as ${status.toLowerCase()}`,
      data: result
    });
  } catch (error) {
    if (error.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (error.message === "INVALID_STATUS_TRANSITION") {
      return res.status(400).json({ success: false, message: "Invalid status transition" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getTutorBookingsController = async (req, res) => {
  try {
    const tutorId = req.user.userId;
    const { status } = req.query;
    const result = await BookingService.getTutorBookingsFromDB(tutorId, status);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var BookingController = {
  createSlotController,
  createBookingController,
  getMyBookingsController,
  getBookingByIdController,
  updateBookingStatusController,
  getTutorBookingsController
};

// src/module/booking/booking.route.ts
var router11 = Router12();
router11.post("/slots", verifyToken, verifyTrainer, BookingController.createSlotController);
router11.post("/bookings", verifyToken, verifyStudent, BookingController.createBookingController);
router11.get("/bookings", verifyToken, verifyStudent, BookingController.getMyBookingsController);
router11.get("/bookings/:id", verifyToken, BookingController.getBookingByIdController);
router11.patch("/bookings/:id", verifyToken, BookingController.updateBookingStatusController);
var booking_route_default = router11;

// src/module/review/review.route.ts
import { Router as Router13 } from "express";

// src/module/review/review.service.ts
var addReviewIntoDB = async (payload) => {
  const tutor = await prisma.user.findFirst({
    where: { id: payload.tutorId, role: "TRAINER" }
  });
  if (!tutor) {
    throw new Error("TUTOR_NOT_FOUND");
  }
  if (payload.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: payload.bookingId,
        studentId: payload.studentId,
        status: { in: ["CONFIRMED", "COMPLETED"] }
      }
    });
    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND_OR_NOT_COMPLETED");
    }
    const existing = await prisma.review.findUnique({
      where: { bookingId: payload.bookingId }
    });
    if (existing) {
      throw new Error("REVIEW_ALREADY_EXISTS");
    }
  }
  const result = await prisma.review.create({
    data: {
      studentId: payload.studentId,
      tutorId: payload.tutorId,
      bookingId: payload.bookingId,
      rating: payload.rating,
      comment: payload.comment
    }
  });
  return result;
};
var getReviewsByTutor = async (tutorId) => {
  return prisma.review.findMany({
    where: { tutorId },
    include: {
      student: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};
var ReviewService = {
  addReviewIntoDB,
  getReviewsByTutor
};

// src/module/review/review.controller.ts
var addReviewController = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const result = await ReviewService.addReviewIntoDB({
      ...req.body,
      studentId
    });
    res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: result
    });
  } catch (error) {
    if (error.message === "TUTOR_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Tutor not found" });
    }
    if (error.message === "BOOKING_NOT_FOUND_OR_NOT_COMPLETED") {
      return res.status(400).json({ success: false, message: "Booking not found or not completed" });
    }
    if (error.message === "REVIEW_ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: "Review already submitted for this session" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getReviewsByTutorController = async (req, res) => {
  try {
    const tutorId = String(req.params["tutorId"]);
    const result = await ReviewService.getReviewsByTutor(tutorId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var ReviewController = {
  addReviewController,
  getReviewsByTutorController
};

// src/module/review/review.route.ts
var router12 = Router13();
router12.post(
  "/",
  verifyToken,
  verifyStudent,
  ReviewController.addReviewController
);
router12.get("/tutor/:tutorId", ReviewController.getReviewsByTutorController);
var review_route_default = router12;

// src/module/category/category.route.ts
import { Router as Router14 } from "express";

// src/module/category/category.service.ts
var createCategory = async (payload) => {
  const existing = await prisma.category.findUnique({ where: { name: payload.name } });
  if (existing) throw new Error("CATEGORY_EXISTS");
  return prisma.category.create({ data: payload });
};
var getAllCategories = async () => {
  return prisma.category.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true }
  });
};
var updateCategory = async (id, name) => {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new Error("CATEGORY_NOT_FOUND");
  const nameTaken = await prisma.category.findFirst({
    where: { name, NOT: { id } }
  });
  if (nameTaken) throw new Error("CATEGORY_EXISTS");
  return prisma.category.update({ where: { id }, data: { name } });
};
var deleteCategory = async (id) => {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new Error("CATEGORY_NOT_FOUND");
  return prisma.category.delete({ where: { id } });
};

// src/module/category/category.controller.ts
var createCategoryController = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
    const result = await createCategory({ name });
    res.status(201).json({ success: true, message: "Category created successfully", data: result });
  } catch (error) {
    if (error.message === "CATEGORY_EXISTS") {
      return res.status(409).json({ success: false, message: "Category already exists" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getAllCategoriesController = async (_req, res) => {
  try {
    const result = await getAllCategories();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var updateCategoryController = async (req, res) => {
  try {
    const id = String(req.params["id"]);
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
    const result = await updateCategory(id, name);
    res.status(200).json({ success: true, message: "Category updated successfully", data: result });
  } catch (error) {
    if (error.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    if (error.message === "CATEGORY_EXISTS") {
      return res.status(409).json({ success: false, message: "Category name already taken" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var deleteCategoryController = async (req, res) => {
  try {
    const id = String(req.params["id"]);
    await deleteCategory(id);
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    if (error.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// src/module/category/category.route.ts
var router13 = Router14();
router13.get("/", getAllCategoriesController);
router13.post("/", verifyToken, verifyAdmin, createCategoryController);
router13.patch("/:id", verifyToken, verifyAdmin, updateCategoryController);
router13.delete("/:id", verifyToken, verifyAdmin, deleteCategoryController);
var category_route_default = router13;

// src/module/tutor/tutor.route.ts
import { Router as Router15 } from "express";

// src/module/tutor/tutor.service.ts
var getAllTutors = async (filters) => {
  const {
    search,
    subject,
    category,
    minRate,
    minPrice,
    maxRate,
    maxPrice,
    page = 1,
    limit = 10
  } = filters;
  const effectiveSubject = subject ?? category;
  const effectiveMin = minRate ?? minPrice;
  const effectiveMax = maxRate ?? maxPrice;
  const skip = (page - 1) * limit;
  const profileWhere = {};
  if (effectiveSubject) profileWhere.subjects = { contains: effectiveSubject, mode: "insensitive" };
  if (effectiveMin !== void 0) profileWhere.hourlyRate = { ...profileWhere.hourlyRate, gte: effectiveMin };
  if (effectiveMax !== void 0) profileWhere.hourlyRate = { ...profileWhere.hourlyRate, lte: effectiveMax };
  const userWhere = {
    status: { not: "BLOCKED" },
    AND: [
      {
        OR: [
          { role: "TRAINER" },
          { trainerProfile: { isNot: null } }
        ]
      }
    ]
  };
  if (Object.keys(profileWhere).length > 0) {
    userWhere.trainerProfile = profileWhere;
  }
  if (search) {
    userWhere.AND.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { trainerProfile: { subjects: { contains: search, mode: "insensitive" } } }
      ]
    });
  }
  const [tutors, total] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      include: {
        trainerProfile: true,
        receivedReviews: { select: { rating: true } }
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.count({ where: userWhere })
  ]);
  const tutorsWithRating = tutors.map((tutor) => {
    const reviews = tutor.receivedReviews;
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    return {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      bio: tutor.trainerProfile?.bio,
      subjects: tutor.trainerProfile?.subjects,
      experience: tutor.trainerProfile?.experience,
      hourlyRate: tutor.trainerProfile?.hourlyRate,
      profileImage: tutor.trainerProfile?.profileImage ?? tutor.image ?? null,
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalReviews: reviews.length
    };
  });
  return {
    tutors: tutorsWithRating,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
var getTutorById = async (tutorId) => {
  const tutor = await prisma.user.findFirst({
    where: { id: tutorId, role: "TRAINER", status: "ACTIVE" },
    include: {
      trainerProfile: true,
      receivedReviews: {
        include: {
          student: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
      },
      slots: {
        where: { isBooked: false },
        orderBy: [{ date: "asc" }, { startTime: "asc" }]
      }
    }
  });
  if (!tutor) throw new Error("TUTOR_NOT_FOUND");
  const reviews = tutor.receivedReviews;
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  return {
    id: tutor.id,
    name: tutor.name,
    email: tutor.email,
    bio: tutor.trainerProfile?.bio,
    subjects: tutor.trainerProfile?.subjects,
    experience: tutor.trainerProfile?.experience,
    hourlyRate: tutor.trainerProfile?.hourlyRate,
    profileImage: tutor.trainerProfile?.profileImage ?? tutor.image ?? null,
    availableSlots: tutor.slots,
    reviews: tutor.receivedReviews,
    avgRating: parseFloat(avgRating.toFixed(1)),
    totalReviews: reviews.length
  };
};
var getTutorProfileFromDB = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { trainerProfile: true }
  });
  if (!user) throw new Error("TUTOR_NOT_FOUND");
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.trainerProfile
  };
};
var updateTutorProfileIntoDB = async (userId, payload) => {
  const result = await prisma.trainerProfile.upsert({
    where: { userId },
    update: { ...payload },
    create: { userId, ...payload }
  });
  return result;
};

// src/module/tutor/tutor.controller.ts
var getTutors = async (req, res) => {
  try {
    const { search, subject, category, minRate, minPrice, maxRate, maxPrice, page, limit } = req.query;
    const filters = {
      ...search && { search },
      ...subject && { subject },
      ...category && { category },
      ...minRate && { minRate: parseFloat(minRate) },
      ...minPrice && { minPrice: parseFloat(minPrice) },
      ...maxRate && { maxRate: parseFloat(maxRate) },
      ...maxPrice && { maxPrice: parseFloat(maxPrice) },
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    };
    const result = await getAllTutors(filters);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getTutorByIdController = async (req, res) => {
  try {
    const tutor = await getTutorById(String(req.params["id"]));
    res.status(200).json({ success: true, data: tutor });
  } catch (error) {
    if (error.message === "TUTOR_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Tutor not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getPublicTutorSlotsController = async (req, res) => {
  try {
    const slots = await BookingService.getPublicTutorSlotsFromDB(String(req.params["id"]));
    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getTutorProfileController = async (req, res) => {
  try {
    const result = await getTutorProfileFromDB(req.user.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === "TUTOR_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var updateTutorProfileController = async (req, res) => {
  try {
    const result = await updateTutorProfileIntoDB(req.user.userId, req.body);
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getTutorOwnSlotsController = async (req, res) => {
  try {
    const slots = await BookingService.getTutorSlotsFromDB(req.user.userId);
    res.status(200).json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
var getTutorSessionsController = async (req, res) => {
  try {
    const { status } = req.query;
    const result = await BookingService.getTutorBookingsFromDB(
      req.user.userId,
      status
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// src/module/tutor/tutor.route.ts
var router14 = Router15();
router14.get("/profile/me", verifyToken, verifyTrainer, getTutorProfileController);
router14.put("/profile/me", verifyToken, verifyTrainer, updateTutorProfileController);
router14.get("/slots/mine", verifyToken, verifyTrainer, getTutorOwnSlotsController);
router14.get("/sessions/mine", verifyToken, verifyTrainer, getTutorSessionsController);
router14.get("/", getTutors);
router14.get("/:id/slots", getPublicTutorSlotsController);
router14.get("/:id", getTutorByIdController);
var tutor_route_default = router14;

// src/module/payment/payment.route.ts
import { Router as Router16 } from "express";
import express from "express";
var router15 = Router16();
router15.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.handleStripeWebhookController
);
router15.post(
  "/booking/:bookingId",
  verifyToken,
  verifyStudent,
  PaymentController.createBookingPaymentController
);
router15.get(
  "/verify/:sessionId",
  verifyToken,
  verifyStudent,
  PaymentController.verifyPaymentSessionController
);
router15.post(
  "/pay",
  express.json(),
  verifyToken,
  verifyStudent,
  PaymentController.chargeCardController
);
router15.get(
  "/",
  verifyToken,
  verifyStudent,
  PaymentController.getMyPaymentsController
);
router15.get(
  "/tutor",
  verifyToken,
  verifyTrainer,
  PaymentController.getTutorPaymentsController
);
var payment_route_default = router15;

// src/module/upload/upload.route.ts
import { Router as Router17 } from "express";
import multer from "multer";

// src/module/upload/upload.controller.ts
import "dotenv/config";

// src/config/cloudinary.ts
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// src/module/upload/upload.controller.ts
var uploadImageController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Only JPG, PNG, WEBP or GIF allowed" });
    }
    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "learnbridge",
      resource_type: "image"
    });
    return res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error("[Upload] Cloudinary error:", error?.message ?? error);
    const message = error?.message ?? "Image upload failed";
    return res.status(500).json({ success: false, message });
  }
};

// src/module/upload/upload.route.ts
var router16 = Router17();
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
  // 5 MB
});
router16.post("/image", verifyToken, upload.single("image"), uploadImageController);
var upload_route_default = router16;

// src/module/ai/ai.route.ts
import { Router as Router18 } from "express";

// src/module/ai/ai.service.ts
import Anthropic from "@anthropic-ai/sdk";
var client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
var chatWithAI = async (messages) => {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: "You are a helpful learning assistant for LearnBridge, an online tutoring platform. Help students find tutors, understand courses, and answer questions about learning topics.",
    messages
  });
  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("UNEXPECTED_RESPONSE_TYPE");
  }
  return block.text;
};

// src/module/ai/ai.controller.ts
var chatController = async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "messages array is required" });
    }
    const filtered = messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content }));
    if (filtered.length === 0) {
      return res.status(400).json({ success: false, message: "No valid messages provided" });
    }
    const reply = await chatWithAI(filtered);
    res.status(200).json({ success: true, data: reply });
  } catch (error) {
    console.error("AI chat error:", error?.message);
    res.status(500).json({ success: false, message: "AI service unavailable" });
  }
};
var AiController = { chatController };

// src/module/ai/ai.route.ts
var router17 = Router18();
router17.post("/chat", AiController.chatController);
var ai_route_default = router17;

// src/app.ts
var app = express2();
var allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5000"
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use("/api/auth", toNodeHandler(auth));
app.use("/api/v1/payments", payment_route_default);
app.use(express2.json());
app.use(cookieParser());
app.use("/api/v1/auth", auth_route_default);
app.use("/api/v1/admin", admin_route_default);
app.use("/api/v1/admin", admin_course_route_default);
app.use("/api/v1/admin", admin_dashboard_route_default);
app.use("/api/v1/trainer", trainer_dashboard_route_default);
app.use("/api/v1/trainer", trainer_route_default);
app.use("/api/v1/student", student_course_route_default);
app.use("/api/v1/student", enrollment_route_default);
app.use("/api/v1/student", student_enrollment_route_default);
app.use("/api/v1/student", student_dashboard_route_default);
app.use("/api/v1", course_search_route_default);
app.use("/api/v1", booking_route_default);
app.use("/api/v1/reviews", review_route_default);
app.use("/api/v1/categories", category_route_default);
app.use("/api/v1/tutors", tutor_route_default);
app.use("/api/v1/upload", upload_route_default);
app.use("/api/v1/ai", ai_route_default);
app.get("/", (_req, res) => {
  res.send("LearnBridge API is running");
});
var app_default = app;

// api/_handler.ts
var handler_default = app_default;
export {
  handler_default as default
};
