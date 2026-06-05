import "dotenv/config";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

const ADMIN_EMAIL    = "admin@skillbridge.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_NAME     = "Super Admin";

async function seedAdmin() {
  const existing = await prisma.user.findUnique({
    where:   { email: ADMIN_EMAIL },
    include: { accounts: true },
  });

  if (existing) {
    // User row exists — make sure role is ADMIN and password account exists
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data:  { role: "ADMIN", emailVerified: true },
    });

    const hasPassword = existing.accounts.some((a) => a.providerId === "credential");

    if (!hasPassword) {
      // Account row missing — re-create via BetterAuth so the hash is correct
      // Delete the stale user first so signUpEmail can re-insert cleanly
      await prisma.user.delete({ where: { email: ADMIN_EMAIL } });
      console.log("Deleted stale user without password account, recreating…");
      await createAdmin();
    } else {
      console.log(`Admin already exists with password account: ${ADMIN_EMAIL}`);
      console.log("Role set to ADMIN, emailVerified set to true.");
    }
    return;
  }

  await createAdmin();
}

async function createAdmin() {
  await auth.api.signUpEmail({
    body: {
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role:     "ADMIN",
    },
    headers: new Headers(),
  }).catch((err: unknown) => {
    // Ignore email-sending failures — the user row is still created
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("email")) throw err;
    console.warn("Warning: email send failed (expected during seed):", msg);
  });

  // Ensure role + emailVerified are set correctly regardless of BetterAuth defaults
  await prisma.user.update({
    where: { email: ADMIN_EMAIL },
    data:  { role: "ADMIN", emailVerified: true },
  });

  console.log(`Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

seedAdmin()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
