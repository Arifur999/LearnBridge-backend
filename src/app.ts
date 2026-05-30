import express, { Application, Request, Response } from 'express';
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

import authRouter from './module/auth/auth.route';
import adminRoutes from './module/admin/admin.route';
import adminCourseRoutes from './module/adminCourse/admin.course.route';
import adminDashboardRoutes from './module/adminDashboard/admin.dashboard.route';
import trainerRoutes from './module/course/trainer.route';
import trainerDashboardRoutes from './module/trainerDashboard/trainer.dashboard.route';
import studentCourseRoutes from './module/student/student.course.route';
import enrollmentRoutes from './module/enrollment/enrollment.route';
import studentEnrollmentRoutes from './module/studentEnrollment/student.enrollment.route';
import studentDashboardRoutes from './module/studentDashboard/student.dashboard.route';
import courseSearchRoutes from './module/search/course.search.route';
import bookingRoutes from './module/booking/booking.route';
import reviewRoutes from './module/review/review.route';
import categoryRoutes from './module/category/category.route';
import tutorRoutes from './module/tutor/tutor.route';
import paymentRoutes from './module/payment/payment.route';
import uploadRoutes from './module/upload/upload.route';
import aiRoutes from './module/ai/ai.route';

const app: Application = express();

// ── CORS (credentials required for BetterAuth cookies) ────────
app.use(cors({
  origin:         ["http://localhost:3000", "http://localhost:5000"],
  credentials:    true,
  methods:        ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── BetterAuth — MUST be before express.json() ────────────────
app.use("/api/auth", toNodeHandler(auth));

// ⚠️ Payment webhook MUST be registered before express.json()
// Stripe sends a raw Buffer body that must not be parsed as JSON
app.use("/api/v1/payments", paymentRoutes);

app.use(express.json());
app.use(cookieParser());

// Auth
app.use("/api/v1/auth", authRouter);

// Admin
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/admin", adminCourseRoutes);
app.use("/api/v1/admin", adminDashboardRoutes);

// Trainer (dashboard MUST come before trainer/:id dynamic route)
app.use("/api/v1/trainer", trainerDashboardRoutes);
app.use("/api/v1/trainer", trainerRoutes);

// Student (course browsing + enrollments + dashboard)
app.use("/api/v1/student", studentCourseRoutes);
app.use("/api/v1/student", enrollmentRoutes);
app.use("/api/v1/student", studentEnrollmentRoutes);
app.use("/api/v1/student", studentDashboardRoutes);

// Public course search
app.use("/api/v1", courseSearchRoutes);

// Bookings & slots
app.use("/api/v1", bookingRoutes);

// Reviews
app.use("/api/v1/reviews", reviewRoutes);

// Categories
app.use("/api/v1/categories", categoryRoutes);

// Tutors — public listing + public slots + tutor self-management
app.use("/api/v1/tutors", tutorRoutes);

// File upload (Cloudinary)
app.use("/api/v1/upload", uploadRoutes);

// AI assistant
app.use("/api/v1/ai", aiRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.send('SkillBridge API is running');
});

export default app;
