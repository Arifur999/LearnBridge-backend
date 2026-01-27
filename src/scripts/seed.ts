import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

console.log("🚀 Seed started");

async function seedAdmin() {
  const email = "arr96777777@gmail.com";

  const exists = await prisma.user.findUnique({
    where: { email },
  });

  if (exists) {
    console.log("⚠️ Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash("SecureP@ssw0rd!", 10);

  await prisma.user.create({
    data: {
      name: "Arif777",
      email,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin created");
}

seedAdmin()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
