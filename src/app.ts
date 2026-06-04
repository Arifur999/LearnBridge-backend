import express, { Application, Request, Response } from 'express';
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
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
  env.BETTER_AUTH_ORIGIN,
  "http://localhost:3000",
  "http://localhost:5000",
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
app.use("/auth", toNodeHandler(auth));

// Stripe webhook needs raw body — registered before express.json()
app.use("/api/v1/payments", paymentRoutes);

app.use(express.json());
app.use(cookieParser());

const handleGoogleAuth = async (req: Request, res: Response) => {
  // Where the user should ultimately land on the FRONTEND after login.
  const frontendCallback = typeof req.query.callbackURL === "string"
    ? req.query.callbackURL
    : `${env.FRONTEND_URL}/auth/callback`;

  // Use the backend origin to call the auth endpoint at /api/auth
  const base = env.BETTER_AUTH_ORIGIN || `${req.protocol}://${req.get("host")}`;

  // Send Google's redirect back to a BACKEND bridge first. There the session
  // cookie is first-party, so we can read the token reliably and forward it to
  // the frontend in the URL — no cross-site / third-party cookie needed.
  const callbackURL =
    `${base}/api/auth-bridge?to=${encodeURIComponent(frontendCallback)}`;

  try {
    const upstream = await fetch(`${base}/api/auth/sign-in/social`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Origin": base },
      body:    JSON.stringify({ provider: "google", callbackURL }),
    });

    if (!upstream.ok) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=google_failed`);
    }

    // Forward state/pkce cookies — they land as first-party since browser is navigating here
    const h = upstream.headers as typeof upstream.headers & { getSetCookie?(): string[] };
    const cookies: string[] = h.getSetCookie?.() ??
      (upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie")!] : []);
    if (cookies.length) res.setHeader("Set-Cookie", cookies);

    const body = await upstream.json() as { url?: string };
    if (body.url) return res.redirect(body.url);

    return res.status(502).json({ error: "Google OAuth init failed" });
  } catch (err) {
    console.error("Google auth relay error:", err);
    return res.redirect(`${env.FRONTEND_URL}/login?error=server_error`);
  }
};

app.get("/api/google-auth", handleGoogleAuth);
app.get("/google-auth", handleGoogleAuth);

// OAuth bridge: Google redirects here after better-auth sets the session cookie
// (first-party on the backend domain). We read the session server-side and
// forward the token to the frontend callback in the query string, so the
// frontend never depends on a cross-site cookie being readable.
const handleAuthBridge = async (req: Request, res: Response) => {
  const to = typeof req.query.to === "string"
    ? req.query.to
    : `${env.FRONTEND_URL}/auth/callback`;

  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    const token = session?.session?.token;
    if (!token) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=no_session`);
    }

    const url = new URL(to);
    url.searchParams.set("token", token);
    return res.redirect(url.toString());
  } catch (err) {
    console.error("Auth bridge error:", err);
    return res.redirect(`${env.FRONTEND_URL}/login?error=server_error`);
  }
};

app.get("/api/auth-bridge", handleAuthBridge);
app.get("/auth-bridge", handleAuthBridge);

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
