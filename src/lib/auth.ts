import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { prisma } from "./prisma";
import { Role, Status } from "@prisma/client";
import { sendEmail } from "../utils/email";
import { env } from "../config/env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret:  env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

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
    env.BETTER_AUTH_URL,
    env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5000",
    "https://learnbridge-backend.vercel.app",
    "https://learnbridge-frontend-five.vercel.app",
  ],

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookies: {
      sessionToken: {
        attributes: {
          sameSite: "none",
          secure:   process.env.NODE_ENV === "production",
          httpOnly: true,
        },
      },
      state: {
        attributes: {
          sameSite: "none",
          secure:   process.env.NODE_ENV === "production",
          httpOnly: true,
        },
      },
      pkceCodeVerifier: {
        attributes: {
          sameSite: "none",
          secure:   process.env.NODE_ENV === "production",
          httpOnly: true,
        },
      },
    },
  },
});
