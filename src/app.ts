import express, { Application, Request, Response } from 'express';
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { env } from "./config/env";

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

const allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5000",
  "https://learnbridge-frontend-five.vercel.app",
  "https://learnbridge-backend.vercel.app",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow: no origin (server-to-server / curl), "null" (sandboxed/redirect), or known origins
    if (!origin || origin === "null" || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials:    true,
  methods:        ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
}));

// BetterAuth must be mounted before express.json()
app.use("/api/auth", toNodeHandler(auth));

// Stripe webhook needs raw body — registered before express.json()
app.use("/api/v1/payments", paymentRoutes);

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);

app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/admin", adminCourseRoutes);
app.use("/api/v1/admin", adminDashboardRoutes);

// Trainer dashboard must come before /:id dynamic route
app.use("/api/v1/trainer", trainerDashboardRoutes);
app.use("/api/v1/trainer", trainerRoutes);

app.use("/api/v1/student", studentCourseRoutes);
app.use("/api/v1/student", enrollmentRoutes);
app.use("/api/v1/student", studentEnrollmentRoutes);
app.use("/api/v1/student", studentDashboardRoutes);

app.use("/api/v1", courseSearchRoutes);
app.use("/api/v1", bookingRoutes);

app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/tutors", tutorRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/ai", aiRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.send('LearnBridge API is running');
});

export default app;
