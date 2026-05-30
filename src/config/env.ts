import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV:           process.env.NODE_ENV ?? "development",
  PORT:               process.env.PORT ?? "5000",
  DATABASE_URL:       process.env.DATABASE_URL ?? "",
  JWT_SECRET:         process.env.JWT_SECRET ?? "",
  FRONTEND_URL:       process.env.FRONTEND_URL ?? "http://localhost:3000",

  // ── BetterAuth ──────────────────────────────────────────────
  BETTER_AUTH_URL:    process.env.BETTER_AUTH_URL ?? "http://localhost:5000",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",

  // ── Email / SMTP ────────────────────────────────────────────
  EMAIL_SENDER: {
    SMTP_HOST: process.env.SMTP_HOST ?? "smtp.gmail.com",
    SMTP_PORT: process.env.SMTP_PORT ?? "465",
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASS: process.env.SMTP_PASS ?? "",
    SMTP_FROM: process.env.SMTP_FROM ?? "noreply@learnbridge.com",
  },

  // ── Cloudinary ──────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY:    process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",

  // ── Stripe ──────────────────────────────────────────────────
  STRIPE_SECRET_KEY:      process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET:  process.env.STRIPE_WEBHOOK_SECRET ?? "",
};
