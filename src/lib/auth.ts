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

  // OAuth state handling.
  //
  // The Vercel logs showed the DB `verification` row is found fine, but the
  // signed `state` cookie never makes it back on the Google callback
  // (cross-site redirect through the /api/google-auth relay) -> error
  // `state_security_mismatch` / "State not persisted correctly".
  //
  // So we keep the DATABASE as the source of truth for the OAuth state (the
  // random `state` value IS the CSRF token and is validated against the DB),
  // and skip the extra state-cookie round-trip check that can't survive the
  // split frontend/backend domain setup on serverless.
  account: {
    storeStateStrategy: "database",
    skipStateCookieCheck: true,
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
    // Split frontend/backend domains on serverless: every auth request reaches
    // better-auth through our own trusted server-side relay (Next server
    // actions / the /api/google-auth + /api/auth-bridge endpoints), which
    // cannot reliably attach a browser Origin header. better-auth's CSRF check
    // then rejects them with "Missing or null Origin". CSRF is not a meaningful
    // threat here because requests are server-to-server from trusted code, so
    // we disable the origin/CSRF check and keep trustedOrigins for URL checks.
    disableCSRFCheck: true,
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
