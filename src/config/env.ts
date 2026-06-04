import dotenv from "dotenv";
dotenv.config();

const normalizeAuthURL = (value: string) => {
  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/$/, "");
    if (!pathname.endsWith("/api/auth")) {
      url.pathname = `${pathname}/api/auth`;
    }
    return url.toString();
  } catch {
    return value;
  }
};

const betterAuthURL = normalizeAuthURL(process.env.BETTER_AUTH_URL ?? "http://localhost:5000");

export const env = {
  NODE_ENV:           process.env.NODE_ENV ?? "development",
  PORT:               process.env.PORT ?? "5000",
  DATABASE_URL:       process.env.DATABASE_URL ?? "",
  JWT_SECRET:         process.env.JWT_SECRET ?? "",
  FRONTEND_URL:       process.env.FRONTEND_URL ?? "http://localhost:3000",

  BETTER_AUTH_URL:    betterAuthURL,
  BETTER_AUTH_ORIGIN: new URL(betterAuthURL).origin,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",

  GOOGLE_CLIENT_ID:     process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",

  EMAIL_SENDER: {
    SMTP_HOST: process.env.SMTP_HOST ?? "smtp.gmail.com",
    SMTP_PORT: process.env.SMTP_PORT ?? "465",
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASS: process.env.SMTP_PASS ?? "",
    SMTP_FROM: process.env.SMTP_FROM ?? "noreply@learnbridge.com",
  },

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY:    process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",

  STRIPE_SECRET_KEY:     process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
};
