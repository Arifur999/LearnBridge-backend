import "dotenv/config";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

async function seedAdmin() {
  const email    = "admin@skillbridge.com";
  const password = "Admin@123";
  const name     = "Super Admin";

  const exists = await prisma.user.findUnique({ where: { email } });

  if (exists) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  // BetterAuth handles user + account (password) creation
  await auth.api.signUpEmail({
    body: { name, email, password, role: "ADMIN" },
    headers: new Headers(),
  });

  // Ensure role is ADMIN (BetterAuth defaults to STUDENT)
  await prisma.user.update({
    where:  { email },
    data:   { role: "ADMIN" },
  });

  console.log(`Admin created: ${email}`);
}

seedAdmin()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
