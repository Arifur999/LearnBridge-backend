import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { prisma } from "./prisma";
import { Role, Status } from "@prisma/client";
import { sendEmail } from "../utils/email";
import { env } from "../config/env";

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret:  env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Store the OAuth state/PKCE inside a single encrypted `oauth_state` cookie
  // instead of a database `verification` row. On Vercel (serverless) + split
  // frontend/backend domains the DB-row lookup was failing on the callback
  // (-> `state_mismatch`). The cookie strategy only needs one cookie to
  // round-trip, which the /api/google-auth relay already forwards.
  account: {
    storeStateStrategy: "cookie",
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  socialProviders: {
    google: {
      enabled:      true,
      clientId:     env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      mapProfileToUser() {
        return {
          role:   Role.STUDENT,
          status: Status.ACTIVE,
        };
      },
    },
  },

  emailVerification: {
    sendOnSignUp:                true,
    sendOnSignIn:                false,
    autoSignInAfterVerification: true,
  },

  user: {
    additionalFields: {
      role: {
        type:         "string",
        required:     true,
        defaultValue: Role.STUDENT,
        input:        true,
      },
      status: {
        type:         "string",
        required:     true,
        defaultValue: Status.ACTIVE,
      },
    },
  },

  plugins: [
    bearer(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      otpLength:  6,
      expiresIn:  5 * 60,

      async sendVerificationOTP({ email, otp, type }) {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return;

        if (type === "email-verification") {
          if (!user.emailVerified) {
            sendEmail({
              to:           email,
              subject:      "Verify your LearnBridge email",
              templateName: "otp",
              templateData: { name: user.name, otp },
            });
          }
        } else if (type === "forget-password") {
          sendEmail({
            to:           email,
            subject:      "LearnBridge — Password Reset OTP",
            templateName: "otp",
            templateData: { name: user.name, otp },
          });
        }
      },
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge:  60 * 60 * 24,
    },
  },

  trustedOrigins: [
    env.BETTER_AUTH_ORIGIN,
    env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5000",
  ],

  advanced: {
    useSecureCookies: isProd,
    // Applies to every auth cookie, including `oauth_state`. In production the
    // OAuth callback comes from Google (cross-site), so cookies must be
    // SameSite=None + Secure to survive the redirect. Locally we fall back to
    // Lax, because browsers reject SameSite=None cookies without Secure on http.
    defaultCookieAttributes: {
      sameSite: isProd ? "none" : "lax",
      secure:   isProd,
      httpOnly: true,
    },
  },
});
